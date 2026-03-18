---
slug: 2026-03-20-rugix-apps
title: "Reliable Application Updates for Edge Devices with Rugix Apps"
authors: koehlma
tags: [rugix, ota, embedded linux, edge, docker]
draft: true
---

Today, with the release of Rugix Ctrl 1.1, we are introducing **Rugix Apps**, a new mechanism for deploying and managing application workloads on embedded Linux devices.

Embedded devices typically run diverse application workloads on top of their base system: containerized services, local HMIs, data pipelines, or inference models. These workloads change more frequently than the OS, and different devices in a fleet often need different combinations of them. Managing their lifecycle, versioning, rollback, crash recovery, and persistent state, has traditionally been left as an exercise for the integrator. Rugix Apps makes it a first-class capability of Rugix Ctrl, building upon Rugix's best-in-class [delta update capabilities](/blog/efficient-delta-updates), security properties, and reliability.

Rugix Apps works standalone: you do not need Rugix Bakery, Rugix's state management, or even Rugix system updates to use it. Any Linux device with Rugix Ctrl installed can deploy and manage application workloads.

In this article, we discuss the challenges of deploying and managing application workloads on embedded Linux devices, show how Rugix Apps addresses those challenges, and walk through a concrete example using Docker Compose.

<!-- truncate -->

## The Challenges

As outlined above, different devices in a fleet often need different workloads on top of a shared base system as baking everything into the system image does not scale. But even once you decouple application deployment from system updates, you face a set of challenges that are easy to underestimate.

**Atomicity.** Deploying an application is rarely a single operation. A Docker Compose stack might require loading container images, writing configuration files, and starting multiple services. If the device loses power halfway through, you need a well-defined state to recover from and a mechanism to get there automatically on the next boot. Without that, you end up with a partially deployed application that may not start, may not roll back cleanly, and may require manual intervention on a device that is potentially unreachable.

**Rollback.** When a new version of an application does not work as expected, you need a way to get back to the previous working version. That means keeping the previous version's artifacts on disk, knowing which version was last known to work, and having a reliable way to switch back. Most ad-hoc deployment scripts do not track this.

**Persistent state.** Applications often have state that must survive across updates: databases, caches, credentials, or configuration generated at runtime. The update mechanism needs a clear contract for what persists and what gets replaced.

**Security.** Application workloads are code running on your devices. If they are deployed without cryptographic verification, a compromised update server or a man-in-the-middle attack can push arbitrary code to your fleet. With regulations like the EU [Cyber Resilience Act](/cyber-resilience-act) requiring integrity guarantees for software updates, this applies to application-level updates just as much as to system updates.

**Efficient delivery.** Application updates tend to be frequent and incremental: a single container layer changes, a configuration file is adjusted, a binary is recompiled. Downloading the entire application bundle every time wastes bandwidth, especially for devices on metered or constrained connections. The delivery mechanism should be smart enough to transfer only what actually changed.

These are the same concerns that system-level update engines like Rugix Ctrl have solved for system updates. So far, the usual approach for application workloads is to build custom logic on top of shell scripts or incremental updates, effectively re-implementing application lifecycle management from scratch.

## Introducing Rugix Apps

Rugix Apps extends Rugix Ctrl with first-class application lifecycle management. Multiple independent applications can coexist on the same device, and different devices in a fleet can run different combinations on top of a shared base system. Here is how it addresses the challenges outlined above.

**Atomic deployments with crash recovery.** Each application version is installed as an immutable snapshot. The snapshot is only marked as ready once all of its files have been fully written. If the device loses power during a deployment or a version switch, the interrupted operation is automatically replayed on the next boot. The device always converges to a well-defined state without manual intervention.

**Instant rollback.** After an update, the previous version remains on disk. Rolling back means switching to it, no re-download required. If switching to a new version fails, the previous version is restored automatically. Garbage collection removes older versions to keep disk usage in check.

**Persistent state.** Each application has a dedicated data directory that survives across version updates. Databases, caches, and runtime configuration persist while the application code around them changes.

**Cryptographic verification.** Application bundles are verified using the same signature mechanism as system updates. Rugix Ctrl [requires bundle verification by default](/blog/releases/1.0), so every application deployed to your devices is cryptographically authenticated.

**Efficient delta updates.** Application bundles use the same [bundle format](/docs/ctrl/advanced/update-bundles) as system updates, which means they benefit from Rugix's [highly-efficient delta update capabilities](/blog/efficient-delta-updates). Delta compression and block-level diffing ensure that the device only needs to download what has actually changed.

Application workloads are diverse: Docker Compose stacks, standalone binaries, custom daemons. Rather than prescribing a single model, Rugix Apps is built on a pluggable orchestrator mechanism. Built-in orchestrators cover Docker Compose and single binaries. For anything else, a generic orchestrator lets users provide simple scripts for starting, stopping, and checking the workload. The scripts only handle the workload-specific logic; Rugix Apps takes care of versioning, atomicity, rollback, and crash recovery around them. Orchestrators can plug into the system's service manager for process supervision and boot-time startup, with systemd supported out of the box.

## Example: Docker Compose

Let's walk through a concrete example. We will deploy an [MQTT](https://mqtt.org/) broker with [Eclipse Mosquitto](https://mosquitto.org/) and a [Node-RED](https://nodered.org/) instance for flow-based automation to an edge device using Docker Compose. This is a common pattern for IoT gateways that collect sensor data over MQTT and process it locally.

:::tip
To follow along, download `rugix-bundler` (for your build machine) and `rugix-ctrl` (for the target device) from the [GitHub releases](https://github.com/rugix/rugix/releases).
:::

### Step 1: Write the Compose File

Start with a standard `docker-compose.yml`:

```yaml title="docker-compose.yml"
services:
  mosquitto:
    image: eclipse-mosquitto:2.1.2-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:1883:1883"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - ${RUGIX_APP_DATA_DIR}/mosquitto:/mosquitto/data

  node-red:
    image: nodered/node-red:4.1.7
    restart: unless-stopped
    ports:
      - "127.0.0.1:1880:1880"
    volumes:
      - node-red-data:/data
    depends_on:
      - mosquitto

volumes:
  node-red-data:
```

Note how the Mosquitto volume uses `${RUGIX_APP_DATA_DIR}`, an environment variable that Rugix Apps injects when running the workload. It points to the app's persistent data directory, which survives across version updates, so Mosquitto retains its persisted messages when the application is updated. Node-RED uses a named Docker volume for its data, which is another common option for persistent state.

The Mosquitto configuration goes into a separate file. The full directory looks like this:

```
iot-gateway/
├── docker-compose.yml
└── mosquitto.conf
```

```conf title="mosquitto.conf"
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
```

### Step 2: Pack the App Bundle

Rugix Bundler provides a dedicated command for packaging Docker Compose applications into app bundles:

```shell
rugix-bundler apps pack docker-compose \
    --pull \
    --platform linux/arm64 \
    --app iot-gateway \
    --include mosquitto.conf \
    docker-compose.yml \
    iot-gateway-v1.rugixb
```

This single command:

1. Generates the app manifest with `orchestrator = "docker-compose"`.
2. Pulls the container images referenced in the compose file for the specified platform.
3. Saves the images as a tarball so the bundle is fully self-contained.
4. Packages everything into a [Rugix Bundle](/docs/ctrl/advanced/update-bundles).

The `--pull` flag ensures the images are fetched before saving. The `--platform` flag targets the device architecture. The `--include` flag adds extra files (here, the Mosquitto configuration) to the bundle. If your devices pull images from a container registry at runtime, pass `--no-images` to skip bundling the images and keep the bundle small.

Rugix Bundler will output a bundle hash of the following form:

```
sha512-256:<hex string>
```

### Step 3: Install on the Device

Transfer the bundle to the device and install it:

```shell
rugix-ctrl apps install --bundle-hash <hash> iot-gateway-v1.rugixb
```

This extracts the payloads into a new version, marks it complete, and activates it, which loads the container images with `docker image load` and runs `docker compose up -d`. Mosquitto is now listening on port 1883 and Node-RED is accessible on port 1880.

**What if something goes wrong?** If activation fails (e.g., a container fails to start), and a previous version exists, Rugix Apps automatically rolls back to it. If the device loses power mid-installation, the incomplete version is never marked as ready. On the next boot, crash recovery detects any interrupted transitions and replays them. In either case, the device converges to a working state without manual intervention.

### Step 4: Update

To ship a new version, update the compose file, pack a new bundle, and install it:

```shell
rugix-bundler apps pack docker-compose \
    --pull \
    --platform linux/arm64 \
    --app iot-gateway \
    --include mosquitto.conf \
    docker-compose.yml \
    iot-gateway-v2.rugixb
```

```shell
rugix-ctrl apps install --bundle-hash <hash> iot-gateway-v2.rugixb
```

Rugix Ctrl deactivates the old version (`docker compose down`), loads the new images, and activates the new version (`docker compose up -d`). The previous version remains on disk, so rolling back is a single command:

```shell
rugix-ctrl apps rollback iot-gateway
```

## Conclusion

With Rugix Apps, Rugix Ctrl handles both system updates and application updates. Both use the same bundle format, the same CLI, and the same verification model. You maintain one base system image for your entire fleet and compose the right set of workloads per device, customer, or site. Platform and application teams ship on their own schedules, independently.

The feature is modular: it works with or without Rugix system updates, state management, or Bakery. The pluggable orchestrator mechanism supports Docker Compose, systemd-managed binaries, and arbitrary workloads via shell scripts. And because app bundles build on the same format as system updates, you get [delta updates](/blog/efficient-delta-updates), [cryptographic verification](/docs/ctrl/signed-updates), streaming installation, and compression without any extra effort.

Rugix Apps is available as an experimental feature in Rugix Ctrl. Unlike the core system update mechanism, which has been battle-tested at scale, Rugix Apps is new and its interfaces may still change in future releases. Check out the [documentation](/docs/ctrl/experimental/rugix-apps) for the full reference, including the complete CLI, all orchestrator options, and details on crash recovery and Systemd integration. We welcome feedback and contributions on [GitHub](https://github.com/rugix/rugix), and if you have questions, join our [Discord community](https://discord.gg/cZ8wP9jNsn).

---

At [Silitics](https://silitics.com), we help companies build robust and secure embedded products faster. If you need help deploying application workloads to edge devices or with any other embedded Linux challenge, [we'd love to hear from you](mailto:hello@silitics.com).

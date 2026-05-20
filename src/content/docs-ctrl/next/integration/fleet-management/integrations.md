---
title: Integrations
order: 10
---

Per-provider notes for the fleet management solutions that have ready-made Rugix integrations.

## Nexigon

[Nexigon](https://nexigon.cloud/?utm_source=rugix.org&utm_campaign=rugix-fleet-management) is developed by the creators of Rugix as a commercial complement that funds Rugix's open-source work. It pairs natively with Rugix Ctrl for device connectivity, remote access, and fleet-wide update orchestration, and ships as SaaS (EU/US), managed dedicated, or air-gapped self-hosted.

To onboard a device, follow the [Nexigon quickstart guide for Rugix](https://docs.nexigon.dev/rugix/getting-started?utm_source=rugix.org&utm_campaign=rugix-fleet-management).

## thin-edge.io

[thin-edge.io](https://thin-edge.io/) is an open-source, cloud-agnostic IoT framework for resource-constrained devices that abstracts over backends like [Cumulocity IoT](https://www.cumulocity.com/), [Azure IoT](https://azure.microsoft.com/en-us/solutions/iot), and [AWS IoT](https://aws.amazon.com/iot/). It officially supports Rugix: ready-made recipes for Rugix Bakery wire up the thin-edge.io agent and a Rugix Ctrl integration layer, so updates work out of the box. See the [thin-edge.io Rugix reference repository](https://github.com/thin-edge/tedge-rugpi-image).

## Memfault

[Memfault](https://memfault.com/) is a fleet management solution with a focus on observability. We provide a [template repository showing how to integrate Rugix with Memfault](https://github.com/rugix/rugix-template-memfault); the [corresponding Interrupt article](https://interrupt.memfault.com/blog/robust-ota-updates-the-easy-way) covers it in depth.

## Mender

[Mender](https://mender.io) is a fleet management solution with a tightly-coupled update engine of its own. To integrate Rugix Ctrl with Mender's fleet management, see our [template repository for Rugix with Mender](https://github.com/rugix/rugix-template-mender).

:::note
Mender's fleet management is incompatible with Rugix's dynamic delta updates. This is unlikely to change, as delta updates are a key commercial feature of Mender's own update client.
:::

Mender is often picked because it positions itself as a one-vendor solution. When weighing it as your on-device update engine specifically (separate from its fleet management), several limitations of the open-source distribution are worth knowing about up front:

- **Delta updates are commercial-only.** Mender's Xdelta-based delta updates are reserved for paid tiers; the open-source distribution ships full artifacts on every release. Rugix Ctrl is fully open-source and ships [delta updates](../../updates/delta-updates) (both dynamic block-based with content-defined chunking, and static delta compression) for everyone.
- **No block-wise integrity verification.** Mender verifies the hash over the whole artifact, and the check only completes after the payload has been streamed (and written). Rugix Ctrl verifies every block against a Merkle tree rooted in the [bundle header](../../updates/update-bundles#bundle-integrity) before writing it, so a streaming install never writes data that has not been verified.
- **Updates are not verified by default.** Mender does not enforce signature verification unless explicitly configured. Rugix Ctrl refuses to install a bundle that has neither a valid signature against a configured root certificate nor an explicit `--bundle-hash`; see [Signed Updates](../../updates/signed-updates).
- **A/B only.** Mender's rootfs update mechanism supports symmetric A/B and nothing else: no recovery / asymmetric schemes and no multi-slot configurations. Rugix Ctrl supports both.
- **No `tryboot` support on Raspberry Pi.** Mender's Pi support is gated on U-Boot and tends to lag newer models. Rugix Ctrl supports [`tryboot`](https://www.raspberrypi.com/documentation/computers/config_txt.html#example-update-flow-for-ab-booting), the Pi Foundation's official A/B mechanism, and can update the boot partition itself (including `config.txt` and device tree overlays), which the U-Boot path cannot.
- **C++ rather than a memory-safe language.** Mender's client is written in C++. Rugix Ctrl is written in Rust, eliminating entire classes of memory-safety vulnerabilities at the language level for a component that runs as root and parses untrusted binary input.

For the full picture, see our [comparison of open-source OTA update engines](/blog/2026-02-28-ota-update-engines-compared), which evaluates Mender, RAUC, SWUpdate, OSTree, and Rugix Ctrl side by side.

If you have devices already running Mender's update client and want to switch to Rugix Ctrl, see [Migrating from Mender](../migrating/from-mender).

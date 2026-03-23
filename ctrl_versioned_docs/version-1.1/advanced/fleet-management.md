---
sidebar_position: 1
---

# Fleet Management

Rugix Ctrl provides a reliable foundation for OTA updates and state management.
To manage a fleet of devices remotely and deliver updates to devices, Rugix Ctrl integrates well with a variety of existing off-the-shelf fleet management solutions.

:::info

Rugix Ctrl is independent from any particular fleet management solution, avoiding vendor lock-in.
You can **switch between different fleet management solutions at any time** and continue updating your existing fleet.
To learn more about our approach, see the [Fleet Management](/fleet-management) page.

:::

Currently, there are ready-made integrations with [Nexigon](https://nexigon.cloud/?utm_source=rugix.org&utm_campaign=rugix-fleet-management), [thin-edge.io](https://thin-edge.io/), [Memfault](https://memfault.com/), and [Mender](https://mender.io/).

## Nexigon

Nexigon is a ready-made, modular infrastructure layer for connected devices, designed to seamlessly integrate with your applications and workflows.
Nexigon is developed by the creators of Rugix as a complementary commercial offering to support the ongoing development and maintenance of Rugix as an open-source project.
Nexigon provides a secure, reliable, and scalable foundation you can build upon.
Follow the [Nexigon quickstart guide for Rugix](https://docs.nexigon.dev/rugix/getting-started?utm_source=rugix.org&utm_campaign=rugix-fleet-management) to onboard your device and connect it to Nexigon within minutes.

## thin-edge.io

[thin-edge.io](https://thin-edge.io/) is an open-source, cloud-agnostic IoT framework designed for resource constraint devices.
It provides an abstraction layer to interface with different providers of IoT management solutions such as [Cumulocity IoT](https://www.cumulocity.com/), [Azure IoT](https://azure.microsoft.com/en-us/solutions/iot), and [AWS IoT](https://aws.amazon.com/iot/).
thin-edge.io officially supports Rugix Bakery as well as Rugix Ctrl.
That is, integrating thin-edge.io into your system is straightforward with ready-made recipes for Rugix Bakery.
Those recipes will also include an integration layer for Rugix Ctrl so that you can deploy updates without any further configuration.
To learn more, check out the [thin-edge.io Rugix reference repository](https://github.com/thin-edge/tedge-rugpi-image).

## Memfault

[Memfault](https://memfault.com/) is a fleet management solution with a focus on observability.
We provide a [template repository showcasing how to integrate Rugix with Memfault](https://github.com/rugix/rugix-template-memfault).
Check out the [corresponding Interrupt article for further details](https://interrupt.memfault.com/blog/robust-ota-updates-the-easy-way).

## Mender

[Mender](https://mender.io) is a fleet management solution with their own tightly-coupled update engine.
We provide a [template repository showcasing how to integrate Rugix with Mender](https://github.com/rugix/rugix-template-mender).

:::note
Unfortunately, Mender's fleet management solution is incompatible with dynamic delta updates via Rugix.
This is also unlikely to change as delta updates are a key commercial feature of their own update client.
:::

You can also use Rugix Bakery to build images for use with Mender's own OTA solution using [Mender's conversion approach for Debian](https://docs.mender.io/operating-system-updates-debian-family/convert-a-mender-debian-image).
For Debian-based systems, [Mender's documentation recommends](https://web.archive.org/web/20240815210840/https://docs.mender.io/operating-system-updates-debian-family/convert-a-mender-debian-image#recommended-workflow) that you boot an actual system with an image, make changes, and then extract the image from the running system. We strongly recommend not to use this so called _golden image_ workflow as it is a heavily manual process, making it impossible to reproduce and tedious to apply changes. You always have to manually update and integrate your application, which will lead to much less frequent updates with all the (security) implications that brings.
In contrast, with Rugix Bakery, you get a modern, end-to-end workflow for building Debian images that you can also run in CI.

If you are building on Raspberry Pi, note that Rugix Ctrl supports [Raspberry Pi's `tryboot` mechanism](https://www.raspberrypi.com/documentation/computers/config_txt.html#example-update-flow-for-ab-booting), which is the official way to do A/B updates on a Raspberry Pi.
Mender does not support the `tryboot` mechanism but relies on its U-Boot integration instead.
This means that Mender's support for newer Raspberry Pi models will typically be blocked by U-Boot support and therefore lack behind Rugix's.
Furthermore, with the `tryboot` mechanism you can also update the boot partition, including changes to device tree overlays in `config.txt`, which you cannot do when using U-Boot.
Also, Mender's conversion approach so far does not work for 64-bit Raspberry Pi OS.[^mender-64-bit]
Hence, for Raspberry Pi, we definitely recommend using Rugix Ctrl instead of Mender.

[^mender-64-bit]: At the time of writing. For updates, see [this issue in Mender's issue tracker](https://northerntech.atlassian.net/browse/MEN-5634).

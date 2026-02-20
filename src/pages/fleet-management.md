# Fleet Management

Once your devices are out in the field, you need a way to manage them remotely: deploy software updates, monitor their health, and configure them at scale. _Fleet management solutions_ handle this, typically through a cloud backend and a device-side agent that communicates with it.

Rugix is not a fleet management solution. It provides an open, on-device layer for building and updating embedded Linux systems, designed to be complemented with the fleet management solution of your choice. Rugix handles updates and state management on the device itself, independently of whatever fleet management solution you use to orchestrate deployments. This is a deliberate architectural choice, not an afterthought. You can switch between different fleet management providers at any time and continue updating your existing fleet. No migration headaches, **no vendor lock-in**.

This matters because many fleet management solutions tightly couple their cloud platform with their own on-device update mechanism. Once your devices are deployed with their tooling, switching to a different provider means re-engineering how your devices update, typically requiring a full on-site reflash of your entire fleet. Your requirements may change over time. Providers may change their pricing, their terms, or pivot in ways that don't work for you. With a tightly coupled solution, you have no good options when that happens. **With Rugix, the on-device layer is truly yours.**

## Supported Solutions

Rugix currently integrates with:

- **[Nexigon](https://nexigon.cloud):** A modular infrastructure layer for connected devices, built by the creators of Rugix.
- **[thin-edge.io](https://thin-edge.io/):** An open-source device agent by [Cumulocity IoT](https://cumulocity.com) with official Rugix support.
- **[Memfault](https://memfault.com/):** A fleet management solution with a strong focus on observability.
- **[Mender](https://mender.io/):** A fleet management platform with a tightly-coupled OTA update tool.

You can also use Rugix without any fleet management solution at all, or build your own integration. For technical details on each integration, check out the [fleet management documentation](/docs/ctrl/advanced/fleet-management).

## Rugix and Nexigon

You may have noticed that [Nexigon](https://nexigon.cloud), our own fleet management platform, is listed above. We want to be transparent and honest about that relationship and what it entails.

Rugix is developed by [Silitics](https://silitics.com), a company 100% owned and led by its founder [Maximilian Köhl](https://github.com/koehlma). We help companies build robust connected products, and Rugix and Nexigon grew out of that work. We are not VC-funded and have no investors pushing to maximize revenue at the expense of users. Some of our long-time customers also use Rugix **without** Nexigon for fleet management.

We aim for a clean separation between the open-source project and our commercial cloud infrastructure. Mixing the two creates conflicts of interest that would ultimately hurt both. Rugix is and will remain open-source and permissively licensed. This is not just a promise but an architectural decision. **Rugix contains no Nexigon-specific code.** We will not degrade its functionality to push people toward Nexigon. We want Rugix to grow independently, on its own merit. As an example, [delta updates](/blog/efficient-delta-updates) are a feature we built into Rugix, even though other "open core" vendors reserve them for their paid tiers.

That said, if you are looking for a fleet management solution that is designed from the ground up to work with Rugix and follows the same modular design principles, Nexigon is worth a look. It offers secure remote access to your devices without VPN complexity, OTA update orchestration and telemetry, real-time monitoring, and full audit logging for compliance. There is a [free tier](https://nexigon.cloud) and a [getting started guide](https://docs.nexigon.dev/rugix/getting-started) for using Rugix and Nexigon together for a seamless full-stack solution.

If you want to learn more about how we think about open source, read our [Commitment to Open Source](/open-source-commitment).

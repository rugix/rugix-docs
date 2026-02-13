# Cyber Resilience Act

The _Cyber Resilience Act_ (CRA) introduces mandatory cybersecurity requirements for all products with digital elements sold in the European Union. Reporting obligations take effect in **September 2026**, with full enforcement following in **December 2027**. If you manufacture, import, or distribute connected devices or embedded software in the EU, this applies to you.

## What the CRA Requires

The CRA covers everything from IoT devices and networked appliances to firmware and embedded Linux distributions. At its core, it requires you to:

- Ensure products are **secure by design**.
- Maintain a clear and **up-to-date Software Bill of Materials** (SBOM).
- Provide **timely security updates** throughout the product's lifecycle.
- Establish **processes for vulnerability handling** and incident reporting.

You must not only build secure systems, you must also prove they are secure, traceable, and maintained.

## How Rugix Helps

Together with [EY](https://www.ey.com/) and [Cumulocity](https://www.cumulocity.com/), we have published a [whitepaper on a practical reference architecture for CRA compliance](/blog/cra-whitepaper-with-ey). The whitepaper combines EY's legal expertise, Cumulocity's IoT fleet management, and our embedded engineering experience. Rugix serves as a core component of the reference architecture, providing essential on-device functionality.

Specifically, Rugix covers two critical technical building blocks:

- **Robust Updates with Rugix Ctrl.** Rugix Ctrl provides atomic A/B updates with automatic rollback and cryptographic signature verification. The CRA requires that you can deliver security updates reliably throughout your product's lifecycle.
- **SBOM Generation with Rugix Bakery.** Rugix Bakery builds tailored Linux distributions and automatically generates SBOMs as part of the build process. These machine-readable lists of included components are a core CRA requirement and crucial for vulnerability management.

## From Device to Fleet

Having the right on-device tooling is a necessary foundation, but the CRA also requires you to actually deliver updates to devices in the field and handle vulnerability reporting across your fleet. That means you need fleet management infrastructure on top of Rugix.

Rugix is [designed to work with any fleet management solution](/fleet-management). If you are looking for a complete stack, [Nexigon](https://nexigon.cloud), our fleet management platform, is built from the ground up to work with Rugix. It provides OTA update orchestration, real-time monitoring, and full audit logging for compliance, giving you a seamless path from build to deployment.

## Working with Us

[Silitics](https://silitics.com), the company behind Rugix and Nexigon, offers consulting for companies preparing for CRA compliance. We can help you design secure update strategies, integrate SBOM workflows into your build process, implement vulnerability monitoring, and set up fleet management infrastructure for your specific deployment landscape.

[Get in touch](mailto:hello@silitics.com) if you want to talk about how Rugix, Nexigon, and our engineering expertise can help you get CRA-ready.

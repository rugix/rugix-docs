---
slug: vendor-lock-in-in-embedded-linux
title: Avoiding Vendor Lock-In
authors: koehlma
tags: [rugix, ota, embedded linux]
---

There is a growing trend in the embedded Linux space: vendors are coupling their cloud platforms with their own on-device OTA update mechanisms. On the surface, this makes sense. You get a single vendor, a single integration, a single bill. But if you look a few years ahead, this coupling comes at a cost that is easy to underestimate.

<!-- truncate -->

## The Trend

A decade ago, if you wanted OTA updates for an embedded Linux device, you would likely piece together something yourself or use one of the early open-source tools. The update agent ran on your device, and you figured out the server side on your own.

Today, many of the popular solutions in this space come as full-stack offerings: a cloud platform for fleet management and an on-device update agent that is designed to work with that specific cloud. Some of these update agents are open-source, some are not. But in most cases, the update agent and the cloud are tightly bound together. You are expected to use both.

This is not inherently wrong. For some teams, a turnkey solution may be the fastest way to get devices into the field. But it is worth understanding what you are signing up for.

## Why This Matters

Embedded devices are not phones. You don't replace them every three years. Industrial IoT deployments routinely have lifecycles of 10 to 15 years. Medical devices, automotive systems, and manufacturing equipment can be even longer. The vendor you choose today needs to still work for you in 2035.

A lot can happen in that time. Companies get acquired. Pricing models change. Products get discontinued. In just the last few years, we have seen acquisitions, public cloud services being shut down, and open-source offerings with critical features reserved for commercial tiers. These are not hypothetical risks.

When your on-device OTA update mechanism is tightly coupled to a specific cloud platform, switching providers is not a configuration change. It means re-engineering how your devices update, and for devices already in the field, that typically requires a full on-site reflash of your entire fleet. Depending on where your devices are deployed, that can range from expensive to physically impossible.

This is also a compliance question. The EU [Cyber Resilience Act](/cyber-resilience-act) requires manufacturers to provide security updates throughout a product's lifecycle. If your ability to deliver updates depends on a single vendor, and that vendor disappears or changes terms, you may find yourself unable to meet your legal obligations.

## The Alternative: Decouple the Layers

The on-device update mechanism and the fleet management backend are fundamentally different concerns. The device needs to apply updates reliably, with atomic installs, rollback, and integrity verification. The backend needs to orchestrate rollouts, manage device groups, and provide monitoring. These layers can and should be independent.

This is not a new idea. Projects like [SWUpdate](https://swupdate.org/) and [RAUC](https://rauc.io/) have been doing this for years. Rugix, the project behind this blog, was built with the same philosophy. These tools handle the on-device side and leave the backend choice to you. Pair them with [Eclipse hawkBit](https://eclipse.dev/hawkbit/) or any other backend, and you have a fully open, decoupled stack. The architectural decision to decouple matters more than which specific tool you pick.

## What to Look For

If you are evaluating OTA solutions for a product with a multi-year lifecycle, here are some questions worth asking:

- **Can you use the on-device update agent without the vendor's cloud?** If the answer is no, or only in a limited standalone mode, you are coupling yourself to that vendor for the lifetime of your devices.
- **Can you switch the backend without reflashing your fleet?** This is the real test. If switching providers requires touching every device in the field, you are locked in.
- **Are critical features paywalled?** Some vendors offer open-source update agents but reserve key operational features for paid tiers. That creates similar dependencies.
- **What happens if the vendor gets acquired, changes pricing, or shuts down?** If the on-device layer is tightly coupled to a single proprietary cloud, you are exposed to decisions you have no control over.

## How Rugix Approaches This

Rugix is an open-source, on-device layer for building and updating embedded Linux systems. It handles A/B updates, state management, and delta updates, all independent of any fleet management backend. You can pair it with [Nexigon](https://nexigon.cloud), [thin-edge.io](https://thin-edge.io/), [Memfault](https://memfault.com/), [Mender](https://mender.io/), use it for offline updates, or build your own integration. If you ever want to switch, your devices don't need to change.

We have a dedicated [Fleet Management](/fleet-management) page that goes into the details of our approach, including why we keep a strict separation between the open-source project and our own commercial fleet management platform.

---

**Want to keep your options open?** [Get started with Rugix](/docs/getting-started).

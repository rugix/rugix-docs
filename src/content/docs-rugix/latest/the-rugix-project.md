---
---

# About Rugix

Rugix is an open-source toolkit for building and maintaining robust
Linux-powered products from development to production. Its tools cover:

- **[Rugix Ctrl](/docs/ctrl/)** runs on a device and manages robust system and
  application updates, automatic rollback, and persistent state.
- **[Rugix Bakery](/docs/bakery/)** builds custom, OTA-ready Linux system images
  based on Debian, Alpine Linux, and Raspberry Pi OS.
- **[Rugix Admin](/docs/admin/)** provides a browser-based interface for
  operating individual devices during development, diagnostics, and field
  service.

## Design Priorities

Embedded devices often stay in the field for years. A failed or incompatible
update can make a device unavailable, require an on-site repair, or force a
return to the manufacturer. Uncontrolled persistent state can also cause
configuration drift and make failures difficult to reproduce.

Rugix turns the safeguards needed to address these risks into reusable tools:
atomic updates, automatic rollback, compatibility checks, read-only system
partitions, explicit persistent state, declarative image builds, and VM-based
system testing. The goal is to reduce integration work without weakening the
reliability of the resulting product.

## Scope and Fleet Management

Rugix is not a fleet management platform. Rugix Ctrl manages update and state
transitions on each device, while a fleet management platform can decide when
and where to roll out an update. Rugix Ctrl can be operated locally, integrated
with your own backend, or used with a [supported fleet management
solution](/fleet-management/).

## Stewardship

Rugix is created and maintained by [Silitics](https://silitics.com), an
independent company owned and led by its founder
[Maximilian Köhl](https://github.com/koehlma). Silitics funds Rugix through
engineering services, support, and [Nexigon](https://nexigon.cloud), its
commercial fleet management platform. Read our [Commitment to Open
Source](/open-source-commitment) for the concrete guarantees that keep Rugix
open and independent.

For comparisons with other tools, see:

- [Rugix Ctrl: Comparison to Other Solutions](/blog/2026-02-28-ota-update-engines-compared)
- [Rugix Bakery: Comparison to Other Solutions](/docs/bakery/#comparison-to-other-solutions)

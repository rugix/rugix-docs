---
---

# Rugix Admin

_Rugix Admin_ is the on-device web interface for a system running Rugix Ctrl. It
provides system status and updates, application lifecycle management, component
compatibility reports, and streamed operation logs.

Rugix Admin runs beside `rugix-ctrl` and uses the privileged operation daemon
for authorized changes. The daemon's feature policy determines which lifecycle
actions the interface displays. Rugix Admin does not replace a fleet-management
service or keep long-term operation history.

The service listens on `127.0.0.1:7492` by default. Configure a trusted listen
address before accessing it from another machine.

See the dedicated [Rugix Admin documentation](/docs/admin/) for installation,
security, interface behavior, and HTTP API details.

---
title: Installation Grants
order: 55
---

A bundle signature authenticates software: it proves who built a bundle and that
nobody changed it. It cannot express _who may install it, when, and how_. Anyone who
obtains a signed bundle can install it on any device that trusts the publisher,
including an old version on a device that has already moved on.

An _installation grant_ adds those restrictions. A grant is a small, separately
signed file that authorizes **one specific bundle for one specific device or group,
within a limited time window, with specific installation options**. The bundle stays
untouched, so issuing or renewing a grant leaves its hash, streaming verification,
and [delta delivery](./delta-updates) unaffected.

Grants are opt-in. Devices that do not configure them keep using
[signed updates](./signed-updates) alone.

## When to Use Grants

Use grants when the decision _"this device should run this version now"_ belongs to
someone other than the software publisher, or when it must be auditable:

- A fleet service rolls out a release gradually and must stop a device from
  installing a bundle it was not selected for.
- A device accepts updates over an untrusted channel, where a bundle that is
  genuine but stale, or meant for a different fleet, must be refused.
- A deployment operator should be able to authorize installations without holding
  the publisher's signing key.

A grant is not a replacement for a publisher signature. The two answer different
questions, and a device can require both.

## Configure a Device

Grant policy lives in `/etc/rugix/ctrl.toml`:

```toml
[grants]
namespace = "example-production"
identity-helper = "/usr/lib/rugix/grant-identity"

[[grants.authorities]]
root = "/etc/rugix/grant-root.pem"
permissions = ["apps", "system"]
max-lifetime = 86400
```

With this section present, **every system and app installation requires a grant**.
Caller-supplied bundle hashes, explicit root certificates, compatibility overrides,
and insecure verification options cannot bypass it, and the privileged daemon's
`dangerously-insecure` switch does not override it.

Each `[[grants.authorities]]` entry is one trusted issuer:

- `root` is its trust root in PEM format.
- `permissions` lists what it may authorize: `apps`, `system`, or both. An empty
  list authorizes nothing.
- `max-lifetime` is the longest signed validity window it may use, in seconds,
  defaulting to one day.

Local policy cannot be widened by any certificate, so an authority restricted to
`["apps"]` cannot authorize a system update even if its certificates say otherwise.
Add a second entry with the same permissions to rotate an authority's root.

Rugix rejects a grant policy it could never enforce when the configuration loads, so
an incomplete policy fails immediately instead of at the first installation. Restart
the daemon after changing its configuration.

### Require an Independent Publisher Signature

By default an authenticated grant also satisfies bundle verification, because the
grant signs the bundle hash. To require an independent publisher signature as well,
set the mode and configure publisher roots:

```toml
[signatures]
roots = ["/etc/rugix/publisher-root.pem"]

[grants]
mode = "embedded-and-grant"
namespace = "example-production"
identity-helper = "/usr/lib/rugix/grant-identity"

[[grants.authorities]]
root = "/etc/rugix/grant-root.pem"
permissions = ["apps", "system"]
```

Both signatures are then mandatory, so a deployment authority can only select
software the publisher has approved. Use separate roots for the two, otherwise one
authority satisfies both requirements.

## Supply the Device Identity

A grant names its recipient, so the device has to know who it is. That must never
come from the installation request, so Rugix asks a local executable instead. The
`identity-helper` takes no arguments and prints JSON on standard output:

```json
{"device": "device-001", "groups": ["canary"]}
```

The simplest helper reads a record written during provisioning:

```sh
#!/bin/sh
exec cat /etc/rugix/grant-identity.json
```

A helper can equally derive the identity from hardware or query a trusted service.
It must exit successfully within ten seconds; failure, a timeout, invalid JSON, or
an empty identifier rejects the installation. A service-backed helper must
authenticate its response and apply its own, shorter timeout.

Rugix runs the helper during state initialization, when it admits an installation,
and again before activation. Group membership may change between installations and
even during one, in which case activation is refused. The device identity must keep
matching the provisioned replay state, so changing it requires reprovisioning.

Protect the helper, its inputs, the configuration, and the certificates from
installation callers: the audience check is exactly as strong as the identity the
helper reports.

Groups are exact identifiers inside the configured namespace. A grant addressed to
`{"Group": "canary"}` is accepted only while the helper lists `canary`, and a grant
addressed to `{"Recipient": "device-001"}` matches the device identity regardless of
its groups. Membership never widens what an issuer's certificate permits.

## Initialize Replay State

Rugix remembers which grants it has used, so a grant cannot be replayed. Initialize
that state once during provisioning, as root, after storage and state management are
set up:

```sh
rugix-ctrl initialize-grant-state
```

Initialization refuses to overwrite existing state, and Rugix fails closed when the
state is missing, invalid, or belongs to another identity. It is deliberately
explicit: missing state cannot be told apart from deleted state, so initializing
automatically at boot would let deleting a file make a used grant work again.

State lives on the data partition under `.rugix/grants` when Rugix
[state management](../state-management/) is active, which survives a state-profile
reset, and in `/var/lib/rugix/grants` otherwise. Keep that location on persistent,
protected storage outside the A/B system slots, and migrate it if you change the
storage layout. Wiping the data partition clears authorization history and requires
reprovisioning.

## Issue a Grant

Grants are issued with Rugix Bundler on a trusted signing machine, from the exact
bundle being authorized:

```shell
rugix-bundler grants sign \
  --bundle update.rugixb \
  --id rollout-42-device-001 \
  --namespace example-production \
  --device device-001 \
  --expires-at 1h \
  --target system \
  --boot-group B \
  --reboot set \
  --cert grant-signer.pem \
  --key grant-signer.key \
  update.cms
```

The device then installs the bundle with the grant:

```shell
rugix-ctrl update install --grant update.cms --boot-group B --reboot set update.rugixb
```

Use `--group canary` instead of `--device` to address a provisioned group, and
`--target apps` for `rugix-ctrl apps install --grant app.cms app.rugixb`.

`--expires-at` accepts a duration such as `1h`, `30m`, or `PT1H`, measured from the
issuing time, or an absolute RFC 3339 timestamp. `--not-before` sets the start of the
window and defaults to now. Windows use whole seconds, with an inclusive start and an
exclusive end.

To inspect what a grant actually authorizes, verify it against a trusted copy of the
bundle:

```shell
rugix-bundler grants verify update.cms \
  --root-cert grant-root.pem \
  --namespace example-production \
  --device device-001 \
  --bundle update.rugixb
```

### Choosing Permitted Options

A system grant also decides which installation options the device may use. An option
you leave out permits any value, and an option you set requires exactly that request:

| Issuing option | What the device may do |
| --- | --- |
| _(none)_ | choose any boot group, overlay handling, and reboot behavior |
| `--boot-group B` | install into boot group `B` only |
| `--local-boot-group` | select an inactive boot group locally only |
| `--keep-overlay true` | retain the target's overlay only |
| `--keep-overlay false` | discard the target's overlay only |
| `--reboot set` | pass exactly `--reboot set` |
| `--bundle-default-reboot` | omit `--reboot` and use the bundle's default |

This lets one grant serve a whole group whose members differ, while a
device-specific grant can pin every option. The bundle hash already binds every
payload destination, including app names, so options are the only remaining freedom.

## Prepare a Grant Signing Certificate

Grants use the same CMS and X.509 infrastructure as
[signed updates](./signed-updates), but a grant signer needs a certificate that is
explicitly prepared for it. An ordinary code-signing certificate cannot sign grants,
and a grant signing certificate cannot sign bundles. That separation is enforced by
the certificate profile, so neither key can be misused for the other purpose.

Rugix Bundler writes the extensions your CA has to include:

```shell
umask 077
rugix-bundler grants authority-extensions \
  --namespace example-production \
  --group canary \
  --permission apps \
  signer.ext

openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -nodes -subj "/CN=Canary App Grant Signer" \
  -keyout grant-signer.key -out grant-signer.csr

openssl x509 -req -in grant-signer.csr \
  -CA grant-root.pem -CAkey grant-root.key -CAcreateserial \
  -days 1 -extfile signer.ext -out grant-signer.pem
```

The extensions record two things in the certificate itself: which audiences the key
may address, and which operations it may authorize. Use `--any-audience` for a key
that may address every device in the namespace, or repeat `--device` and `--group` to
enumerate exact audiences. Repeat `--permission` for each operation.

A certificate's validity period bounds when its key can authorize anything, because
Rugix revalidates the whole chain when it admits an installation and again before
activation. Short-lived signing certificates are the simplest way to limit exposure,
and renewed certificates can simply travel with the next grant.

### Delegating to Sub-Authorities

Add `--intermediate DEPTH` to prepare a certificate authority instead of a signer,
where `DEPTH` is how many further authority levels it may create. With
`--intermediate 0`, an authority may issue grant signers but no sub-authorities.

A sub-authority can only narrow what its parent holds: the same or a smaller set of
audiences, the same namespace, and no operation its parent lacks. A certificate that
widens any of these is rejected during verification, even when the grant it signed
would have fit the parent's scope. This is what keeps a compromised deployment key
from authorizing everything: its certificate states its limits, and the device
enforces them.

Sign with the delegated key and ship the intermediate with the grant:

```shell
rugix-bundler grants sign \
  --bundle app.rugixb --id canary-app-42 \
  --namespace example-production --group canary \
  --expires-at 10m --target apps \
  --cert grant-signer.pem --key grant-signer.key \
  --intermediate-cert authority.pem app.cms
```

Verification stays entirely local: a grant carries the certificates it needs, so no
device ever contacts a certificate service.

### Signing with an HSM or External Service

To sign with a key Rugix Bundler cannot access, prepare the exact bytes and sign them
with any CMS signer:

```shell
rugix-bundler grants prepare \
  --bundle update.rugixb --id rollout-42-device-001 \
  --namespace example-production --device device-001 \
  --expires-at 1h --target system --reboot set grant.raw

openssl cms -sign -binary -nodetach \
  -in grant.raw -signer grant-signer.pem -inkey grant-signer.key \
  -outform DER -out update.cms
```

The envelope must include the signed content, and the signing certificate must be
prepared as described above.

## Replay, Expiry, and Recovery

An installation records its grant twice. After preflight and before anything is
written, Rugix records the grant as _admitted_. Before apps are activated or a system
boot is selected, it revalidates everything and records the grant as _consumed_.

That gives the behavior interrupted updates need:

- A transfer that fails halfway can be retried with the same grant while it is still
  valid.
- A consumed grant never authorizes an installation again, even if power is lost
  between consumption and activation.
- Grants are independent. Using one does not invalidate others, and several
  authorities can issue grants for the same device without coordinating.

Rugix keeps one record per grant until that grant expires, so short validity windows
keep the state small. If an issuer creates more unexpired grants than a device
retains, further installations wait until some expire.

Grants and certificates expire, which requires the device to know the current time.
Rugix uses the system clock, bounded below by a watermark it records whenever it
admits an installation. A clock that moves backwards, for example on a device without
a battery-backed clock, therefore cannot bring an expired grant back to life. Your
platform still has to establish trustworthy time: a badly wrong clock rejects valid
grants.

Once activation is authorized, the rest of the update lifecycle is unaffected by
expiry. Boot retries, commit, and automatic rollback may finish later, a deferred
reboot may execute on a later boot, and software that is already running keeps
running. The window limits when an installation may be _authorized_, not how long the
result may live.

An update whose grant expires mid-transfer cannot activate. Its inactive data may
remain on the device and is replaced by the next granted installation. Under grant
policy, manual app activation, app rollback, and `system reboot --spare` are
disabled, including for a system staged with `--reboot no`: to run stored software
again, install its bundle with a new grant.

Short windows are also the practical answer to revocation, which otherwise needs
fresh information on the device. Restoring an old backup of the replay state restores
old authorizations, so protect the privileged installer, the local policy, the clock,
and the replay state as part of the device's security boundary.

## Details and Identifiers

The wire format, the certificate profile, and the permanently assigned object
identifiers are documented in
[Detached Installation Grants](https://github.com/rugix/rugix/blob/main/docs/installation-grants.md)
in the repository, which is the reference for anyone implementing a grant issuer.

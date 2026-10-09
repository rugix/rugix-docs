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

## No Single Point of Compromise

Publishing software, authorizing a rollout, and distributing bundles are three
different jobs. Grants let you separate them so that **compromising any one of them
is not enough to install software on a device**:

| Compromised | What the attacker gains | What still stops them |
| --- | --- | --- |
| Publisher signing key | Can sign a malicious bundle | A device installs nothing without a grant for that exact bundle |
| Grant signing key | Can authorize a bundle for a device | Only bundles the publisher signed, and only ones the attacker can get onto the device |
| Distribution infrastructure | Can deliver any bundle to any device | A device installs nothing without a grant, including publisher-signed bundles |

That holds as long as the three roles use separate keys and systems. Requiring both
signatures is what keeps the publisher independent of the deployment authority, so
configure [an independent publisher signature](#require-an-independent-publisher-signature)
when the two are not the same party.

Grants also narrow what a compromised grant key can do. Each key carries its own
namespace, audiences, and permissions, so a key for canary app rollouts cannot
authorize a system update for production devices. That is described under
[preparing certificates](#prepare-a-grant-signing-certificate).

What grants do not do is undo an installation that was already authorized. They
restrict which requests a device accepts, which is why short validity windows matter.

They also do not govern software that is already on the device. Activating an
installed app generation, rolling one back, and selecting the spare system need no
grant, because that software got onto the device under one, and because Rugix has to
be able to roll back by itself when a trial boot fails. **A grant decides what may be
installed, not which installed version runs.**

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

With this section present, **every system and app installation requires a grant**. A
grant decides how its installation is verified, so it cannot be combined with
`--bundle-hash`, `--root-cert`, the `--insecure-*` options, or
`--skip-compatibility-check`. Pass a grant or pass local overrides, not both.

The boundary this protects is the one between the installer and whoever asks it to
install something, which includes every client of the
[privileged daemon](../reference/privileged-daemon). It is not a defense against an
attacker who already has root on the device: that attacker can rewrite the policy,
the replay state, or the slots directly. For the same reason there is a deliberate
way out for an operator who needs one, described under
[recovering a device](#recovering-a-device).

Each `[[grants.authorities]]` entry is one trusted issuer:

- `root` is its trust root in PEM format.
- `permissions` lists what it may authorize: `apps`, `system`, or both. An empty
  list authorizes nothing.
- `max-lifetime` is the longest signed validity window it may use, in seconds,
  defaulting to one day.

Local policy cannot be widened by any certificate, so an authority restricted to
`["apps"]` cannot authorize a system update even if its certificates say otherwise.
Add a second entry with the same permissions to rotate an authority's root.

A policy that could never authorize an installation is rejected when the
configuration loads, so the mistake surfaces immediately instead of at the next
rollout. Rugix refuses to run an operation when `[grants]` is present and
`grants.authorities` is empty, `namespace` is empty, `identity-helper` is not an
absolute path, an authority has no `root` or a zero `max-lifetime`, or
`mode = "embedded-and-grant"` is set without any `signatures.roots`. Restart the
daemon after changing its configuration.

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

Rugix runs the helper when it admits an installation and again before activation, so
a device that was decommissioned or moved out of a group mid-rollout does not
activate the software. _Activation_ is the step that makes installed software take
effect: switching to the new app generation for an app update, and selecting the
installed boot group for a system update. The device identity must keep matching the
recorded replay state, so changing it requires reprovisioning.

Protect the helper, its inputs, the configuration, and the certificates from
installation callers: the audience check is exactly as strong as the identity the
helper reports.

Groups are exact identifiers inside the configured namespace. A grant addressed to
`{"group": "canary"}` is accepted only while the helper lists `canary`, and a grant
addressed to `{"recipient": "device-001"}` matches the device identity regardless of
its groups. Membership never widens what an issuer's certificate permits.

### Recovering a Device

A device whose grant issuer is unreachable, whose clock is wrong, or whose replay
state is damaged would otherwise have no way to install anything.
`--insecure-skip-grant-verification` installs without a grant:

```shell
rugix-ctrl update install \
  --insecure-skip-grant-verification \
  --bundle-hash "$(rugix-bundler hash update.rugixb)" \
  update.rugixb
```

Skipping the grant returns to the ordinary verification rules, so the bundle still
needs an embedded signature or an explicit `--bundle-hash`, and
`mode = "embedded-and-grant"` still requires the publisher signature. Each check is
skipped only by its own option.

Prefer this over removing `[grants]` from the configuration. It applies to one
command, it names itself in the shell history and in the log, and the policy stays in
force for every other installation. The privileged daemon refuses it, like every
other insecure option, unless it is configured with `dangerously-insecure`.

## Replay State

Rugix remembers which grants it has used so that a grant cannot be replayed. That
state is created on first use, under `.rugix/grants` on the data partition when Rugix
[state management](../state-management/) is active, which survives a state-profile
reset, and under `/var/lib/rugix/grants` otherwise.

The directory is readable only by the privileged installer, and **protecting it is
what protects the history**: anything that can delete the records can equally create
new ones. Keep it on persistent, protected storage outside the A/B system slots, and
migrate it if you change the storage layout. Wiping it lets grants that were already
used work again until they expire.

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
  --cert grant-signer.pem \
  --key grant-signer.key \
  update.cms
```

The device then installs that bundle with the grant, choosing its own installation
options:

```shell
rugix-ctrl update install --grant update.cms update.rugixb
```

Use `--group canary` instead of `--device` to address a provisioned group, and
`--target apps` for `rugix-ctrl apps install --grant app.cms app.rugixb`.

`--expires-at` accepts a duration such as `1h`, `30m`, or `PT1H`, measured from the
issuing time, or an absolute RFC 3339 timestamp. `--not-before` sets the start of the
window and defaults to now. Windows use whole seconds, with an inclusive start and an
exclusive end.

A signing machine does not need the bundle itself. Given a hash from a trusted
source, `--bundle-hash` issues the same grant without transferring gigabytes:

```shell
rugix-bundler grants sign \
  --bundle-hash "$(rugix-bundler hash update.rugixb)" \
  --id rollout-42-device-001 \
  --namespace example-production --device device-001 \
  --expires-at 1h --target system \
  --cert grant-signer.pem --key grant-signer.key update.cms
```

### Constraining Installation Options

By default a grant authorizes the installation and leaves the installation options to
the device, which is usually what you want: an installation script picks the boot
group and decides how to reboot, including `--reboot no` to
[finish the update itself](#finishing-an-update-later).

When a rollout has to pin an option, state it at issuance. An option you set then
requires exactly that request, and an option you leave out permits any value:

| Issuing option | What the device may do |
| --- | --- |
| _(none)_ | choose any boot group, overlay handling, and reboot behavior |
| `--boot-group B` | install into boot group `B` only |
| `--local-boot-group` | select an inactive boot group locally only |
| `--keep-overlay true` | retain the target's overlay only |
| `--keep-overlay false` | discard the target's overlay only |
| `--reboot set` | pass exactly `--reboot set` |
| `--bundle-default-reboot` | omit `--reboot` and use the bundle's default |

The bundle hash already binds every payload destination, including app names, so
options are the only remaining freedom. Pinning them suits a grant aimed at one
device; leaving them open lets one group grant serve a fleet whose members differ.

### Inspecting a Grant

To see what a grant actually authorizes, verify it against a trusted bundle or hash:

```shell
rugix-bundler grants verify update.cms \
  --root-cert grant-root.pem \
  --namespace example-production \
  --device device-001 \
  --bundle-hash "$(rugix-bundler hash update.rugixb)"
```

The command prints the authenticated grant as JSON, which is the only view of a grant
that is safe to act on. It applies no device policy and does not look at replay state,
so a grant it accepts can still be refused by a device whose local `permissions` are
narrower, or which has already used that grant.

Verification requires the grant and its certificates to be valid at the time it
checks, which defaults to now. Use `--at` with an RFC 3339 timestamp to inspect a
grant whose window has not started yet or has already passed.

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
  --bundle-hash "$(rugix-bundler hash update.rugixb)" \
  --id rollout-42-device-001 \
  --namespace example-production --device device-001 \
  --expires-at 1h --target system grant.raw

openssl cms -sign -binary -nodetach \
  -in grant.raw -signer grant-signer.pem -inkey grant-signer.key \
  -outform DER -out update.cms
```

The envelope must include the signed content, and the signing certificate must be
prepared as described above.

## Replay, Expiry, and Recovery

An installation records its grant twice. After preflight and before anything is
written, Rugix records the grant as _admitted_. Before activation, it revalidates
everything and records the grant as _consumed_.

That gives the behavior interrupted updates need:

- A transfer that fails halfway can be retried with the same grant while it is still
  valid.
- A consumed grant never authorizes an installation again.
- Grants are independent. Using one does not invalidate others, and several
  authorities can issue grants for the same device without coordinating.

Consumption happens just before activation rather than after it, so an activation
that fails afterwards leaves no usable grant behind. For an app update that means a
failed activation rolls back and the retry needs a new grant; the alternative would
let one authorization drive activation attempts repeatedly. Transfers, which are the
part that actually fails often, retry freely because they happen before consumption.

A device keeps one record per grant until that grant expires, up to 1024 records. A
record is kept rather than discarded because discarding it would make that grant
usable again, so an issuer that creates more than 1024 unexpired grants for one
device has to wait for some to expire before that device accepts another. Short
validity windows keep the number small: with one-hour windows the limit is 1024
grants per hour for a single device.

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

### Finishing an Update Later

An installation script often wants to finish an update itself, for example to emit
telemetry before the device reboots. Install with `--reboot no` to stage the system
without selecting it, then select it whenever you are ready:

```shell
rugix-ctrl update install --grant update.cms --reboot no update.rugixb
# ... report success, flush telemetry, wait for a maintenance window ...
rugix-ctrl system reboot --spare
```

There is no deadline between the two commands, and the second one needs no grant of
its own: the grant authorized installing that system.

An update whose grant expires mid-transfer cannot activate. Its inactive data may
remain on the device and is replaced by the next granted installation.

Short windows are also the practical answer to revocation, which otherwise needs
fresh information on the device. Restoring an old backup of the replay state restores
old authorizations, so protect the privileged installer, the local policy, the clock,
and the replay state as part of the device's security boundary.

## Details and Identifiers

The wire format, the certificate profile, and the permanently assigned object
identifiers are documented in
[Detached Installation Grants](https://github.com/rugix/rugix/blob/main/docs/installation-grants.md)
in the repository, which is the reference for anyone implementing a grant issuer.

---
---

# Signing with an HSM or KMS

The core verified-boot compositions sign boot artifacts and update bundles with
private key files by default. To keep private keys in a hardware security module
(HSM) or a cloud key management service (KMS), replace the signers through
[rule parameters](/docs/bakery/next/build-rules#rule-parameters). The rest of the
pipeline, including image composition and signature verification, stays
unchanged.

This guide uses the EFI composition
[`core/image-debian-efi-verified`](/docs/bakery/next/reference/core/rules/image-debian-efi-verified)
and signs through PKCS#11, a standard interface that most HSMs and several cloud
KMS offerings implement with a vendor-supplied module.

## Signers and Their Interfaces

The EFI compositions declare two signers:

| Rule Parameter  | Default         | Inputs                   | Parameter      | Output      |
| --------------- | --------------- | ------------------------ | -------------- | ----------- |
| `efi-signer`    | `core/sign-efi` | `image`, `certificate`   | `signing-time` | `image`     |
| `bundle-signer` | `core/sign-cms` | `content`, `certificate` | `signing-time` | `signature` |

`efi-signer` signs systemd-boot and the Unified Kernel Image (UKI) and returns
the signed PE executable. `bundle-signer` signs the update bundle's metadata and
returns a DER-encoded CMS signature that encapsulates the content and includes
the signer certificate. `certificate` is the `boot-certificate` or
`bundle-certificate` input of the composition. `signing-time` contains Unix
seconds as a string; an empty value means the build's `SOURCE_DATE_EPOCH`.

The Raspberry Pi compositions declare `rpi-signer` instead of `efi-signer`. It
receives the boot `image` and the `public-key` and returns a `signature`.

Rugix Bakery verifies each signer's result before using it. It attaches each EFI
signature to the unsigned executable that the composition built and verifies it
against `boot-certificate`. It verifies the bundle signature with Rugix Ctrl's
CMS checks against `bundle-certificate` and checks that the signature covers the
bundle's metadata. A signer
that uses the wrong key, signs a different EFI executable, or signs different
bundle metadata fails the build.

## Define the Signers

A signer is an ordinary [command rule](/docs/bakery/next/build-rules#define-a-command-rule)
that declares the signer interface plus whatever it needs to reach its key. The
following signers run in a [tooling environment](/docs/bakery/next/envs) with
OpenSSL's PKCS#11 engine and your HSM vendor's PKCS#11 module:

```dockerfile title="envs/pkcs11/Dockerfile"
FROM docker.io/library/debian:bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        faketime jq libengine-pkcs11-openssl openssl osslsigncode \
    && rm -rf /var/lib/apt/lists/*
# Install your vendor's PKCS#11 module, for example:
# COPY libvendor-pkcs11.so /usr/lib/pkcs11/libvendor-pkcs11.so
```

The EFI signer declares the interface of `efi-signer`, a `key-uri` parameter
identifying its key, and a `pin` secret:

```toml title="rules/pkcs11-sign-efi/rule.toml"
description = "Sign an EFI executable with a PKCS#11 key."
secrets = ["pin"]

[inputs.image]
kind = "file"

[inputs.certificate]
kind = "file"

[parameters.signing-time]

[parameters.key-uri]
description = "PKCS#11 URI of the private key, without PIN."

[parameters.module]
default = "/usr/lib/pkcs11/libvendor-pkcs11.so"

[execution]
type = "run"
env = "pkcs11"
command = ["sh", "/run/rugix/bakery/work/rule/sign.sh"]

[execution.outputs.image]
kind = "file"
path = "signed.efi"
```

```shell title="rules/pkcs11-sign-efi/sign.sh"
#!/bin/sh
set -eu
work=/run/rugix/bakery/work
parameter() { jq -r --arg name "$1" '.[$name]' "$work/parameters.json"; }
time="$(parameter signing-time)"
osslsigncode sign \
    -pkcs11module "$(parameter module)" \
    -key "$(parameter key-uri);pin-value=$(cat "$work/secrets/pin")" \
    -certs "$work/inputs/certificate" \
    -h sha256 \
    -time "${time:-$SOURCE_DATE_EPOCH}" \
    -in "$work/inputs/image" \
    -out "$work/outputs/signed.efi"
```

The bundle signer declares the interface of `bundle-signer` with the same
additional parameters and secret. Its script signs with `openssl cms`. Rugix
Ctrl 1.4 and earlier reject the RSA signatures that `openssl cms` creates with
PKCS#11 keys, while Rugix Bakery and later Rugix Ctrl versions accept them. For
devices on these versions, use an ECDSA P-256 key. For a P-384 key, replace
`-md sha256` with `-md sha384`. Issue the key's certificate directly from the
update root that devices trust, like any bundle signer certificate.

```toml title="rules/pkcs11-sign-cms/rule.toml"
description = "Create a CMS signature with a PKCS#11 key."
secrets = ["pin"]

[inputs.content]
kind = "file"

[inputs.certificate]
kind = "file"

[parameters.signing-time]

[parameters.key-uri]
description = "PKCS#11 URI of the private key, without PIN."

[parameters.module]
default = "/usr/lib/pkcs11/libvendor-pkcs11.so"

[execution]
type = "run"
env = "pkcs11"
command = ["sh", "/run/rugix/bakery/work/rule/sign.sh"]

[execution.outputs.signature]
kind = "file"
path = "signature.der"
```

```shell title="rules/pkcs11-sign-cms/sign.sh"
#!/bin/sh
set -eu
work=/run/rugix/bakery/work
parameter() { jq -r --arg name "$1" '.[$name]' "$work/parameters.json"; }
time="$(parameter signing-time)"
export PKCS11_MODULE_PATH="$(parameter module)"
# `openssl cms` records the current time; faketime makes it the signing time.
faketime "@${time:-$SOURCE_DATE_EPOCH}" openssl cms -sign \
    -binary -nodetach -nosmimecap -outform DER -md sha256 \
    -engine pkcs11 -keyform engine \
    -signer "$work/inputs/certificate" \
    -inkey "$(parameter key-uri);pin-value=$(cat "$work/secrets/pin")" \
    -in "$work/inputs/content" \
    -out "$work/outputs/signature.der"
```

Modules that need configuration files or service credentials receive them the
same way: declare an input for each file and a secret for each credential, and
point the module at them in the script. For example, a cloud KMS module
typically reads a configuration file and the service account credentials from
paths given in environment variables.

## Bind the Signers

Bind both signers in the system's release invocation. The certificates remain
inputs of the composition, so Rugix Bakery verifies the signatures against them:

```toml title="rugix-bakery.toml"
[systems.efi.rules.release]
uses = "core/image-debian-efi-verified"
parameters.architecture = "amd64"
inputs.boot-certificate = { path = "keys/boot.crt" }
inputs.bundle-certificate = { path = "keys/bundle.crt" }

[systems.efi.rules.release.rules.efi-signer]
uses = "pkcs11-sign-efi"
parameters.key-uri = "pkcs11:token=release;object=boot;type=private"
secrets.pin = { path = "keys/hsm.pin" }

[systems.efi.rules.release.rules.bundle-signer]
uses = "pkcs11-sign-cms"
parameters.key-uri = "pkcs11:token=release;object=bundle;type=private"
secrets.pin = { path = "keys/hsm.pin" }

[systems.efi.outputs]
"system.img" = { rule = { node = "release", output = "image" } }
"system.rugixb" = { rule = { node = "release", output = "bundle" } }
"system.rugixb-hash" = { rule = { node = "release", output = "bundle-hash" } }
```

Build the system as usual with `./run-bakery bake system efi`. Rugix Bakery
checks the bindings against the signer interfaces while planning, before it
builds the environment. The private keys never enter the build; only the PIN
does, as a [secret](/docs/bakery/next/build-rules#bind-secrets).

RSA PKCS#1 v1.5 signatures are deterministic. With the same key, inputs,
signing time, and `osslsigncode` version, the PKCS#11 EFI signer produces the
same signed executables as `core/sign-efi`, which uses `osslsigncode` from
Debian bookworm. Rugix Bakery caches signer outputs like other command outputs.
Changing a signer, its bindings, or the PIN invalidates the cached signatures.
Artifacts that contain them rebuild when the signatures change.

The Rugix Bakery system tests include a
[complete example](https://github.com/rugix/rugix-bakery/tree/main/tests/rules)
that signs through SoftHSM, a software implementation of PKCS#11, and boots
the result with Secure Boot.

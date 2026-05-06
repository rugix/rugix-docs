---
title: Signed Updates
order: 4
---

# Signed Updates

When updates are installed from untrusted sources, such as user-provided update bundles, it is important to verify that updates are genuine and have not been tampered with.
To this end, Rugix Ctrl supports _embedded signatures_ in update bundles.

Embedded signatures are based on the widely-adopted [_Cryptographic Message Syntax_ (CMS) standard](https://datatracker.ietf.org/doc/html/rfc5652), which supports certificate-based signature verification.
This allows existing CA infrastructure to be reused for signing and verifying update bundles.
Updates can also be signed using the PKCS#11 interface, which allows for secure key storage in _Hardware Security Modules_ (HSMs).

## Verification Is Mandatory

Rugix Ctrl **requires every bundle to be verified before installation** — either by a valid embedded signature against a configured root certificate or by an explicit bundle hash passed via `--bundle-hash`. If neither is provided, the installation is refused.

This applies uniformly to [system updates](./system-updates/) and [application updates](./application-updates/): the same bundle format means the same verification rules.

The hash-based path is useful when you control the distribution channel end-to-end (e.g., a known bundle pushed by your own backend). For untrusted channels — user uploads, public mirrors, third-party fleet managers — you want signed bundles.

## What Gets Signed

A signature covers the bundle's _header_, which itself contains hashes of every payload. Together with the [Merkle-tree integrity model](./reference/update-bundles#bundle-manifest) of the bundle format, verifying the signature once at the start lets Rugix Ctrl trust each block as it is read during streaming installation. Nothing untrusted ever lands on disk.

## Signing in Practice

Two common workflows:

- **Direct signing** with `rugix-bundler signatures sign` if your signer key is a regular file on the build machine.
- **External signing** when the key lives in an HSM or a hardened CI signing service. `rugix-bundler` exports a raw signed-metadata file that any CMS-capable tool (`openssl cms`, PKCS#11 wrappers, etc.) can sign, after which the signature is added back to the bundle.

For the full CLI, certificate setup, and PKCS#11/HSM details, see the [Signed Updates reference](./reference/signed-updates).

:::warning[Danger]
**To skip bundle verification entirely (not recommended for production), use the `--insecure-skip-bundle-verification` flag.**
:::

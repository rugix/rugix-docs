---
slug: emudhra-ca-key-compromise
title: "eMudhra CA Key Compromise: Guidance for Embedded Linux Devices"
description: "How the compromised eMudhra intermediate CA keys affect Rugix Ctrl and the trust stores in your device images, and what to update."
authors: koehlma
date: 2026-10-21
tags: [rugix, security, tls, embedded linux]
---

The private keys of eight intermediate certificate authorities (CAs) operated by eMudhra have been compromised. Six of them issue TLS certificates. Anyone can now use their keys to issue certificates for any domain, and clients that trust these intermediates accept them. This affects Rugix Ctrl before version 1.3.1 as well as the trust stores of system images, container images, and applications.

In short:

- Upgrade Rugix Ctrl to 1.3.1 on your devices.
- Update the trust stores in your system images and container images.
- Update applications that ship their own trust stores.

<!-- truncate -->

## The Issue

The private keys of the affected intermediates are [integers smaller than 256](https://bugzilla.mozilla.org/show_bug.cgi?id=2083449), so anyone can recover them from the public certificates. The [incident page](https://emudhra.we-have-a-problem.com/) lists the affected certificates and tracks fixes across projects.

An attacker who can intercept a device's network traffic can use these keys to impersonate any HTTPS server, for example an update server, and read or modify the traffic.

The intermediates chain to two roots: `emSign ECC Root CA - G3` and, through a cross-signature, `Comodo AAA Services root`. Browsers blocked the intermediates within hours to days through their own revocation mechanisms. Most embedded devices have no comparable mechanism. They trust whatever trust stores their image contains until the image is updated.

## Rugix Ctrl

Rugix Ctrl uses a trust store compiled into its binary for HTTPS downloads, for example, when installing an update bundle from a URL. Updating the system trust store does not change it. Rugix Ctrl 0.8.0-rc.1 through 1.3.0 trust the compromised intermediates. Rugix Ctrl 1.3.1 removes the `emSign ECC Root CA - G3` root and rejects certificate chains that contain any of the compromised keys, including chains through the cross-signature. See the [security advisory](https://github.com/rugix/rugix/security/advisories/GHSA-637r-qx4c-jm45) for details.

[Bundle verification](/docs/ctrl/updates/signed-updates) limits the impact. Rugix Ctrl 1.x verifies every bundle against a signature or a bundle hash unless you pass `--insecure-skip-bundle-verification`. As long as the trusted certificates or the bundle hash reach the device through a channel the attacker does not control, an attacker cannot get a modified bundle installed. They can still read and block the download. Rugix Ctrl 0.8.x does not require verification. Without signatures or bundle hashes, an attacker can get a modified bundle installed.

To upgrade Rugix Ctrl, rebuild your image:

- **Rugix Bakery:** The `core/rugix-ctrl` recipe installs the latest Rugix Ctrl 1.x release by default. If you set its `version` parameter to a specific release, change it to `v1.3.1`.
- **Yocto:** Update `meta-rugix` to a revision with the `rugix-ctrl_1.3.1.bb` recipe. If you pin `PREFERRED_VERSION_rugix-ctrl`, set it to `1.3.1`.
- **Other build systems:** Use the binaries or Debian packages from the [GitHub release](https://github.com/rugix/rugix/releases/tag/v1.3.1).

Then roll out the new image to your devices. Devices download it with their current Rugix Ctrl version, so make sure they verify it. On 0.8.x, pass a bundle hash obtained through a trusted channel with `--verify-bundle`, and follow the [upgrade guide](/docs/upgrading-from-v0.8).

Rugix Ctrl 1.3.1 rejects server certificates issued under `emSign ECC Root CA - G3`. If one of your HTTPS endpoints, for example your update server, uses such a certificate, replace it before rolling out the upgrade. Otherwise, upgraded devices can no longer download from it.

Going forward, Rugix Ctrl releases will use the system trust store instead of a compiled-in one. Updating the `ca-certificates` package in your image will then fix issues like this one without a new Rugix Ctrl release.

## Other Trust Stores in Your Images

A device image usually contains more than one trust store.

### System Trust Store

Most software on Linux uses the system trust store from the `ca-certificates` package, for example curl and other OpenSSL-based programs.

For Debian-based images, rebuild the image with the updated `ca-certificates` package. If you build with Rugix Bakery and pin a [Debian snapshot](/docs/bakery/layers), move to a snapshot that contains the update.

For Yocto, the `ca-certificates` recipe in OpenEmbedded-Core does not include a fix at the time of writing. Until it does, distrust the roots with a bbappend in your own layer:

```bitbake title="recipes-support/ca-certificates/ca-certificates_%.bbappend"
do_install:append() {
    sed -i \
        -e 's|^mozilla/emSign_ECC_Root_CA_-_G3.crt|!&|' \
        -e 's|^mozilla/Comodo_AAA_Services_root.crt|!&|' \
        ${D}${sysconfdir}/ca-certificates.conf
}
```

The `!` prefix makes `update-ca-certificates` exclude the certificate when it generates the trust store during the image build.

Current `ca-certificates` releases no longer trust `Comodo AAA Services root` for TLS, so the second line only affects older releases. There, distrusting this root can also break legitimate Sectigo certificate chains that lead to it. Test your HTTPS endpoints before rolling out the image.

### Container Images

Every container image carries its own trust store, usually from the `ca-certificates` package of its base image. Rebuild your container images on updated base images and redeploy them. [Rugix Apps](/docs/ctrl/application-management) using Docker Compose bundle container images by default, so build and install new app bundles. If your devices pull images from a registry instead, update the images there. Images referenced by a fixed tag only change when you move to a tag that includes the update.

### Applications with Built-In Trust Stores

Some applications ignore the system trust store and ship their own, as Rugix Ctrl does. Update their dependencies and rebuild them, for example:

- Rust programs using `webpki-roots` and `rustls-webpki`, fixed in 1.0.10 and 0.103.16, respectively.
- Python programs using `certifi`, fixed in 2026.10.19.
- Node.js, which bundles its root certificates. A fix is pending at the time of writing.

Go programs use the system trust store on Linux. Go 1.27.3 and 1.26.10 additionally reject the compromised intermediates, so rebuild Go programs with one of these versions.

## Verifying a Device

The incident page provides test endpoints that serve certificates from the compromised intermediates. For a spot check, run:

```sh
curl https://dv-g3b-emudhra.we-have-a-problem.com/
curl https://dv-g3b-aaa-emudhra.we-have-a-problem.com/
```

On a device that no longer trusts the intermediates, both requests fail with a certificate error. curl only checks the system trust store, so check applications with built-in trust stores separately.

---

[Nexigon](https://nexigon.cloud), the fleet management platform built by the Rugix team, can roll out updated images to your devices. If you need help, [get in touch](mailto:hello@silitics.com).

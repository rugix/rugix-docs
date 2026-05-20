---
title: Signed Updates
order: 50
---

When updates are installed from untrusted sources, such as user-provided update bundles, it is important to verify that updates are genuine and have not been tampered with.
To this end, Rugix Ctrl supports _embedded signatures_ in update bundles.

Embedded signatures are based on the widely-adopted [_Cryptographic Message Syntax_ (CMS) standard](https://datatracker.ietf.org/doc/html/rfc5652), which supports certificate-based signature verification.
This allows existing CA infrastructure to be reused for signing and verifying update bundles.
Updates can also be signed using the PKCS#11 interface, which allows for secure key storage in _Hardware Security Modules_ (HSMs).

## Verification Is Mandatory

Rugix Ctrl **requires every bundle to be verified before installation**, either by a valid embedded signature against a configured root certificate or by an explicit bundle hash passed via `--bundle-hash`. If neither is provided, the installation is refused.

This applies uniformly to [system updates](./system-updates/), [incremental updates](./incremental-updates), and [application updates](../application-management/): the same bundle format means the same verification rules.

The hash-based path is useful when you control the distribution channel end-to-end (e.g., a known bundle pushed by your own backend). For untrusted channels (user uploads, public mirrors, third-party fleet managers), you want signed bundles.

## What Gets Signed

A signature covers the bundle's _header_, which itself contains hashes of every payload. Together with the [hash-tree integrity model](./update-bundles#bundle-integrity) of the bundle format, verifying the signature once at the start lets Rugix Ctrl trust each block as it is read during streaming installation. Nothing untrusted ever lands on disk.

## Signing Bundles

To sign a bundle, you need a certificate and a private key.
You can then use the following command to sign a bundle:

```shell
rugix-bundler signatures sign BUNDLE CERT KEY OUT
```

Additional intermediate certificates can be included using the `--intermediate-cert` option.

### Creating a Self-Signed CA

If you do not have a certificate and private key, follow the steps below to create a simple self-signed CA:

1. Generate a root certificate and private key:
   ```shell
   openssl ecparam -name prime256v1 -genkey -noout -out root.key
   openssl req -x509 -new -key root.key -out root.crt -days 3650 -subj "/CN=Update CA"
   ```
2. Generate a short-lived certificate and private key for signing update bundles:
   ```shell
   openssl ecparam -name prime256v1 -genkey -noout -out signer.key
   openssl req -new -key signer.key -out signer.csr -subj "/CN=Update Signer"
   openssl x509 -req -in signer.csr \
       -CA root.crt -CAkey root.key -CAcreateserial \
       -out signer.crt -days 365 \
       -extfile <(printf "basicConstraints=CA:FALSE\nkeyUsage=digitalSignature")
   ```

The root certificate is valid for 10 years and should be deployed to the devices for verifying updates.
The signer certificate is valid for one year and should be used for signing bundles.
**Private keys must be kept secret!**

## External Signing

Instead of signing a bundle directly through `rugix-bundler`, you can also create a raw _signed metadata_ file and sign it through some external means.
To generate a signed metadata file, use the following command:

```shell
rugix-bundler signatures prepare BUNDLE signed-metadata.raw
```

This creates a file `signed-metadata.raw`, which can then be signed externally, for instance, using `openssl cms`:

```shell
openssl cms -sign \
  -in signed-metadata.raw \
  -signer signer.crt -inkey signer.key \
  -out signed-metadata.cms -outform DER \
  -nosmimecap -nodetach -binary
```

The resulting CMS signature file must be in DER format and must include the signed content.

The externally created CMS signature file can then be added to a bundle using the following command:

```shell
rugix-bundler signatures add BUNDLE signed-metadata.cms OUT
```

This allows any external tool to be used to create a CMS signature for a bundle and then add it to the bundle.
In particular, this allows PKCS#11-compatible HSMs to be used for signing through `openssl cms`.

:::warning
**While currently not enforced, Rugix Ctrl only supports CMS signatures with a single signer.**
:::

## Verifying Bundles

To verify that a bundle has been signed by a root of trust, use:

```shell
rugix-bundler signatures verify BUNDLE CERT OUT
```

The certificate does not need to be the certificate used for signing; it can be any certificate serving as a root of trust for which a certificate chain can be established using the certificates embedded in the CMS signature.

## Configuring Signature Verification on Devices

For Rugix Ctrl to verify a bundle's embedded signature, the device must trust the signer's root certificate. Configure the trusted root certificates in `/etc/rugix/ctrl.toml`:

```toml title="/etc/rugix/ctrl.toml"
[signatures]
roots = ["/etc/rugix/root.crt"]
```

With this configuration, Rugix Ctrl will automatically verify bundle signatures against the specified root certificate when installing updates.
The root certificate can also be specified on the command line with `--root-cert CERT`, which overrides the configured default.

---
title: Signed Updates Reference
order: 30
---

# Signed Updates Reference

Operational details for [signed updates](../signed-updates) — signing CLI, certificate setup, external/HSM signing, and verification configuration.

## Signing Bundles

To sign a bundle, you need a certificate and a private key.
You can then use the following command to sign a bundle:

```shell
rugix-bundler signatures sign <BUNDLE> <CERT> <KEY> <OUT>
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
rugix-bundler signatures prepare <BUNDLE> signed-metadata.raw
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
rugix-bundler signatures add <BUNDLE> signed-metadata.cms <OUT>
```

This allows any external tool to be used to create a CMS signature for a bundle and then add it to the bundle.
In particular, this allows PKCS#11-compatible HSMs to be used for signing through `openssl cms`.

:::warning
**While currently not enforced, Rugix Ctrl only supports CMS signatures with a single signer.**
:::

## Verifying Bundles

To verify that a bundle has been signed by a root of trust, use:

```shell
rugix-bundler signatures verify <BUNDLE> <CERT> <OUT>
```

The certificate does not need to be the certificate used for signing — it can be any certificate serving as a root of trust for which a certificate chain can be established using the certificates embedded in the CMS signature.

## Configuring Signature Verification on Devices

Bundle verification is **mandatory by default**.
When installing an update, Rugix Ctrl requires either a valid signature or a bundle hash (via `--bundle-hash`).
If neither can be established, the installation will be refused.

To configure a root certificate for signature verification, create a configuration file at `/etc/rugix/ctrl.toml`:

```toml title="/etc/rugix/ctrl.toml"
[signatures]
roots = ["/etc/rugix/root.crt"]
```

With this configuration, Rugix Ctrl will automatically verify bundle signatures against the specified root certificate when installing updates.
The root certificate can also be specified on the command line with `--root-cert <CERT>`, which overrides the configured default.

:::warning[Danger]
**To skip bundle verification entirely (not recommended for production), use the `--insecure-skip-bundle-verification` flag.**
:::

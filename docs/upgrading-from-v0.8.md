---
sidebar_position: 45
---

# Upgrading from v0.8

This guide covers upgrading from Rugix v0.8 to Rugix Ctrl 1.0 and Rugix Bakery 0.9.

Starting with this release, Rugix Ctrl and Rugix Bakery are versioned independently.

:::info

Looking for the [v0.7 to v0.8 upgrade guide](/docs/0.8.14/upgrading-from-v0.7)?

:::

## Rugix Ctrl 1.0

We removed support for installing raw images. Going forward, you will have to install updates from [Update Bundles](/docs/ctrl/advanced/update-bundles).

Update bundle verification is now mandatory. This means, when you install an update with Rugix Ctrl, you either need to provide a bundle hash directly or the update [has to be signed](/docs/ctrl/signed-updates). If your distribution workflow doesn't implement signed updates yet and you have no way to communicate the bundle hash to the installer either, you can skip the verification with `--insecure-skip-bundle-verification`. **For production, we highly recommend implementing a proper workflow with signed bundles.**

## Rugix Bakery 0.9

To upgrade to Rugix Bakery 0.9, run the following:

```shell
curl -sfSO https://raw.githubusercontent.com/rugix/rugix-bakery/v0.9/container/run-bakery && chmod +x ./run-bakery
```

This will download the new `run-bakery` script.

Rugix Bakery now uses rootless Podman by default to build images and update bundles (if available).

The `rugix_admin` option of the `core/rugix-ctrl` recipe has been removed. You can now install Rugix Admin via the [`rugix-extra` repository](https://github.com/rugix/rugix-extra).

Rugix Bakery used to install the version of Rugix Ctrl bundled with the Rugix Bakery container image. Going forward, Rugix Bakery will now download and install Rugix Ctrl directly from GitHub releases (using Debian packages for Debian). This allows us to independently release new Rugix Ctrl versions without releasing new versions of Rugix Bakery. You don't have to do anything for this to take effect. If you want to pin your build to a specific version of Rugix Ctrl, you can use the `version` parameter of the `core/rugix-ctrl` recipe.

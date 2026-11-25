---
slug: raspberry-pi-secure-boot
title: "How to Set Up Secure Boot on Raspberry Pi 4 and 5"
description: "Secure boot for Raspberry Pi 4, CM4, Pi 5, and CM5: signed boot images, a dm-verity root filesystem, OTP provisioning, and A/B updates."
authors: koehlma
date: 2026-11-25
tags: [secure boot, raspberry pi, verified boot, dm-verity, ota, embedded linux]
---

A Raspberry Pi on your desk is easy to change: take out the SD card, edit a few files, and put it back. Once the Pi ships inside a product, anyone with physical access can do the same, for example, to tamper with the device's behavior or to install malicious software. Secure boot prevents this by ensuring that the device runs only software you have authorized.

Raspberry Pi 4 and 5, as well as Compute Module 4 and 5, support secure boot, but a complete setup takes more than enabling a hardware feature. It needs a system built as an image instead of an off-the-shelf Raspberry Pi OS installation, a signed boot image, a verified root filesystem, updates that keep working on locked-down devices, and a provisioning step that enables secure boot on each device.

This article explains how these pieces work, why each one is needed, and how they fit together.

<!-- truncate -->

:::tip
If you want a ready-made solution, [Rugix Bakery](/docs/bakery) builds Debian images with everything described here for Raspberry Pi 4, CM4, Pi 5, and CM5. Skip to [Secure Boot with Rugix](#secure-boot-with-rugix) to get started.
:::

## How Secure Boot Works on Raspberry Pi

Let's start by having a look at how secure boot generally works on Raspberry Pi.

Raspberry Pi 4 and newer boards boot in a sequence of stages: the boot ROM in the processor starts a bootloader from an EEPROM on the board, the bootloader loads the Linux kernel from storage, such as an SD card, and the kernel mounts the root filesystem and starts the init process. With secure boot, these stages must form a _chain of trust_ where each stage verifies the next before running it. The chain itself is then anchored in the one-time programmable (OTP) memory of the Pi, in which you write a hash of the public key of an RSA key pair specifically created for securing your product. The boot chain then proceeds as follows:

1. The boot ROM loads the bootloader and verifies it against your own public key and/or an official key of Raspberry Pi (depending on the model).
2. The bootloader loads a _signed boot image_ that contains the kernel and the files needed to start it. It verifies the boot image against your own public key, which must match the hash stored in OTP memory.
3. The signed boot image carries a fingerprint, the _root hash_, of the root filesystem and the kernel uses it to check every block of the root filesystem as it reads it.

Every stage in the chain ensures that the following stage is authenticated. As the key hash in OTP memory cannot be changed by an attacker, even with physical access, you can trust that the software running on the device has not been manipulated.

In the rest of this article, we build this chain from its end. We start with the verified root filesystem, because the signed boot image must carry its root hash, then build the signed boot image, and assemble both into a disk image that boots on a Raspberry Pi. We then enable secure boot on the device, look at how to keep a device that is locked down this way updatable, and close with topics that build on secure boot.

## The Verified Root Filesystem

The root filesystem holds the operating system and your application. An attacker who can change it can replace a program, add a service, or change a configuration file, so it needs protection just as much as the boot files.

To detect such changes, we use _dm-verity_, a Linux kernel feature that protects a filesystem image with a hash tree. At build time, you compute the hash of each data block of the image, then hashes over groups of those hashes, and so on up to a single hash at the top, the root hash, which covers the whole image. At runtime, the kernel checks each block against the tree when it reads the block and returns an I/O error if the block does not match. Because the kernel checks blocks on demand, it does not need to read the whole image at boot.

dm-verity has a far-reaching consequence: the root filesystem becomes read-only, because any write would break the hash tree. On a typical Raspberry Pi OS system, you install and update packages directly on the device. With dm-verity, you instead build the complete root filesystem on a build host as a single image and write it to the device unchanged. **This is why secure boot requires an image-based system.** Raspberry Pi's own [secure boot guide](https://pip-assets.raspberrypi.com/categories/1260-security/documents/RP-003466-WP/Boot-Security-Howto) describes secure boot as intended for purpose-built OS images and not for Raspberry Pi OS.

Building such an image starts with the root filesystem itself: a directory tree with the complete operating system and your application. There are various ways to create one. Build tools such as [Rugix Bakery](/docs/bakery) or the [Yocto Project](https://www.yoctoproject.org/) produce it from a declarative description, and [`debootstrap`](https://wiki.debian.org/Debootstrap) creates a minimal Debian system that you can extend. For experiments, you can also copy the root partition of an existing [Raspberry Pi OS](https://www.raspberrypi.com/software/) installation from its SD card. We do not recommend this for production, because such a system is hard to reproduce and contains whatever someone installed or changed on it by hand.

Once you have the root filesystem in a directory, here `rootfs/`, you turn it into an image. Since the root filesystem is read-only anyway, we recommend a filesystem designed for read-only use, such as SquashFS. Create the SquashFS image and append the hash tree with `veritysetup` from cryptsetup:

```sh
mksquashfs rootfs/ system.img -noappend -no-compression
DATA_BLOCKS=$(( $(stat -c %s system.img) / 4096 ))
SALT=$(sha256sum system.img | cut -d ' ' -f 1)
veritysetup format --no-superblock --salt="$SALT" \
    --data-blocks="$DATA_BLOCKS" --hash-offset=$((DATA_BLOCKS * 4096)) \
    --root-hash-file=root.hash \
    system.img system.img
```

`root.hash` now contains the root hash. Deriving the salt from the image instead of a random source makes builds reproducible. By default, `veritysetup` would also store the salt and the data size in a superblock on the disk, where nothing protects them. With `--no-superblock`, these parameters travel with the root hash in the signed boot image instead.

## The Signed Boot Image

On its own, dm-verity does not stop an attacker, who can modify the image and simply recompute the tree. The root hash must therefore come from a source that the attacker cannot change. **The crucial step is to put the root hash into a signed boot image.**

Without secure boot, the bootloader reads the kernel, device trees, and configuration as individual files from a FAT boot partition, so anyone who can write to that partition can change what the device boots. With secure boot enabled, the bootloader instead expects these files packed into a single FAT filesystem image, `boot.img`, with its signature next to it in `boot.sig`. Packing everything into one image lets a single signature cover all boot files, including the kernel command line. Only if the signature is valid does the bootloader load `boot.img` into memory and boot from it as if it were the boot partition.

`boot.img` contains what is otherwise on the boot partition, which Raspberry Pi OS mounts at `/boot/firmware`: the kernel, an initramfs, device trees, firmware files, `config.txt`, and `cmdline.txt`. To build it, collect these files in a directory, here `boot/`.

The kernel command line in `cmdline.txt` connects the boot image to the root filesystem. Replace it with a command line that carries the root hash and the parameters from the previous step, as a single line:

```sh
echo "root=/dev/mapper/root ro panic=10 verity.root-hash=$(cat root.hash) verity.salt=$SALT verity.data-blocks=$DATA_BLOCKS" > boot/cmdline.txt
```

On the device, the initramfs, a small early userspace in `boot.img` that prepares the root filesystem, puts these arguments to use. It reads the `verity.*` arguments and opens the root partition as a verified device, which the kernel then mounts as `/dev/mapper/root`, as the `root=` argument specifies. To find the root partition, the initramfs needs a stable name for it. We give the partition the name `system` in the partition table, so the initramfs can find it at `/dev/disk/by-partlabel/system`. The core of this step is a single command, in which `$root_hash`, `$salt`, and `$data_blocks` hold the values of the `verity.*` arguments. The partition appears twice because it holds both the data and the hash tree:

```sh
veritysetup open --no-superblock --salt="$salt" \
    --data-blocks="$data_blocks" --hash-offset=$((data_blocks * 4096)) \
    /dev/disk/by-partlabel/system root \
    /dev/disk/by-partlabel/system "$root_hash"
```

If verification fails, the initramfs stops the boot. By default, Debian's initramfs-tools then opens a root shell, so an attacker who corrupts the root partition would get a shell inside your signed boot image. `panic=10` on the command line makes the device reboot instead.

Your initramfs must therefore include `veritysetup` and a script that runs this command before the root filesystem is mounted. The [initramfs script](https://github.com/rugix/rugix-bakery/blob/v0.9.6/container/repositories/core/recipes/debian-verified-root/files/verity-root) used by Rugix's secure boot template is a complete example for Debian's initramfs-tools. Besides the command above, it validates the arguments, waits for the root partition to appear, and selects the right partition for A/B updates, which we cover below.

With the command line in place, pack the directory into a FAT image, here with 64 MiB of space:

```sh
mkfs.vfat -C boot.img 65536
mcopy -s -i boot.img boot/* ::
```

Then create your key pair, which must be a 2048-bit RSA key pair, and sign the image with Raspberry Pi's [`rpi-eeprom-digest`](https://github.com/raspberrypi/rpi-eeprom/blob/master/rpi-eeprom-digest) tool. Never put the private key on the device, because anyone who has it can sign images that your devices accept:

```sh
openssl genrsa -out boot.key 2048
openssl rsa -in boot.key -pubout -out boot.pub
rpi-eeprom-digest -i boot.img -o boot.sig -k boot.key
```

With the signature, the two images are tied together: a modified root filesystem no longer matches the root hash, and a modified root hash invalidates the signature of `boot.img`.

## Assembling a Bootable Disk Image

You now have the two images: `system.img` with its hash tree and the signed `boot.img`. To boot them on a Raspberry Pi, put them on separate partitions of a disk image: a FAT boot partition with `boot.img` and `boot.sig`, and a root partition with `system.img`. The root partition must carry the name `system` that the initramfs looks for. Partition names are a feature of GPT partition tables, so the disk image uses GPT.

The boot partition also needs a small `config.txt`, separate from the one inside `boot.img`, that tells the bootloader to load `boot.img`:

```ini
[all]
boot_ramdisk=1
```

Without secure boot, `boot_ramdisk=1` makes the bootloader boot `boot.img` without checking its signature. This lets you test the image before you enable secure boot. Once secure boot is enabled, the file can no longer weaken anything: the bootloader always loads `boot.img`, checks `boot.sig`, and takes all settings from the `config.txt` inside the signed image.

With this `config.txt` in the current directory, the following commands create a boot partition with 256 MiB of space and assemble the disk image:

```sh
mkfs.vfat -C boot-part.img 262144
mcopy -i boot-part.img boot.img boot.sig config.txt ::

SYSTEM_MIB=$(( ($(stat -c %s system.img) + 1048575) / 1048576 ))
truncate -s $(( SYSTEM_MIB + 258 ))M disk.img
sfdisk disk.img <<EOF
label: gpt
start=1MiB, size=256MiB, type=uefi, name=boot
start=257MiB, size=${SYSTEM_MIB}MiB, type=linux, name=system
EOF
dd if=boot-part.img of=disk.img bs=1M seek=1 conv=notrunc
dd if=system.img of=disk.img bs=1M seek=257 conv=notrunc
```

Write `disk.img` to an SD card or another boot medium, for example, with Raspberry Pi Imager or `dd`, and the Pi boots the system from it, with dm-verity checking every block of the root filesystem it reads.

## Enabling Secure Boot on a Device

The disk image boots, but the device does not check any signatures yet. Until you enable secure boot, the bootloader boots `boot.img` through the `boot_ramdisk=1` path without checking `boot.sig`. Enabling secure boot, called _provisioning_, writes the hash of your public key into OTP and thereby anchors the chain. From then on, the bootloader accepts only your key, and the boot ROM runs only signed bootloaders that enforce it. On Pi 5 and CM5, the bootloader also needs your counter-signature, so you control which bootloader versions run.

:::warning
Programming OTP cannot be undone. The device trusts your key, and only your key, for the rest of its life. If you lose the private key, you can no longer update the device. If the key leaks, anyone can sign images that your devices accept. Keep it in a hardware security module (HSM) or another protected location.
:::

Provisioning uses the tools in Raspberry Pi's [`usbboot`](https://github.com/raspberrypi/usbboot) repository. You start the device in RPIBOOT mode, in which the boot ROM accepts files over USB, and the `rpiboot` tool sends it a bootloader that programs the device. Because the change is permanent, provisioning proceeds in three stages:

1. **Test.** Boot your disk image and confirm that the system works. On Pi 4 and CM4, you can also flash a bootloader with `SIGNED_BOOT=1` that enforces signatures without touching OTP and that you can still replace. Pi 5 and CM5 cannot run such a bootloader before the key is in OTP, so verify the signature on the build host with `rpi-eeprom-digest -v` instead.
2. **Lock.** Setting `program_pubkey=1` in the provisioning configuration writes your key hash into OTP. Setting `program_jtag_lock=1` also disables the JTAG debug interface of the VideoCore, the processor's GPU, for good.
3. **Verify.** Change a byte in `boot.img` and confirm that the bootloader rejects it. Then change a block of the root filesystem and confirm that reading it fails with an I/O error.

The READMEs of the [Pi 4/CM4](https://github.com/raspberrypi/usbboot/tree/master/secure-boot-recovery) and [Pi 5/CM5](https://github.com/raspberrypi/usbboot/tree/master/secure-boot-recovery5) provisioning directories describe the exact commands, including how each board enters RPIBOOT mode. For production lines, Raspberry Pi's [Secure Boot Provisioner](https://www.raspberrypi.com/documentation/security/secure-boot-provisioner.html) automates these steps.

## Updating a Locked-Down Device

The device now runs only software you have signed, but it still needs updates over its lifetime, for example, to fix security vulnerabilities. For devices in the field, _A/B updates_ are the established way to do this, with or without secure boot. They install a complete new version of the system next to the running one and switch over only once the new version works. This makes updates atomic: a power loss during the update or a release that does not boot leaves the device on its previous, working version. It also means that every device runs exactly the system you built and tested, instead of one assembled package by package in the field.

With secure boot, A/B updates go from best practice to necessity. The root filesystem is read-only, so you cannot update packages in place anyway, and an update must replace the boot image and the root filesystem image together, because the root hash ties them to each other. Overwriting the only copy of the system, as in the disk image from above, leaves no fallback. Unlike an unlocked Pi, a device with secure boot also cannot be rescued by flashing an arbitrary recovery image, because the bootloader accepts only images signed with your key, so a failed update typically means a service visit.

To update safely, the device keeps two copies of the system, A and B. An update goes to the inactive copy, while the running copy stays untouched as a fallback. On Raspberry Pi, the firmware's `tryboot` mechanism lets the device boot the other copy once on trial and works with secure boot. Each copy gets its own boot partition and root partition, and a small configuration partition selects between them:

| #   | Name       | Contents                                  |
| --- | ---------- | ----------------------------------------- |
| 1   | `config`   | FAT; `autoboot.txt`                       |
| 2   | `boot-a`   | FAT; `boot.img`, `boot.sig`, `config.txt` |
| 3   | `boot-b`   | Same as `boot-a`, for system B            |
| 4   | `system-a` | SquashFS root filesystem with hash tree   |
| 5   | `system-b` | Same as `system-a`, for system B          |
| 6   | `data`     | Writable partition for persistent state   |

`autoboot.txt` names the default boot partition and the alternative for a trial boot:

```ini
[all]
tryboot_a_b=1
boot_partition=2
[tryboot]
boot_partition=3
```

Assume system A is running and an update is installed as system B:

1. The update engine, the software that installs updates on the device, writes `boot.img`, `boot.sig`, and the root filesystem image to B's partitions while A keeps running.
2. It sets the `tryboot` flag, which applies to the next boot only, and reboots.
3. The bootloader applies the `[tryboot]` section and loads `boot.img` from partition 3. With `tryboot_a_b=1`, it uses the regular file names there instead of `tryboot.txt` and `tryboot.img`. It verifies the signature as on every boot.
4. The initramfs verifies B's root filesystem against the root hash in B's boot image.
5. If B works, the update engine commits it by swapping the partition numbers in `autoboot.txt`.
6. If B fails before the commit, the next reboot no longer has the `tryboot` flag, and the bootloader boots A again.

For more details see our article [How Robust OTA Updates Work on Raspberry Pi](/blog/raspberry-pi-ota-updates).

One detail needs care. The same signed boot image should work in either copy, so the initramfs can no longer use a fixed partition name such as `system`. Instead, it asks the firmware which partition it booted from, through `/proc/device-tree/chosen/bootloader/partition`, and opens `system-a` for partition 2 and `system-b` for partition 3. This choice at runtime does not weaken verification, because the root hash still binds each boot image to exactly one root filesystem.

`autoboot.txt` itself is not signed, because the device must be able to change it. **This is safe because the file only chooses between signed boot images.** It does, however, let an attacker boot the previous release, which we come back to [below](#beyond-secure-boot).

The bootloader in the EEPROM is not part of the A/B scheme, and updating it works as before, with one difference: after provisioning, every bootloader you install must be signed with your key. This includes bootloader updates with security fixes from Raspberry Pi, which you therefore need to sign before shipping them.

## Beyond Secure Boot

Secure boot ensures that a device runs only software you have signed. A secure product needs more than that, and two topics build directly on the setup in this article.

**Protecting persistent data.** Logs, configuration, and application state live on a separate writable partition, which secure boot does not cover. To keep the data secret when someone removes the storage, encrypt the partition with LUKS, using a device-unique secret that you program into OTP with Raspberry Pi's `rpi-otp-private-key` tool as the key. Encryption does not detect modifications, so your software should still treat the data as untrusted input. If you use [Rugix Ctrl](/docs/ctrl), our open-source update tool, its [custom data partition driver](/docs/ctrl/state-management#custom-driver) can run your scripts to set up such an encrypted partition.

**Preventing rollbacks.** An older release keeps its valid signature, along with its known vulnerabilities, and an attacker with access to the storage can boot it, for example, by editing `autoboot.txt` after an update. Preventing this requires a version check against a counter that cannot be reset, for example, in the customer-programmable OTP rows, whose bits can be set but never cleared. An attacker can always boot a release without such a check, so it must ship with your first release.

## Secure Boot with Rugix

As you have seen, a complete setup consists of pieces that depend on each other: the root hash goes into the kernel command line, the command line into the signed boot image, and both images into every release and update. Building and keeping all of them consistent by hand for every release is error-prone. [Rugix Bakery](/docs/bakery), our open-source build tool for embedded Linux, does this for Debian on Raspberry Pi 4, CM4, Pi 5, and CM5 since version 0.9.6. In a new directory with the [`run-bakery` launcher](/docs/bakery):

```sh
./run-bakery init rpi-debian-secure
./prepare.sh
./run-bakery bake system pi --release-version v1
```

`prepare.sh` generates development keys, and the build writes a disk image, `build/pi/system.img`, and a signed update bundle, `build/pi/system.rugixb`. The disk image initially contains one copy of the system. On first boot, Rugix Ctrl, the update tool on the device, creates the second copy and the data partition in the remaining space, so one disk image fits devices with different storage sizes.

The template uses two keys: the boot key from this article, which signs `boot.img`, and a separate key with a certificate, which signs update bundles so that Rugix Ctrl can check them before installing an update. In the template's `rugix-bakery.toml`, a single build rule, a reusable build step that Rugix Bakery provides, builds the release and binds both keys:

```toml
[systems.pi.rules.release]
uses = "core/image-debian-rpi-verified"
inputs.boot-public-key = { path = "keys/boot.pub" }
inputs.bundle-certificate = { path = "keys/bundle.crt" }
rules.rpi-signer.secrets.key = { path = "keys/boot.key" }
rules.bundle-signer.secrets.key = { path = "keys/bundle.key" }
```

Rugix Bakery makes signature verification part of the build: it checks every signature against the configured public key or certificate and fails the build if verification fails, instead of producing images that devices reject. The default signers read private keys from files. To keep the keys in an HSM or a key management service instead, replace the signers with your own rules, as described in [Signing with an HSM or KMS](/docs/bakery/advanced/hsm-signing).

Rugix Ctrl also installs signed update bundles with `tryboot`, as described above, and returns to the previous copy if the new system fails before you commit it. The [`rpi-debian-secure` template](https://github.com/rugix/rugix-bakery/tree/v0.9.6/container/templates/rpi-debian-secure) README covers provisioning, building updates, and replacing the development keys.

---

At [Silitics](https://silitics.com), we help companies build robust and secure embedded Linux products, from secure boot bring-up to OTA integration. We also build [Nexigon](https://nexigon.dev), which adds fleet-wide update rollouts, device monitoring, and remote access on top of Rugix. If you are working on a Raspberry Pi-based product, [get in touch](mailto:hello@silitics.com).

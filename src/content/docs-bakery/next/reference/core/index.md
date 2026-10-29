---
title: Core Reference
description: Reusable rules, recipes, and base layers supplied with Rugix Bakery.
---

The `core` repository supplies building blocks for filesystem construction,
boot artifacts, disk assembly, and updates. Choose the kind of building block
that matches the work:

- [Rules](./rules/) transform files and directories into artifacts, such as
  filesystem images, signed boot executables, or update bundles.
- [Recipes](./recipes/) install and configure software in a layer's root filesystem.
- [Layers](./layers/) supply base filesystems that a project can extend.

A layer can use recipes to prepare its filesystem, then a rule composition can
turn that filesystem into a device-specific image and update bundle. Partition
roles, signing policy, and release layouts belong to those compositions.

Each reference page lists the definition's interface and its documented behavior.
The pages are [generated from repository catalogs](/docs/bakery/next/definition-catalogs/).

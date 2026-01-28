---
slug: new-github-organization
title: Rugix GitHub Organization
authors: koehlma
tags: [rugix, migration]
---

As part of our ongoing commitment to Rugix as an independent open-source project, we moved it to its own GitHub organization.
The repository has moved from `silitics/rugix` to `rugix/rugix`, and the Docker images have moved accordingly.

<!-- truncate -->

## Updating Your Setup

If you are using Rugix Bakery, please update your `run-bakery` script:

```bash
curl -sfSO https://raw.githubusercontent.com/rugix/rugix/v0.8/bakery/run-bakery && chmod +x ./run-bakery
```

This will fetch the latest version of the script and update the Docker image references.

If you have any questions or run into issues, please open an issue on [GitHub](https://github.com/rugix/rugix).

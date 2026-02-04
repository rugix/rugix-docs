---
slug: yocto-ci-with-nixos
title: GitHub CI for Yocto Builds with NixOS
authors: koehlma
tags: [rugix, yocto, nixos, ci]
---

You know you're in a very special niche when you write blog posts with both "NixOS" and "Yocto" in the title.
But, here we go. If you're still reading, you're probably one of the few people who will actually appreciate this.
Welcome. 👋

At Silitics, we maintain [meta-rugix](https://github.com/rugix/meta-rugix), the Yocto layers for integrating Rugix Ctrl into Yocto-based systems.
As the layers mature and gain more users, we need CI to catch issues before they ship.
The problem: even our Debian-based [Rugix Bakery](/docs/bakery/) builds are slow and hit disk limits on hosted runners, and Yocto is worse.
We're talking hours of build time and 50+ GB of disk space.
We kept putting it off, but we just set up self-hosted GitHub runners on NixOS, and it wasn't as painful as we feared.

In this article, we'll walk through how we set up our CI infrastructure: declarative runner configuration, shared build caches, rootless Podman, and secrets management with SOPS.
If you're struggling with Yocto CI, this might save you some headaches.

<!-- truncate -->

## Why Self-Hosted Runners?

GitHub's hosted runners are great for most projects, but they fall short for Yocto builds:

1. **Build times.** A clean Yocto build can take hours. GitHub-hosted runners have a 6-hour timeout and charge by the minute.
2. **Disk space.** Yocto builds easily exceed 50 GB. Hosted runners typically offer 14 GB.
3. **Caching.** Yocto's `sstate-cache` is the key to fast incremental builds. GitHub's cache has a 10 GB limit and adds network overhead to upload and download.

Self-hosted runners solve all three problems.
You control the hardware, the storage, and you can have a shared local cache.

## Why NixOS?

We could have set up runners on any Linux distribution.
We chose NixOS because we run all our infrastructure in a **stateless, declarative way**.
Every server is defined entirely in code, versioned in Git, and can be reproduced exactly.

What does this mean in practice?
If a server fails, we simply provision a fresh one and we're back up in minutes.
No digging through documentation, no configuration drift, no "I think we installed something on that box once" archaeology.

Our server builds are **100% reproducible**.
The same configuration that runs in production can be tested locally in a VM.
And if a deployment goes wrong, we have **instant rollback**: just boot into the previous generation.

If you're an embedded engineer, this should sound familiar.
These are exactly the properties you want in your devices: reproducible builds, atomic updates, rollback on failure.
It's what Yocto and Rugix provide for embedded Linux, and it's what NixOS provides for our infrastructure.
**The same principles that make embedded systems reliable make infrastructure reliable.**

NixOS also has excellent support for GitHub runners via the `services.github-runners` module.
We build on top of that with our own configuration.

## Runner Configuration

Here's a simplified version of our runner configuration:

```nix
services.github-runners.yocto = {
  enable = true;
  url = "https://github.com/rugix";
  tokenFile = config.sops.secrets."github-runner-yocto.token".path;

  user = "github-runner-yocto";
  group = "github-runner-yocto";

  name = "yocto-runner";
  extraLabels = [ "nixos" "yocto" ];

  # Use persistent storage instead of /run tmpfs. This is required for Yocto
  # builds which can take up a lot of space in the working directory.
  workDir = "/var/lib/github-runner-yocto/work";

  ephemeral = true;
  replace = true;

  extraPackages = with pkgs; [
    kas
    podman
    gawk
    coreutils
    findutils
    gnugrep
    gnused
  ];

  extraEnvironment = {
    KAS_CONTAINER_ENGINE = "podman";
    # Yocto cache directories shared across all runners.
    SSTATE_DIR = "/var/cache/yocto/sstate";
    DL_DIR = "/var/cache/yocto/downloads";
    # Required for rootless podman.
    XDG_RUNTIME_DIR = "/run/user/2000";
  };
};
```

### Secrets with SOPS

Runners need to authenticate with GitHub to register themselves.
To this end, we use Personal Access Tokens (PATs) scoped to a GitHub organization.
That way, we can use the same runner across an organization making it not only useful for `meta-rugix` but also our other repositories that profit from more powerful runners.

Fine-grained PATs can be created through your personal GitHub settings under _Developer Settings_.
To use self-hosted runners with a PAT, you need to grant the _Self-hosted runners_ permission with _read-write_ access.
As PATs allow the registration of runners which then have access to repository and organization secrets, they must be treated with the same care as any credentials.
In particular, they must not be stored in a Git repository as plain text.
To have version control nonetheless, we use [SOPS](https://github.com/getsops/sops) to encrypt secrets in YAML files that can be safely stored alongside our infrastructure code.

Here is an example:

```yaml title="github-runners.yaml"
runner_token: github_pat_SUPER_SECRET_TOKEN
```

Encrypted with SOPS, it then looks something like this:

```yaml title="github-runners.yaml.encrypted"
runner_token: ENCRYPTED_SUPER_SECRET_TOKEN
sops: ...
```

The beauty of SOPS is that you can specify multiple keys that can decrypt secrets and even key sharding (requiring multiple keys to decrypt secrets). That way, you can implement sophisticated access control patterns to make sure that your secrets are kept safe, but this is a topic for another blog post. For our infrastructure, we configured SOPS such that the secrets required by a server are encrypted with a server-specific key. That way, each server can only decrypt the specific secrets that it needs to operate.

For a proper integration into NixOS, we use [`sops-nix`](https://github.com/Mic92/sops-nix) and configure it to use the private SSH host key (which is server-specific) to decrypt secrets:

```nix
sops.age.sshKeyPaths = [ "/etc/ssh/ssh_host_ed25519_key" ];
```

To decrypt the runner PAT, we then use the following configuration:

```nix
sops.secrets."github-runner-yocto.token" = {
  sopsFile = ./secrets/github-runners.yaml.encrypted;
  key = "runner_token";
};
```

Here, `github-runners.yaml.encrypted` is our SOPS-encrypted file from earlier (just make sure to allow decryption with the private SSH host key of the server you deploy this to). As a result of this configuration `nix-sops` will make the plain runner PAT available through `/run/secrets/github-runner-yocto.token`, where it is picked up by our runner configuration from above. Crucially, this file is owned by `root` not by the `github-runner-yocto` user which will be used to run actual runner.
This provides an additional layer of protection preventing the PAT from being leaked.

### The Shared Cache

In our setup, we run multiple runners on the same host, but want them to share a single Yocto cache.
Yocto's build system has two important caches:

- **`sstate`**: Compiled artifacts that can be reused across builds
- **`downloads`**: Source tarballs fetched from the internet

We store both in `/var/cache/yocto/` and make them accessible to all runners:

```nix
systemd.tmpfiles.rules = [
  "d /var/cache/yocto 1777 root root -"
  "d /var/cache/yocto/sstate 1777 root root -"
  "d /var/cache/yocto/downloads 1777 root root -"
];
```

The `1777` permission (world-writable with sticky bit) might raise eyebrows.
We use it because rootless Podman's UID mapping (see later) doesn't preserve group membership, so traditional group-based sharing doesn't work.

The cache directories are configured through the `SSTATE_DIR` and `DL_DIR` environment variables in the runner configuration.

:::warning
For production builds where supply chain security is critical, we recommend scoping runners to repositories and setting up per-runner caches.
:::

To prevent the caches from growing indefinitely, we run a weekly cleanup:

```nix
systemd.services.yocto-cache-cleanup = {
  description = "Cleanup old Yocto cache entries";
  path = [ pkgs.findutils ];
  script = ''
    find /var/cache/yocto/sstate -type f -mtime +30 -delete
    find /var/cache/yocto/sstate -type d -empty -delete
    find /var/cache/yocto/downloads -type f -mtime +90 -delete
    find /var/cache/yocto/downloads -type d -empty -delete
  '';
  serviceConfig.Type = "oneshot";
};

systemd.timers.yocto-cache-cleanup = {
  description = "Weekly Yocto cache cleanup";
  wantedBy = [ "timers.target" ];
  timerConfig = {
    OnCalendar = "weekly";
    Persistent = true;
    RandomizedDelaySec = "1h";
  };
};
```

Sstate entries older than 30 days and downloads older than 90 days get purged.
This keeps the cache reasonably sized while ensuring recent artifacts stick around.

### Rootless Podman

We use [Kas](https://kas.readthedocs.io/) with `kas-container` to run Yocto builds inside a container.
Setting up NixOS to run Yocto builds directly is painful and unnecessary when you can just use a container.
This also gives us a build environment that's identical to what we use locally.

Running containers requires a container runtime.
One option is to pass through the Docker socket, but that's a terrible idea for CI runners: access to the Docker socket is effectively root access to the host.
A compromised workflow could escape the container and take over the machine.
Instead, we use rootless Podman.
It runs entirely as an unprivileged user, so even if a workflow is compromised, it can't escalate to root.

Getting rootless Podman to work with NixOS' GitHub actions runner service requires disabling some of its sandboxing features. While they are generally a good idea and provide additional defense in depth, they conflict with user namespaces and other capabilities required by rootless Podman. So, we need to disable them:

```nix
systemd.services.github-runner-yocto = {
  path = [ "/run/wrappers" ];
  serviceConfig = {
    # Disable sandboxing that conflicts with rootless podman.
    DynamicUser = lib.mkForce false;
    PrivateUsers = lib.mkForce false;
    PrivateMounts = lib.mkForce false;
    PrivateTmp = lib.mkForce false;
    PrivateDevices = lib.mkForce false;
    ProtectHome = lib.mkForce false;
    ProtectProc = lib.mkForce "default";
    ProtectSystem = lib.mkForce "full";
    ProtectClock = lib.mkForce false;
    ProtectControlGroups = lib.mkForce false;
    ProtectHostname = lib.mkForce false;
    ProtectKernelLogs = lib.mkForce false;
    ProtectKernelModules = lib.mkForce false;
    ProtectKernelTunables = lib.mkForce false;
    RestrictNamespaces = lib.mkForce false;
    NoNewPrivileges = lib.mkForce false;
    RestrictSUIDSGID = lib.mkForce false;
    RemoveIPC = lib.mkForce false;
    CapabilityBoundingSet = lib.mkForce "~";
    DeviceAllow = lib.mkForce null;
    AmbientCapabilities = lib.mkForce null;
    SystemCallFilter = lib.mkForce [ ];
  };
};
```

This is one of those cases where we trade some additional isolation for functionality.
The runner still runs as a dedicated unprivileged user and should not be able to escape that environment (if there are no bugs and everything is correctly configured).

The runner user also needs subuid/subgid ranges for Podman's user namespace mapping, which we configure together with the respective user:

```nix
users.users.github-runner-yocto = {
  uid = 2000;
  group = "github-runner-yocto";
  subUidRanges = [{ startUid = 200000; count = 65536; }];
  subGidRanges = [{ startGid = 200000; count = 65536; }];
};
```

## GitHub Workflow

With the infrastructure in place, the workflow itself is straightforward:

```yaml
name: CI Pipeline

on:
  push:
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: [self-hosted, nixos, yocto]
    steps:
      - uses: actions/checkout@v4
      - run: kas-container checkout examples/raspberrypi.yaml
      - run: kas-container build examples/raspberrypi.yaml
```

The `runs-on: [self-hosted, nixos, yocto]` selector ensures the job lands on one of our configured runners.
The runner already has `kas` and `podman` available, and the environment variables point to the shared cache.

If you have a public repository and the runner doesn't pick up the job, you may need to specifically allow the runner to pick-up jobs from public repositories. By default, self-hosted runners only run jobs from private repositories.

## Wrapping Up

This setup works well for us.
Builds that would be impractical on hosted runners complete reliably, and incremental builds are fast thanks to the shared cache.
The same approach works for Rugix Bakery builds too, if you're hitting the limits of hosted runners there.

There's something satisfying about applying the same principles to your infrastructure that you apply to your products: declarative configuration, reproducible builds, and the ability to recover quickly when things go wrong.

---

**Need help with embedded Linux?** At [Silitics](https://silitics.com), we offer consulting and services for all aspects of embedded Linux development. We can also host and manage Yocto CI runners for you. And when your devices hit production, check out [Nexigon](https://nexigon.cloud) for fleet management and OTA updates. **[Get in touch](https://silitics.com/contact)** and let's talk.

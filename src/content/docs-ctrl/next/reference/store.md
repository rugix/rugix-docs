---
title: Store
order: 4
---

Rugix Ctrl's store is a content-addressed storage area on the device, which means that it names content after its hash. It keeps large files, such as container images, in a space-efficient way that still allows [delta updates](../../updates/delta-updates). The store splits each file into chunks, keeps every distinct chunk once, and compresses it, so files that share most of their content, for example two versions of a container image, use little more space than one. When installing a bundle, Rugix Ctrl reuses chunks from the store instead of downloading them again, and a stored file can serve as the source of a static delta.

Currently, Rugix Apps keeps app files in the store, as described in [Stored Files](../../application-management/internals#stored-files).

## Layout

The store lives in the Rugix state directory at `/run/rugix/state/store/` (or `/var/lib/rugix/store/` if Rugix state management is not active), so a factory reset clears it. It is accessible to root only:

```
<store>/
├── lock
├── tmp/                                      # staging area of installations
├── chunks/<hash-algorithm>/<xx>/<hash>[.xz]  # pieces of file content, usually compressed
├── objects/<hash-algorithm>/<xx>/<hash>      # descriptions of stored files
└── refs/<name>                               # names of stored files
```

The store holds three kinds of entries:

- **Chunks** are pieces of file content. They correspond to the blocks of a bundle's [block index](../../updates/update-bundles#block-encoding) and are named after the hash of their uncompressed content. A chunk shared by several files is stored once. Each chunk is compressed on its own with xz and has the `.xz` suffix, unless compression does not shrink it. `<xx>` is the first byte of the hash in hex.
- **Objects** describe one stored file each: how it was split into chunks and the hashes and sizes of its chunks, in the block index format. An object is named after the hash of this description.
- **Refs** name stored files. A ref is a small file containing the name of an object. Each component of Rugix Ctrl that uses the store names its files in its own namespace, a path prefix below `refs/`.

Rugix Ctrl splits a file with the chunker and hash algorithm of the payload's [block encoding](../../updates/update-bundles#block-encoding). It uses `casync-64` and `sha512-256` for payloads without a block encoding and for files reconstructed from a static delta. Files share chunks only if they were split the same way, so keep the block encoding of a payload stable across releases.

## Installing Files

When Rugix Ctrl installs a bundle payload into the store, it keeps chunks that arrive compressed in the bundle as they are, so the device does not compress them again. Other content, such as a file reconstructed from a [static delta](../../updates/delta-updates#static-delta-updates), is compressed on the device. Applying a static delta to a stored file needs free space for a full temporary copy of the stored file, because Xdelta requires a seekable source.

When a bundle is installed over HTTP from a server that supports range requests, Rugix Ctrl does not download blocks that are already stored as chunks, provided the payload's block index uses the same chunker and hash algorithm. This applies to system and app bundles.

Installations stage new chunks and objects in `tmp/`, synchronize them to disk, and only then move them into place and write the ref. An interrupted installation therefore leaves at most unreferenced data, which the next garbage collection deletes.

Reading a stored file decompresses its chunks and verifies their hashes, so corrupted content makes the read fail instead of returning wrong data.

## Garbage Collection

Each component that uses the store decides which of its refs it still needs. Garbage collection removes the other refs, deletes all objects and chunks that no remaining ref reaches, and empties `tmp/`. Components run garbage collection after removing their data, for example, Rugix Apps after `rugix-ctrl apps gc` and `rugix-ctrl apps remove`. `rugix-ctrl store gc` runs it on demand.

Garbage collection waits until nothing else uses the store, that is, until no installation and no reader of a stored file is running.

## Commands

| Command                          | Description                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `rugix-ctrl store info`          | Summarize the store: refs, objects, chunks, referenced size, and disk usage.                          |
| `rugix-ctrl store list [PREFIX]` | List the refs at or below `PREFIX`, for example `apps/my-app`, with their objects and sizes.          |
| `rugix-ctrl store verify`        | Check that all referenced objects and chunks are intact. Fails with a non-zero exit status otherwise. |
| `rugix-ctrl store gc`            | Remove refs that are no longer needed and delete objects and chunks that no ref reaches.              |

The commands read the state directory directly and therefore require root privileges. Their JSON output is described by published [JSON Schemas](https://github.com/rugix/rugix/tree/main/schemas).

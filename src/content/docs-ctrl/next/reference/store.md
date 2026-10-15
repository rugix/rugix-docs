---
title: Store
order: 4
---

The store keeps large files, such as container images, on the device in a space-efficient way that still allows [delta updates](../../updates/delta-updates). It splits each file into chunks, keeps every distinct chunk once, and compresses it, so files that share most of their content, for example two versions of a container image, use little more space than one. When installing a bundle, Rugix Ctrl reuses chunks from the store instead of downloading them again, and a stored file can serve as the source of a static delta.

[Rugix Apps](../../application-management/internals#stored-files) keeps app files in the store.

## Layout

The store lives in the Rugix state directory at `/run/rugix/state/store/` (or `/var/lib/rugix/store/` if Rugix state management is not active), so a factory reset clears it. It is accessible to root only:

```
<store>/
├── lock
├── tmp/                                      # staging area of installations
├── chunks/<hash-algorithm>/<xx>/<hash>[.xz]  # compressed blocks of file content
├── objects/<hash-algorithm>/<xx>/<hash>      # descriptions of stored files
└── refs/<name>                               # names of stored files
```

The store holds three kinds of entries:

- **Chunks** are blocks of file content, named after the hash of their uncompressed bytes. A chunk shared by several files is stored once. Each chunk is compressed on its own; the `.xz` suffix marks compressed chunks. `<xx>` is the first byte of the hash in hex.
- **Objects** describe one stored file each: how it was split into chunks and the hashes and sizes of its chunks. The description uses the block index format of [Rugix bundles](../../updates/update-bundles). An object is named after the hash of this description.
- **Refs** name stored files. A ref is a small file containing the name of an object. Each user of the store names its files in its own namespace, a path prefix below `refs/`.

## Installing Files

When Rugix Ctrl installs a bundle payload into the store, it keeps blocks that arrive compressed in the bundle as they are, so the device does not compress them again. Other content, such as a file reconstructed from a [delta payload](../../updates/delta-updates), is compressed on the device. Applying a delta payload to a stored file temporarily copies that file out of the store, because Xdelta requires a seekable source.

Installations of system and app bundles use stored chunks as local block sources. When a bundle is installed over HTTP from a server that supports range requests, blocks that are already in the store are not downloaded.

Installations stage new chunks and objects in `tmp/`, synchronize them to disk, and only then move them into place and write the ref. A file interrupted while being written therefore leaves at most unreferenced data, which the next garbage collection deletes.

## Reading Files

Reading a stored file decompresses its chunks and verifies their hashes.

## Garbage Collection

Each user of the store decides which of its refs it still needs. Garbage collection removes the other refs and then deletes all objects and chunks that no remaining ref reaches. Users of the store run garbage collection after removing their data, and `rugix-ctrl store gc` runs it on demand.

Garbage collection waits until nothing else uses the store, that is, until no installation and no reader of a stored file is running.

## Commands

| Command                          | Description                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `rugix-ctrl store info`          | Summarize the store: refs, objects, chunks, referenced size, and disk usage.             |
| `rugix-ctrl store list [PREFIX]` | List refs with the objects they name and their sizes.                                    |
| `rugix-ctrl store verify`        | Check that all referenced objects and chunks are intact. Exits with 1 on problems.       |
| `rugix-ctrl store gc`            | Remove refs that are no longer needed and delete objects and chunks that no ref reaches. |

The commands read the state directory directly and therefore require root privileges. Their JSON output is described by published [JSON Schemas](https://github.com/rugix/rugix/tree/main/schemas).

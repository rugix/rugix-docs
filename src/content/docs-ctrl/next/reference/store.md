---
title: Store
order: 4
---

Rugix Ctrl keeps large files on the device in a content-addressed store. The store splits each file into chunks, keeps every distinct chunk once, and compresses it. Files that share most of their content, for example two versions of a container image, therefore use little more space than one. Installations of system and app bundles also reuse chunks from the store instead of downloading them again.

Currently, [Rugix Apps](../../application-management/) uses the store for `app-file` payloads with `store = true`, as described in [App Bundles](../../application-management/internals#app-bundles). Docker Compose apps packed with `rugix-bundler` keep their container images there by default.

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
- **Objects** describe one stored file each: how it was split into chunks and the hashes and sizes of its chunks. An object is named after the hash of this description.
- **Refs** name stored files. A ref is a small file containing the name of an object. Each user of the store names its files in its own namespace. Rugix Apps names the file `PATH` of generation `N` of app `APP` with the ref `apps/APP/N/PATH`.

## Installing Files

When Rugix Ctrl installs a file into the store, it keeps blocks that arrive compressed in the bundle as they are, so the device does not compress them again. Other content, such as a file reconstructed from a [delta payload](../../updates/delta-updates), is compressed on the device. Applying a delta payload to a stored file temporarily copies that file out of the store, because Xdelta requires a seekable source.

Installations of app and system bundles use stored chunks as local block sources. When a bundle is installed over HTTP from a server that supports range requests, blocks that are already in the store are not downloaded.

Installations stage new chunks and objects in `tmp/`, synchronize them to disk, and only then move them into place and write the ref. A file interrupted while being written therefore leaves at most unreferenced data, which the next garbage collection deletes.

## Reading Files

Reading a stored file decompresses its chunks and verifies their hashes. Rugix Apps exposes the stored files of a generation through `rugix-ctrl apps cat`, which orchestrators use, for example, to [load container images](../../application-management/orchestrators/generic#large-files-in-the-store).

## Garbage Collection

Garbage collection removes refs that their user no longer needs and then deletes all objects and chunks that no remaining ref reaches. For Rugix Apps, these are the refs of generations that no longer exist, including generations removed by a Rugix Ctrl version without the store. Files that an interrupted app installation already stored belong to its incomplete generation until `rugix-ctrl apps gc` removes that generation.

Garbage collection runs after `rugix-ctrl apps gc` and `rugix-ctrl apps remove`, and on demand with `rugix-ctrl store gc`. It waits until nothing else uses the store: installations of app and system bundles, `rugix-ctrl apps cat`, and image loading during app activation.

## Compatibility

Rugix Ctrl versions without the store ignore `store = true` and write the file into the generation directory. They cannot read files that a newer version stored. After a system rollback to such a version, its Docker Compose orchestrator can only activate generations whose images Docker still has, and orchestrator scripts calling `rugix-ctrl apps cat` fail. As long as devices may roll back to such a version, pack Docker Compose apps with `--image-location file`.

## Commands

| Command                          | Description                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `rugix-ctrl store info`          | Summarize the store: refs, objects, chunks, referenced size, and disk usage.             |
| `rugix-ctrl store list [PREFIX]` | List refs with the objects they name and their sizes.                                    |
| `rugix-ctrl store verify`        | Check that all referenced objects and chunks are intact. Exits with 1 on problems.       |
| `rugix-ctrl store gc`            | Remove refs that are no longer needed and delete objects and chunks that no ref reaches. |

The commands read the state directory directly and therefore require root privileges. Their JSON output is described by published [JSON Schemas](https://github.com/rugix/rugix/tree/main/schemas).

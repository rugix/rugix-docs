---
title: Kernel Command Line
order: 3
---

Rugix Ctrl reads the following parameters from the kernel command line when it runs as the system init process.

## Init Parameters

`rugix.init.quiet`

: Suppresses routine Rugix initialization messages and output from early-boot hooks. Rugix still writes initialization errors and init-failure diagnostics to the console.

`rugix.init.shell_on_error[=<seconds>]`

: Offers an interactive root shell after Rugix initialization fails. The optional value sets how many seconds Rugix waits for a key press and defaults to 30 seconds. This parameter is disabled by default because the shell grants root access to anyone with console access.

## Example

The following parameters keep a production display quiet while retaining errors:

```text
init=/usr/bin/rugix-ctrl rugix.init.quiet
```

## Boot-Flow Parameters

`rugix.boot_group=<name>`

: Overrides active boot-group detection with the named boot group. Boot integrations can use this when Rugix Ctrl cannot infer the active group from bootloader state or the mounted system device.

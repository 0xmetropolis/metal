# Metropolis CLI

Smart contract visualization CLI tool.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g 0xmetropolis/metro
$ metro COMMAND
running command...
$ metro (--version)
metro/0.0.0 darwin-arm64 node-v18.12.0
$ metro --help [COMMAND]
USAGE
  $ metro COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`metro hello PERSON`](#metro-hello-person)
- [`metro hello world`](#metro-hello-world)
- [`metro help [COMMANDS]`](#metro-help-commands)
- [`metro plugins`](#metro-plugins)
- [`metro plugins:install PLUGIN...`](#metro-pluginsinstall-plugin)
- [`metro plugins:inspect PLUGIN...`](#metro-pluginsinspect-plugin)
- [`metro plugins:install PLUGIN...`](#metro-pluginsinstall-plugin-1)
- [`metro plugins:link PLUGIN`](#metro-pluginslink-plugin)
- [`metro plugins:uninstall PLUGIN...`](#metro-pluginsuninstall-plugin)
- [`metro plugins:uninstall PLUGIN...`](#metro-pluginsuninstall-plugin-1)
- [`metro plugins:uninstall PLUGIN...`](#metro-pluginsuninstall-plugin-2)
- [`metro plugins update`](#metro-plugins-update)

## `metro hello PERSON`

Say hello

```
USAGE
  $ metro hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/0xmetropolis/cli/blob/v0.0.0/dist/commands/hello/index.ts)_

## `metro hello world`

Say hello world

```
USAGE
  $ metro hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ metro hello world
  hello world! (./src/commands/hello/world.ts)
```

## `metro help [COMMANDS]`

Display help for metro.

```
USAGE
  $ metro help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for metro.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.9/src/commands/help.ts)_

## `metro plugins`

List installed plugins.

```
USAGE
  $ metro plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ metro plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.4.7/src/commands/plugins/index.ts)_

## `metro plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ metro plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ metro plugins add

EXAMPLES
  $ metro plugins:install myplugin

  $ metro plugins:install https://github.com/someuser/someplugin

  $ metro plugins:install someuser/someplugin
```

## `metro plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ metro plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ metro plugins:inspect myplugin
```

## `metro plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ metro plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ metro plugins add

EXAMPLES
  $ metro plugins:install myplugin

  $ metro plugins:install https://github.com/someuser/someplugin

  $ metro plugins:install someuser/someplugin
```

## `metro plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ metro plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ metro plugins:link myplugin
```

## `metro plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ metro plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ metro plugins unlink
  $ metro plugins remove
```

## `metro plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ metro plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ metro plugins unlink
  $ metro plugins remove
```

## `metro plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ metro plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ metro plugins unlink
  $ metro plugins remove
```

## `metro plugins update`

Update installed plugins.

```
USAGE
  $ metro plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

<!-- commandsstop -->

# Metropolis CLI

TESTING

[![Integration Tests 🌁](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml/badge.svg)](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml)

Smart contract visualization CLI tool.

## Dev Setup

```bash
yarn
yarn install:dev
source ~/.zshrc # or ~/.bashrc

yarn watch

mdev
```

This will register the `mdev` command in your $PATH - which points to [run](./bin/run). `yarn watch`
will look for changes in src and recompile with `tsc` command. Any runs of `mdev` will run the
`/dist/index.js` entry point.

## Register as a global package

```bash
yarn build
yarn install:global

metro
```

This will register the current build of `dist/index.js` as a global command `metro`. This is useful
for testing the CLI tool without having to publish to npm.

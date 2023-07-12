# Metropolis CLI

[![Integration Tests 🌁](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml/badge.svg)](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml)

Smart contract visualization CLI tool.

## Dev Setup

```bash
yarn
yarn install:dev # should only need to do this once
source ~/.zshrc # or ~/.bashrc

yarn watch

mdev # in a new terminal
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

## Releasing a new version

1. Write code.
1. Bump version in package.json, ex: `v0.0.5`.
1. Add changes to CHANGELOG.md.
1. Open PR, review, merge to main.
1. Draft a [new release](https://github.com/0xmetropolis/cli/releases/new).

- Choose tag: `v0.0.5`.
- Release title: `v0.0.5`.
- Description: Copy/paste new additions in CHANGELOG.md
- Publish release.

1. Confirm [new release](https://www.npmjs.com/package/@0xmetropolis/cli).

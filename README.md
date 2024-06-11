# Metal CLI

#### by [@0xmetropolis](https://twitter.com/0xMetropolis)

[Metal](https://metal.build/) is a smart contract visualization tool. This repo contains the CLI for
Metal.

# Getting Started

## Dependencies

- [Foundry](https://getfoundry.sh/)

## Installation

```bash
# with npm
npm install -g @0xmetropolis/metal

# with yarn
yarn global add @0xmetropolis/metal
```

## Development

The first time you set up metal for local development, you will need to run a setup script via:

```bash
yarn run dev
```

Whenever adding new features to metal, it can be helpful to auto-recompile the app:

```bash
yarn watch
```

In a new terminal, you can then issue commands to your local metal repo with the mdev command:

```bash
mdev help
```

# Usage

## Generate A Preview

In the directory of your Foundry project, run the following command:

```bash
metal preview --chain-id 1 $PATH_TO_DEPLOY_SCRIPT
```

NOTE: Metal wraps around `forge` commands, but `metal preview` does _not_ send any deployment
transactions.

This will compile your contracts and start a deployment simulation. Once the simulation is done,
your browser will open to display the results of the simulation.

## Setting the Chain Id

The `--chain-id` flag allows you to choose the network to preview your deployment on.

## Testing

[![Integration Tests 🌁](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml/badge.svg)](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml)

# Getting Help

If you run into problems or find a bug, consider opening an
[issue](https://github.com/0xmetropolis/cli/issues/new).

### This version of the CLI has been deprecated in favor of ✨ [Metal](https://www.npmjs.com/package/@0xmetropolis/metal)

---

# [deprecated] Metropolis CLI

#### by [@0xmetropolis](https://twitter.com/0xMetropolis)

Metropolis is a smart contract visualization tool.

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

# Usage

## Generate A Preview

In the directory of your Foundry project, run the following command:

```bash
metro preview --chain-id 1 $PATH_TO_DEPLOY_SCRIPT
```

NOTE: Metal wraps around `forge` commands, but `metro preview` does _not_ send any deployment
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

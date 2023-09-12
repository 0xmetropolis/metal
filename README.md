# Metropolis CLI

[![Integration Tests 🌁](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml/badge.svg)](https://github.com/0xmetropolis/cli/actions/workflows/integrationTest.yml)

Metropolis is a smart contract visualization tool. 

# Getting Started

## Dependencies

- [Foundry](https://github.com/foundry-rs/foundry)

## Installation

```bash
# with npm
npm install -g @0xmetropolis/cli

# with yarn
yarn global add @0xmetropolis/cli
```

# Usage

## Previewing A Deployment

In the directory of your Foundry project, run the following command:

```bash
metro preview --chain-id 1 $PATH_TO_DEPLOY_SCRIPT
```
NOTE: Metropolis wraps around `forge` commands, but `metro preview` does *not* send any deployment transactions.

This will compile your contracts and start a deployment simulation. Once the simulation is done, your browser will open to display the results of the simulation.

## Setting the Chain Id

The `--chain-id` flag allows you to choose the network to preview your deployment on.

# Getting Help

If you run into problems or find a bug, consider opening an [issue](https://github.com/0xmetropolis/cli/issues/new).

# License

[OUR LICENSE]
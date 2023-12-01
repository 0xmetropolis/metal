import { exit, getFlagValueFromArgv } from '.';
import { HandlerInput } from '../commands/deploy';
import { FORGE_FORK_ALIASES, doNotCommunicateWithMetalService } from '../constants';
import { Network } from '../types/index';
import { ChainConfig, fetchChainConfig, isChainSupported } from './preview-service';

export const getChainConfig = async (chainId: Network): Promise<Partial<ChainConfig>> => {
  const rpcOverrideFlagIdx = process.argv.findIndex(arg => FORGE_FORK_ALIASES.includes(arg));
  const userHasSpecifiedRPC = rpcOverrideFlagIdx !== -1;

  const emptyConfig: Partial<ChainConfig> = {
    rpcUrl: undefined,
    label: undefined,
    chainId,
    etherscanUrl: undefined,
  };

  return doNotCommunicateWithMetalService
    ? emptyConfig
    : !!userHasSpecifiedRPC
    ? { ...emptyConfig, rpcUrl: getFlagValueFromArgv(process.argv[rpcOverrideFlagIdx + 1]) }
    : await fetchChainConfig(chainId);
};
export async function validateInputs({ _: [, scriptPath], 'chain-id': chainId }: HandlerInput) {
  if (!scriptPath || !scriptPath.includes('.sol'))
    await exit('You must specify a solidity script to preview');

  const rpcSpecified = FORGE_FORK_ALIASES.some(alias => process.argv.includes(alias));

  // if the rpc is specified, we don't need to validate the chain id
  if (!rpcSpecified) {
    const isSupported = await isChainSupported(chainId);
    if (!isSupported) await exit(`Chain Id ${chainId} is not supported`);
  }
}

// @dev pulls any args from process.argv and replaces any fork-url aliases with the metal-service's fork url
export const configureForgeScriptInputs = ({ rpcUrl }: { rpcUrl: string }): string[] => {
  // pull anything after `metal preview <path>` as forge arguments
  let forgeArguments = process.argv.slice(3);

  // rewrap function signatures in quotes, ex: --sig "run()"
  forgeArguments = forgeArguments.map(arg =>
    arg.includes('(') && arg.includes(')') ? `"${arg}"` : arg,
  );

  forgeArguments.push('--rpc-url', rpcUrl);

  if (!forgeArguments.includes('--slow')) forgeArguments.push('--slow');

  return forgeArguments;
};

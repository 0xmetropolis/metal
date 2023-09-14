// a utility type to unwrap mulitple type inheritances on hover
export type Pretty<T> = {
  [K in keyof T]: T[K];
} & {};

// @dev Tenderly supported networks
export enum Network {
  MAINNET = 1,
  GOERLI = 5,
  OPTIMISTIC = 10,
  CRONOS = 25,
  RSK = 30,
  RSK_TESTNET = 31,
  KOVAN = 42,
  BINANCE = 56,
  OPTIMISTIC_KOVAN = 69,
  RIALTO_BINANCE = 97,
  POA = 99,
  GNOSIS_CHAIN = 100,
  POLYGON = 137,
  FANTOM = 250,
  BOBA_ETHEREUM = 288,
  CRONOS_TESTNET = 338,
  OPTIMISTIC_GOERLI = 420,
  MOONBEAM = 1284,
  MOONRIVER = 1285,
  BOBA_MOONBEAM = 1294,
  BOBA_MOONBASE = 1297,
  BOBA_GOERLI = 2888,
  FANTOM_TESTNET = 4002,
  BOBA_AVALANCHE_FUJI = 4328,
  BOBA_BINANCE_RIALTO = 9728,
  ARBITRUM_ONE = 42161,
  AVALANCHE_FUJI = 43113,
  AVALANCHE = 43114,
  BOBA_AVALANCHE = 43288,
  BOBA_BINANCE = 56288,
  POLYGON_MUMBAI = 80001,
  ARBITRUM_GOERLI = 421613,
  SEPOLIA = 11155111,
}

export type EthAddress = `0x${string}`;
export type HexString = `0x${string}`;

export type GitMetadata = {
  filePath: string;
  hasChanges: boolean;
  commitSha?: HexString;
  statusLabel: string;
};

export type RepoMetadata = {
  repositoryName: string;
  remoteUrl: string | undefined;
  repoCommitSHA: string;
  repoHasChanges: boolean;
  solidityFilesHaveChanges: boolean;
};

export type FoundryConfig = {
  profile: {
    [profileName: string]: {
      src: string;
      out: string;
      libs?: string[];
      cache?: boolean; // is true if by default
      cache_path: string;
      test?: string;
      broadcast?: string;
      sparse_mode?: boolean;
    };
  };
};

export type Abi = any;

export type SolidityFilesCache_Partial = {
  _format: 'ethers-rs-sol-cache-3' | 'hh-sol-cache-2' | string;
  paths: {
    artifacts: string;
    build_infos: string;
    sources: string;
    scripts: string;
    libraries: string[];
  };
  files: {
    [SOLIDITY_FILE_PATH: string]: {
      lastModificationDate: number;
      contentHash: HexString;
      sourceName: string; // relative path to the file
      solcConfig: {
        settings: {
          optimizer: {
            enabled: boolean;
            runs: number;
          };
          metadata: {
            bytecodeHash: string;
            appendCBOR: boolean;
          };
          evmVersion: string;
        };
      };
      imports: string[];
      versionRequirement: string;
      artifacts: {
        [ContractName: string]: {
          [fullyQualifiedSolcVersionName: string]: string; // artifact path
        };
      };
    };
  };
};

export type LogReceipt = {
  address: EthAddress;
  topics: string[];
  data: HexString | '0x';
  blockHash: HexString;
  blockNumber: HexString;
  transactionHash: HexString;
  transactionIndex: HexString;
  logIndex: HexString;
  transactionLogIndex: HexString;
  removed: boolean;
};

export type BroadcastReceipts = {
  transactionHash: HexString;
  transactionIndex: HexString;
  blockHash: HexString;
  blockNumber: HexString;
  from: EthAddress;
  to: EthAddress | null;
  cumulativeGasUsed: HexString;
  gasUsed: HexString;
  contractAddress: EthAddress | null;
  logs: LogReceipt[];
  status: '0x1' | '0x0';
  logsBloom: string;
  type: '0x2' | '0x1';
  effectiveGasPrice: HexString;
};

export type BroadcastTransaction = {
  hash: HexString;
  transactionType: 'CREATE' | 'CREATE2' | 'CALL';
  contractName: string;
  contractAddress: EthAddress;
  function: string | null;
  arguments: (string | '[]')[];
  transaction: {
    type: '0x02' | '0x1';
    from: EthAddress;
    gas: HexString;
    value: HexString;
    data: HexString;
    nonce: HexString;
    accessList: [];
  };
  additionalContracts: [];
  isFixedGasLimit: false;
};

export type BroadcastArtifacts_Partial = {
  transactions: BroadcastTransaction[];
  receipts: BroadcastReceipts[];
  libraries: string[];
  pending: []; // TODO?
  returns: {}; // TODO?
  timestamp: number;
  chain: number;
  multi: boolean;
  commit: HexString;
};

export type ContractMetadata = Pretty<
  {
    name: string; // name of the contract (ERC20)
    filePath: string;
    fullyQualifiedName: string; // fully qualified name of the contract path (e.g: src/ERC20.sol:ERC20)
    abi: Abi;
    deployedAddress?: EthAddress;
  } & GitMetadata
>;

export type ScriptMetadata = Pretty<
  {
    scriptName: string; // name of the script (e.g: Deploy.s.sol)
    functionName: string; // name of the function to call (default = "run()")
    broadcastArtifacts: BroadcastArtifacts_Partial;
  } & GitMetadata
>;

export type PreviewRequestParams = {
  cliVersion: string;
  chainId: Network;
  repoMetadata: RepoMetadata;
  scriptMetadata: ScriptMetadata;
  contractMetadata: ContractMetadata[];
};

export type DeploymentRequestParams = {
  cliVersion: string;
  chainId: Network;
  repoMetadata: RepoMetadata;
  scriptMetadata: ScriptMetadata;
  contractMetadata: ContractMetadata[];
};
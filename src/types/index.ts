export type EthAddress = `0x${string}`;
export type HexString = `0x${string}`;

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
    };
  };
};

export type SourceCodeDict = {
  [pathToSolc: string]: string;
};

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
  transactionType: 'CREATE' | 'CALL';
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

export type PreviewRequestParams = {
  broadcastArtifacts: BroadcastArtifacts_Partial;
  sourceCode: SourceCodeDict;
};

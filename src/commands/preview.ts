import { Args, Command, Flags } from '@oclif/core';
import { CommandError } from '@oclif/core/lib/interfaces';
import { ParserOutput } from '@oclif/core/lib/interfaces/parser';
import { exec } from 'node:child_process';
import { log } from 'node:console';

export default class Preview extends Command {
  static description = 'Generate preview of transactions from your Forge script';

  static examples = [
    '<%= config.bin %> <%= command.id %> forge script script/Deploy.s.sol --broadcast',
  ];

  static strict = false; // Allow unknown arguments

  // Example:
  // metro preview forge script script/test/DeployTestFxs.s.sol:DeployTestFxs --fork-url https://rpc.tenderly.co/fork/API_KEY --broadcast
  static args = {
    path: Args.file({
      required: true,
      name: '<PATH>',
      description: 'Path to script file.',
    }),
  };

  static flags = {
    broadcast: Flags.boolean({
      required: true,
    }),
  };

  private async tryParse(): Promise<
    ParserOutput<
      {
        broadcast: boolean;
      },
      {
        [flag: string]: any;
      },
      {
        path: string;
      }
    >
  > {
    /**
     * ParserOutput<
      {
        broadcast: boolean;
      },
      {
        [flag: string]: any;
      },
      {
        path: string;
      }
    >
     */
    let parsed: any = {
      args: {
        path: '',
      },
      flags: {
        broadcast: false,
        json: false,
      },
      argv: [],
    };
    try {
      parsed = await this.parse(Preview);
    } catch (error: any) {
      const isInvalidFlagError = error.message.includes('Nonexistent flag');
      log(isInvalidFlagError);
      log(error.message);
      if (!isInvalidFlagError) throw error;
    }
    return parsed;
  }

  public async run(): Promise<void> {
    // can get args as an object
  }
}

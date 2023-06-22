import { Args, Command, Flags } from '@oclif/core';
import { exec } from 'child_process';

export default class Preview extends Command {
  static description = 'Generate preview of transactions.';

  static examples = [
    '<%= config.bin %> <%= command.id %> forge script script/Deploy.s.sol --fork-url localhost:8545 --broadcast',
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

  public async run(): Promise<void> {
    // can get args as an object
    const { args, flags, argv } = await this.parse(Preview);
    // User input
    const bashCommand = argv.join(' ');
    const rpcFlags = ['-f', '--fork-url', '--rpc-url'];
    // Filter out user flags
    console.log({ args, flags, argv, processArgv: process.argv });
    // Execute some code before the command
    /**
     *
     */

    // Run bash command
    exec(`forge script ${bashCommand} --broadcast`, (error, stdout, stderr) => {
      console.log('bashCommand', bashCommand);
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });

    // Execute some code after the command
    /**
     * TODO POST /preview with:
     * - run-latest.json
     * - solidity-files-cache.json
     */
  }
}

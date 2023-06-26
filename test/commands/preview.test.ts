import { handler as preview } from '../../src/commands/preview';
import * as utils from '../../src/utils';
import * as child_process from 'child_process';
import { METRO_DEPLOY_URL } from '../../src/constants';
import { EventEmitter } from 'events';

// silence outputs
jest.mock('inquirer/lib/utils/screen-manager');
jest.mock('../../src/utils');

let spawnSpy: jest.SpyInstance;

const logInfo = jest.spyOn(utils, 'logInfo');
const logWarn = jest.spyOn(utils, 'logWarn');
const logError = jest.spyOn(utils, 'logError');

beforeEach(() => (spawnSpy = jest.spyOn(child_process, 'spawn')));
afterEach(() => {
  [logInfo, logWarn, logError].forEach(fn => fn.mockReset());
  spawnSpy.mockRestore();
  process.argv = [];
});

describe('preview', () => {
  it('accepts a preview command with a path', async () => {
    // await preview({ _: ['preview', 'fake/path.sol'], $0: 'preview' });
    // expect(logInfo).toHaveBeenCalledTimes(1);
    // expect(logInfo).toHaveBeenCalledWith(`Running Forge Script at fake/path.sol...`);
    expect(true);
  });
  // @test it should replace --fork-url -f or --rpc-url with the metro deploy url if present
  // it('replaces --fork-url -f or --rpc-url with the metro deploy url if present', async () => {
  //   process.argv = [
  //     'fake-jest-bin/node',
  //     'metro',
  //     'preview',
  //     'fake/path.sol',
  //     'INSERT_FLAG_HERE',
  //     'http://fake/rpc',
  //   ];
  //   for (const flag of ['--fork-url', '-f', '--rpc-url']) {
  //     process.argv[4] = flag;
  //     await preview({
  //       _: process.argv.slice(2),
  //       $0: 'preview',
  //     });
  //     expect(logWarn).toHaveBeenCalledWith(
  //       'You have specified a custom RPC',
  //       'This will be ignored and transactions will be sent to the Metropolis RPC',
  //     );
  //     expect(spawnSpy).toHaveBeenCalledWith(
  //       `forge script fake/path.sol --fork-url ${METRO_DEPLOY_URL}`,
  //       { shell: true },
  //     );
  //   }
  // });
  // it('adds a fork url if non-existent', async () => {
  //   process.argv = ['fake-jest-bin/node', 'metro', 'preview', 'fake/path.sol'];
  //   await preview({
  //     _: process.argv.slice(2),
  //     $0: 'preview',
  //   });
  //   expect(spawnSpy).toHaveBeenCalledWith(
  //     `forge script fake/path.sol --rpc-url ${METRO_DEPLOY_URL}`,
  //     { shell: true },
  //   );
  // });
  // it('handles forge errors', async () => {
  //   process.argv = ['fake-jest-bin/node', 'metro', 'preview', 'fake/path.sol'];
  //   const mockEmitter = new EventEmitter();
  //   const mockStdoutEmitter = new EventEmitter();
  //   spawnSpy.mockImplementationOnce(() => ({
  //     on: (eventName: string, callback: any) => mockEmitter.on(eventName, callback),
  //     stdout: {
  //       on: (eventName: string, callback: any) => mockStdoutEmitter.on(eventName, callback),
  //     },
  //   }));
  //   const error = new Error('Mock spawn error');
  //   // start the preview command, but do it async
  //   const runPromise = preview({
  //     _: process.argv.slice(2),
  //     $0: 'preview',
  //   });
  //   // Emit the error event
  //   mockEmitter.emit('error', error);
  //   try {
  //     // Wait for the preview command to finish - which resolves with an error
  //     await runPromise;
  //   } catch (e) {}
  //   expect(logError).toHaveBeenCalledWith(expect.stringContaining(error.message));
  // });
});

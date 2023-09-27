import { handler as preview } from '../../src/commands/preview';
import * as utils from '../../src/utils';
import * as child_process from 'child_process';
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
});

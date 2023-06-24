import { handler as preview } from '../../src/commands/preview';
import { runWithAnswers, ENTER } from '../utils';
import * as utils from '../../src/utils';

// silence outputs
jest.mock('inquirer/lib/utils/screen-manager');
jest.mock('../../src/utils');

const logInfo = jest.spyOn(utils, 'logInfo');

afterEach(() => {
  logInfo.mockReset();
});

describe('preview', () => {
  it('accepts a preview command with a path', async () => {
    await runWithAnswers(() => preview({ _: ['preview', 'fake/path.sol'], $0: 'preview' }), []);
    expect(logInfo).toHaveBeenCalledTimes(1);
    expect(logInfo.mock.calls[0][0]).toMatchSnapshot();
  });
});

import { expect, test } from '@oclif/test';

describe('preview', () => {
  test
    .stdout()
    .command(['preview', 'fake/path.js', '--broadcast'])
    .it('runs', ctx => {
      expect(true);
    });
});

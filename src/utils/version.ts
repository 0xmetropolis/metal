import * as path from 'node:path';
import * as fs from 'node:fs';

// @dev gets the version of the CLI
export const getCLIVersion = (): string => {
  //TODO correct path
  const packageJSONPath = path.resolve(__dirname, '../package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));

  return packageJSON.version;
};

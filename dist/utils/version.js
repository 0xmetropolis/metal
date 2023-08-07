"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCLIVersion = void 0;
const path = require("node:path");
const fs = require("node:fs");
// @dev gets the version of the CLI
const getCLIVersion = () => {
    //TODO correct path
    const packageJSONPath = path.resolve(__dirname, '../package.json');
    const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
    return packageJSON.version;
};
exports.getCLIVersion = getCLIVersion;
//# sourceMappingURL=version.js.map
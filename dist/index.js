#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
// prettier-ignore
yargs
    .commandDir('commands')
    .demandCommand(1)
    .help()
    .version()
    .argv;
//# sourceMappingURL=index.js.map
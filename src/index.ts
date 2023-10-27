#!/usr/bin/env node

import * as yargs from 'yargs';

// prettier-ignore
yargs
  // @ts-ignore
  .middleware(({ debug }) => {
    // set a debug flag for all commands
    process.env.YARG_DEBUG = debug ? '1' : '0' 
  })
  .commandDir('commands')
  .demandCommand(1)
  .help()
  .version()
  .showHelpOnFail(false)
  .argv;

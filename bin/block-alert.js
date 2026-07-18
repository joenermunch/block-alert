#!/usr/bin/env node

import { main } from '../lib/block-alert.js';

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`block-alert: ${error.message}\n`);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { main } from '../lib/agent-alert.js';

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`agent-alert: ${error.message}\n`);
  process.exitCode = 1;
});

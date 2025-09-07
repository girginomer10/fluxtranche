#!/usr/bin/env node
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const root = resolve(process.cwd(), '');
const deployPath = resolve(root, 'deployments/rise.txt');
const web3Path = resolve(root, 'frontend/src/config/web3.ts');

const content = readFileSync(deployPath, 'utf8');
const map = Object.create(null);
content.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^([A-Z_]+)=(0x[a-fA-F0-9]{40})$/);
  if (m) map[m[1]] = m[2];
});

const required = ['TRANCHE_VAULT_ADDRESS', 'FLASH_EPOCHS_ADDRESS', 'KINETIC_FEES_ADDRESS'];
for (const k of required) {
  if (!map[k]) {
    console.error(`Missing ${k} in deployments file.`);
    process.exit(1);
  }
}

let web3 = readFileSync(web3Path, 'utf8');
web3 = web3
  .replace(/TRANCHE_VAULT:\s*'0x[0-9a-fA-F]+'/,
    `TRANCHE_VAULT: '${map.TRANCHE_VAULT_ADDRESS}'`)
  .replace(/FLASH_EPOCHS:\s*'0x[0-9a-fA-F]+'/,
    `FLASH_EPOCHS: '${map.FLASH_EPOCHS_ADDRESS}'`)
  .replace(/KINETIC_FEES:\s*'0x[0-9a-fA-F]+'/,
    `KINETIC_FEES: '${map.KINETIC_FEES_ADDRESS}'`);

writeFileSync(web3Path, web3);
console.log('Updated frontend/src/config/web3.ts with deployment addresses.');

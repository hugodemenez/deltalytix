#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'app', 'icon.svg');
const output = path.join(root, 'desktop', 'assets', 'icon.png');

await sharp(fs.readFileSync(source)).resize(1024, 1024).png().toFile(output);
console.log(`Wrote ${output}`);

#!/usr/bin/env node
// O GitHub Pages não conhece as rotas do Angular: um link direto para /hendrixx/treino daria
// 404. Copiar o index.html para 404.html faz o Pages servir o app nessas rotas, e o roteador
// do Angular resolve o caminho no navegador.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/hendrixx/browser');
const index = resolve(dist, 'index.html');
if (!existsSync(index)) {
  console.error(`Build não encontrado em ${dist}. Rode "ng build" antes.`);
  process.exit(1);
}
copyFileSync(index, resolve(dist, '404.html'));
console.log('404.html criado a partir do index.html');

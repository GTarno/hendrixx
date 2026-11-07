#!/usr/bin/env node
// Gera os ícones do PWA (public/icons) a partir de tools/icons/icon.svg, renderizando no
// Chromium do Playwright. Uso: node tools/icons/build-icons.cjs
//
// - icon-<n>.png: cantos arredondados, para instalação e favicon ("any").
// - maskable-<n>.png: fundo cheio e desenho reduzido à área segura (80%), para o Android
//   recortar no formato que quiser ("maskable").
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');
const out = path.join(root, 'public/icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const APPLE_SIZE = 180;

function page(size, maskable) {
  const inner = maskable
    ? // Fundo cheio e o desenho em 80% do tamanho, centralizado.
      `<div style="width:${size}px;height:${size}px;background:#101216;display:grid;place-items:center">
         <div style="width:${size * 0.8}px;height:${size * 0.8}px">${svg.replace('rx="112"', 'rx="0"')}</div>
       </div>`
    : `<div style="width:${size}px;height:${size}px">${svg}</div>`;
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:transparent}
    svg{display:block;width:100%;height:100%}
  </style></head><body>${inner}</body></html>`;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage();
  const shot = async (size, maskable, file) => {
    await tab.setViewportSize({ width: size, height: size });
    await tab.setContent(page(size, maskable));
    await tab.screenshot({ path: path.join(out, file), omitBackground: !maskable });
    console.log('gerado', path.relative(root, path.join(out, file)));
  };
  for (const size of SIZES) await shot(size, false, `icon-${size}x${size}.png`);
  for (const size of MASKABLE_SIZES) await shot(size, true, `maskable-${size}x${size}.png`);
  // Ícone da tela inicial do iPhone: o iOS aplica os próprios cantos, então vai com fundo cheio.
  await shot(APPLE_SIZE, true, 'apple-touch-icon.png');
  await browser.close();
})();

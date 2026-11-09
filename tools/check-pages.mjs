#!/usr/bin/env node
// Confere o app publicado no GitHub Pages: página, scripts, estilos, manifesto, service
// worker e link direto para uma rota. Sem dependências (fetch do Node).
//
// Uso: node tools/check-pages.mjs [url] [--tentativas=N] [--espera=segundos]
// Padrão: https://gtarno.github.io/hendrixx/, 10 tentativas a cada 15 s (o Pages leva um
// tempo para propagar depois do deploy).

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? Number(arg.split('=')[1]) : fallback;
};
const base = new URL(args.find((a) => !a.startsWith('--')) ?? 'https://gtarno.github.io/hendrixx/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const attempts = option('tentativas', 10);
const waitSeconds = option('espera', 15);

async function get(url) {
  const response = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  return { status: response.status, ok: response.ok, body: await response.text() };
}

/** Lista de problemas encontrados (vazia = tudo certo). */
async function check() {
  const problems = [];
  const index = await get(base);
  if (!index.ok) return [`página inicial respondeu ${index.status}`];
  if (!index.body.includes('<app-root')) problems.push('página inicial sem <app-root>');
  if (!index.body.includes(`<base href="${base.pathname}"`)) {
    problems.push(`página inicial sem <base href="${base.pathname}">`);
  }

  const found = [...index.body.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((href) => !/^(https?:)?\/\//.test(href) && !href.startsWith('data:'));
  const assets = [...new Set([...found, 'manifest.webmanifest', 'ngsw-worker.js', 'ngsw.json'])];
  for (const asset of assets) {
    const { status, ok } = await get(new URL(asset, base));
    if (!ok) problems.push(`${asset} respondeu ${status}`);
  }

  // Link direto: o Pages devolve o 404.html, que é o próprio app.
  const deep = await get(new URL('instalar', base));
  if (!deep.body.includes('<app-root'))
    problems.push(`link direto /instalar não abre o app (${deep.status})`);

  console.log(`${base}: ${assets.length} arquivos conferidos`);
  return problems;
}

for (let attempt = 1; attempt <= attempts; attempt++) {
  let problems;
  try {
    problems = await check();
  } catch (error) {
    problems = [`falha de rede: ${error.message}`];
  }
  if (!problems.length) {
    console.log('Site publicado OK.');
    process.exit(0);
  }
  console.error(`Tentativa ${attempt}/${attempts}:\n  - ${problems.join('\n  - ')}`);
  if (attempt < attempts) await new Promise((r) => setTimeout(r, waitSeconds * 1000));
}
console.error('O site publicado não passou na verificação.');
process.exit(1);

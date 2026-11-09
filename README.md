# hendrixx

[![CI](https://github.com/GTarno/hendrixx/actions/workflows/ci.yml/badge.svg)](https://github.com/GTarno/hendrixx/actions/workflows/ci.yml)

🎸 Hendrixx: practice guitar chord changes with a customizable metronome, BPM control and visual chord diagrams.

App Angular (componentes standalone + Signals) para treinar troca de acordes de violão com
metrônomo configurável.

**App publicado:** https://gtarno.github.io/hendrixx/

## Usar e instalar

O Hendrixx funciona inteiro no navegador: basta abrir o endereço acima, sem instalar nada.

Se quiser, ele também pode ser instalado como app (PWA), com ícone na tela inicial, tela própria
e uso sem internet depois da primeira visita. O passo a passo fica dentro do próprio app, em
[Instalar o app](https://gtarno.github.io/hendrixx/instalar):

- **Android** (Chrome): menu ⋮ → **Instalar app**.
- **iPhone/iPad** (Safari): **Compartilhar** → **Adicionar à Tela de Início**.
- **Computador** (Chrome ou Edge): ícone de instalar no fim da barra de endereço.

## Como rodar

Requer Node.js 22.22+ ou 24.15+ (a versão usada no CI está em `.nvmrc`).

```bash
npm install
```

```bash
npm start
```

O app abre em `http://localhost:4200/`.

Para conferir os diagramas de acordes, abra `http://localhost:4200/dev/acordes`. Essa página
só existe em desenvolvimento e não entra no build de produção.

## Scripts

| Comando                 | O que faz                                                    |
| ----------------------- | ------------------------------------------------------------ |
| `npm start`             | Servidor de desenvolvimento com recarga automática           |
| `npm run build`         | Build de produção em `dist/hendrixx`                         |
| `npm run build:pages`   | Build para o GitHub Pages (`/hendrixx/`)                     |
| `npm run pages:check`   | Confere o site publicado (padrão: GitHub Pages)              |
| `npm run icons`         | Gera os ícones do PWA a partir de `tools/icons/icon.svg`     |
| `npm test`              | Testes unitários (Vitest), uma execução                      |
| `npm run test:watch`    | Testes em modo watch                                         |
| `npm run lint`          | ESLint (angular-eslint)                                      |
| `npm run format`        | Formata o código com Prettier                                |
| `npm run format:check`  | Confere a formatação sem alterar arquivos                    |
| `npm run catalog:build` | Gera `data/chords.json` a partir de `tools/`                 |
| `npm run catalog:check` | Valida o catálogo de acordes e confere se o JSON está em dia |

## Publicação

Cada merge na `main` publica o app no GitHub Pages pelo workflow
[`deploy.yml`](.github/workflows/deploy.yml), que roda os testes e `npm run build:pages`
(build com `base href` `/hendrixx/` e um `404.html` para os links diretos às rotas do app).

Na primeira vez, é preciso ativar o Pages no repositório: **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

### Depois de cada merge

1. O job **Verificar o site publicado** do deploy roda `npm run pages:check`: confere que a
   página, os scripts, os estilos, o manifesto e o service worker respondem e que um link direto
   (`/instalar`) abre o app. Se algo faltar, o deploy fica vermelho.
2. Abra https://gtarno.github.io/hendrixx/ num navegador (celular e computador) e confira as
   mudanças da PR: as telas alteradas funcionam e não há erros no console. Quem tem o app
   instalado recebe o aviso de nova versão; recarregue para ver as mudanças.

O roteiro para conferir o app em celulares e no desktop está em
[`docs/device-testing.md`](docs/device-testing.md).

## Convenções

- Commits em [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`).
- O PDF do curso e imagens extraídas dele nunca entram no repositório (bloqueados no `.gitignore`).
  Os diagramas são desenhados a partir dos dados do catálogo.

## Documentação

- [Regras de negócio](docs/business-rules.md)
- [Wireframes das telas](docs/wireframes.md)
- [Catálogo de acordes](docs/chord-catalog.md) · dados em [`data/chords.json`](data/chords.json)
- [Protótipo do metrônomo](prototype/README.md)
- [Teste em aparelhos reais](docs/device-testing.md)

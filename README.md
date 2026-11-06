# hendrixx

🎸 Hendrixx: practice guitar chord changes with a customizable metronome, BPM control and visual chord diagrams.

App Angular (componentes standalone + Signals) para treinar troca de acordes de violão com
metrônomo configurável.

## Como rodar

Requer Node.js 22 ou mais recente.

```bash
npm install
```

```bash
npm start
```

O app abre em `http://localhost:4200/`.

## Scripts

| Comando                 | O que faz                                                    |
| ----------------------- | ------------------------------------------------------------ |
| `npm start`             | Servidor de desenvolvimento com recarga automática           |
| `npm run build`         | Build de produção em `dist/hendrixx`                         |
| `npm test`              | Testes unitários (Vitest), uma execução                      |
| `npm run test:watch`    | Testes em modo watch                                         |
| `npm run lint`          | ESLint (angular-eslint)                                      |
| `npm run format`        | Formata o código com Prettier                                |
| `npm run format:check`  | Confere a formatação sem alterar arquivos                    |
| `npm run catalog:build` | Gera `data/chords.json` a partir de `tools/`                 |
| `npm run catalog:check` | Valida o catálogo de acordes e confere se o JSON está em dia |

## Convenções

- Commits em [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`).
- O PDF do curso e imagens extraídas dele nunca entram no repositório (bloqueados no `.gitignore`).
  Os diagramas são desenhados a partir dos dados do catálogo.

## Documentação

- [Wireframes das telas](docs/wireframes.md)
- [Catálogo de acordes](docs/chord-catalog.md) · dados em [`data/chords.json`](data/chords.json)
- [Protótipo do metrônomo](prototype/README.md)

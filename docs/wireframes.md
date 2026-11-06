# Wireframes

Wireframes de baixa fidelidade das telas do MVP. Servem para validar fluxo, hierarquia e
estados antes do Figma ou do código. As medidas são de referência para celular em retrato
(360–430 px de largura), que é o uso principal: o celular apoiado na estante ou no colo,
com o violão na mão.

Princípios que valem para todas as telas:

- **Leitura de longe** (≈ 1 m): acorde atual com no mínimo 25% da altura da tela, contraste
  AA ampliado (7:1) para o nome do acorde e o diagrama.
- **Toque com a mão livre**: alvos de no mínimo 48 × 48 px; ações principais na metade de baixo
  da tela, ao alcance do polegar.
- **Nunca só cor**: tempo forte, acorde selecionado e estados sempre têm também forma, texto
  ou ícone.
- **Modo escuro por padrão** na tela de treino (menos ofuscamento à noite), respeitando o tema
  do sistema nas outras.

## Mapa de navegação

```
┌──────────────┐  Iniciar   ┌──────────────┐  Parar / fim   ┌──────────────┐
│ 1. Montar    │──────────▶ │ 2. Treino     │──────────────▶ │ 2b. Resumo   │
│    treino    │ ◀───────── │  em andamento │                │   da sessão  │
└──────┬───────┘   Voltar   └──────────────┘                └──────┬───────┘
       │ "Ver todos"                                               │ Treinar de novo
       ▼                                                           │ / Ajustar
┌──────────────┐  Adicionar ao treino                              │
│ 3. Biblioteca│ ─────────────────────▶ (volta à tela 1) ◀─────────┘
└──────────────┘
```

Tela 4 (Meus treinos) fica para a fase 5 e entra como uma aba ao lado de "Montar treino".

---

## Tela 1: Montar treino

### Celular (retrato)

```
┌─────────────────────────────────────┐
│ Hendrixx                   [C|Dó] ⚙ │  ← alterna cifra/português (RN8)
├─────────────────────────────────────┤
│ Treinos sugeridos                    │
│ ╭──────────╮╭──────────╮╭──────────╮ │  ← rolagem horizontal
│ │Troca     ││Quarteto  ││Progressão│ │
│ │lenta     ││básico    ││clássica  │ │
│ │C ↔ G · 50││C D E F·60││C G Am F  │ │
│ ╰──────────╯╰──────────╯╰──────────╯ │
├─────────────────────────────────────┤
│ Acordes do treino (4)        Limpar │
│ ┌─────────────────────────────────┐ │
│ │ ①C  →  ②D  →  ③E  →  ④F   ⋮⋮   │ │  ← ordem do ciclo; arrastar para reordenar,
│ └─────────────────────────────────┘ │     tocar para remover
│                                     │
│ Escolher acordes   [Todos▾] 🔍      │  ← filtro: Iniciais / Maiores / Menores / 7…
│ ┌──────┐┌──────┐┌──────┐┌──────┐   │
│ │ ┬┬┬┬ ││ ┬┬┬┬ ││ ┬┬┬┬ ││ ┬┬┬┬ │   │  ← chip com mini-diagrama
│ │ ●  ● ││  ● ● ││ ●●   ││▬▬▬▬▬ │   │
│ │  C ✓ ││  D ✓ ││  E ✓ ││  F ✓ │   │  ← ✓ e borda grossa = selecionado
│ └──────┘└──────┘└──────┘└──────┘   │
│ ┌──────┐┌──────┐┌──────┐┌──────┐   │
│ │  G   ││  A   ││  B ▲ ││  Am  │   │  ← ▲ = pestana (dificuldade 3)
│ └──────┘└──────┘└──────┘└──────┘   │
│ ┌──────┐┌──────┐  Ver todos (71) ›  │
│ │  Dm  ││  Em  │                     │
│ └──────┘└──────┘                     │
├─────────────────────────────────────┤
│ Andamento                            │
│  [−5]  ────●──────────  [+5]  60 bpm │  ← slider 30–240 + campo numérico
│                         [Tap tempo] │
│                                     │
│ Tempos por acorde                    │
│  ( 1 ) ( 2 ) (●4 ) ( 8 ) ( 16 )     │  ← segmentado
│                                     │
│ Ordem                                │
│  (●Sequencial) (Aleatória) (Ping-pong)│
│                                     │
│ Parar                                │
│  (●Nunca) (Após [3] ciclos) (Após [5] min)│
│                                     │
│ [✓] Contagem de 1 compasso antes     │
├─────────────────────────────────────┤
│ C → D → E → F · 60 bpm · 4 tempos    │  ← resumo fixo no rodapé
│ ≈ 16 s por ciclo · sem fim           │
│ ┌─────────────────────────────────┐ │
│ │            ▶ Iniciar             │ │  ← botão principal, 56 px de altura
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Desktop / tablet em paisagem

Duas colunas: à esquerda os acordes (presets, ciclo, grade); à direita os controles e o resumo
com o botão Iniciar, fixos na tela enquanto a grade rola.

### Componentes

| Componente              | Comportamento                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card de treino sugerido | Toque preenche acordes, BPM, tempos, ordem e parada. Não inicia sozinho.                                                                                 |
| Faixa do ciclo          | Mostra a ordem real. Arrastar reordena; toque abre "Remover / Mover". Com ping-pong, mostra a volta em cinza: `C → D → E → F → E → D`.                   |
| Chip de acorde          | Mini-diagrama (48 px) + nome no modo de nomenclatura atual. Toque alterna seleção. Pressionar e segurar abre o diagrama grande e as variações.           |
| BPM                     | Slider + `−5`/`+5` + campo numérico + Tap tempo (média dos últimos 4 toques, arredondada). Fora de 30–240, o valor é limitado e aparece uma dica abaixo. |
| Tempos por acorde       | Opções 1, 2, 4, 8, 16. Ver "Decisão em aberto" no fim.                                                                                                   |
| Parar                   | Campo numérico só fica ativo na opção selecionada. Ciclos: 1–99. Minutos: 1–60.                                                                          |
| Resumo                  | Fórmula: `duração do ciclo = acordes no ciclo × tempos × 60 / bpm`. Ping-pong conta a volta. Mostra também a duração total quando a parada é por ciclos. |

### Estados e validação

| Situação                                  | O que a tela mostra                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Menos de 2 acordes (RN7)                  | Botão Iniciar desabilitado + texto "Escolha pelo menos 2 acordes" acima dele.           |
| Ordem aleatória com 2 acordes             | Aviso discreto: "Com 2 acordes, aleatório vira alternância."                            |
| BPM digitado fora da faixa                | Valor ajustado para 30 ou 240 e dica "Entre 30 e 240 bpm".                              |
| Mesmo acorde duas vezes seguidas na faixa | Permitido? Não: o chip é um seletor, cada acorde entra uma vez. Repetição vem da ordem. |

---

## Tela 2: Treino em andamento

A tela mais importante. Tudo nela é pensado para leitura a 1 m de distância.

### Celular (retrato)

```
┌─────────────────────────────────────┐
│ ✕        Ciclo 2 de ∞ · 00:47    ⛶  │  ← sair · progresso · tela cheia
├─────────────────────────────────────┤
│                                     │
│               D                     │  ← nome do acorde atual: 96–120 px
│             Ré                      │  ← nome alternativo menor (opcional)
│        ┌─┬─┬─┬─┬─┐                  │
│        x x ○                        │
│        ╞═╪═╪═╪═╪═╡                  │  ← capotraste
│        │ │ │ │ │ │                  │
│        ├─┼─┼─①─┼─②                  │  ← diagrama: 55–60% da largura
│        │ │ │ │ │ │                  │
│        ├─┼─┼─┼─③─┤                  │
│        │ │ │ │ │ │                  │
│        └─┴─┴─┴─┴─┘                  │
│           D  A  D  F#               │  ← notas
│                                     │
│   ●   ○   ○   ○                     │  ← tempos do compasso; o 1 é maior (acento)
│  ════════▶                          │  ← barra até a troca de acorde
│                                     │
│  ┌──────────────────────┐            │
│  │ Próximo   E  ┬┬┬┬    │            │  ← próximo acorde: 35–40% do atual
│  │           Mi ●●      │            │
│  └──────────────────────┘            │
│                                     │
├─────────────────────────────────────┤
│  [−5]     60 bpm     [+5]           │  ← ajuste ao vivo, vale do próximo tempo
│ ┌──────────┐ ┌──────────┐           │
│ │ ❚❚ Pausar│ │ ■ Parar  │           │
│ └──────────┘ └──────────┘           │
└─────────────────────────────────────┘
```

### Celular em paisagem / desktop

```
┌───────────────────────────────────────────────────────────────┐
│ ✕   Ciclo 2 de ∞ · 00:47                                   ⛶  │
├───────────────────────────────┬───────────────────────────────┤
│                               │  Próximo                       │
│        D        ┌─┬─┬─┬─┬─┐   │     E     ┌┬┬┬┬┐               │
│        Ré       │  diagrama │   │     Mi    │mini│              │
│                 └─────────┘   │                                 │
│                               │  ●  ○  ○  ○                     │
│                               │  [−5] 60 bpm [+5]               │
│                               │  [❚❚ Pausar]  [■ Parar]         │
└───────────────────────────────┴───────────────────────────────┘
```

### Metrônomo visual

Três elementos, todos lidos do relógio de áudio (`AudioContext.currentTime`) a cada quadro:

1. **Pontos de tempo** (`● ○ ○ ○`): o ponto do tempo atual acende. O tempo 1 é maior e tem
   anel, para não depender só de cor.
2. **Pulso**: o ponto aceso cresce e volta em ~120 ms a cada clique.
3. **Barra até a troca**: enche de 0 a 100% ao longo dos N tempos do acorde. Nos últimos
   tempos antes da troca, o card "Próximo" ganha destaque (borda) para preparar a mão.

Com `prefers-reduced-motion`, o pulso e a barra viram mudanças de estado sem animação.

### Estados da sessão

| Estado                   | Tela                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Contagem** (RN6)       | Nome do acorde substituído por `1 · 2 · 3 · 4` grande, um número por clique. O primeiro acorde já aparece como "Próximo".           |
| **Rodando**              | Layout acima.                                                                                                                       |
| **Pausado**              | Tudo congela, faixa "Pausado" sobre o acorde, botão vira `▶ Continuar`. Ao continuar, a música recomeça no tempo 1 do acorde atual. |
| **Fim** (RN4)            | Vai para a tela 2b.                                                                                                                 |
| **Aba em segundo plano** | O áudio continua (scheduler em Web Worker). Ao voltar, a tela se ressincroniza pelo relógio de áudio.                               |

### Atalhos de teclado (fase 4)

| Tecla  | Ação                       |
| ------ | -------------------------- |
| Espaço | Pausar / continuar         |
| Esc    | Parar                      |
| ↑ / ↓  | +5 / −5 bpm                |
| F      | Tela cheia                 |
| N      | Alternar cifra / português |

### Acessibilidade

- Nome do acorde atual em região `aria-live="polite"`: anuncia "Ré" a cada troca, nunca a cada
  tempo.
- Diagrama com `role="img"` e `aria-label` descritivo:
  "Ré maior: 6ª e 5ª abafadas, 4ª solta, 3ª na casa 2 dedo 1, 2ª na casa 3 dedo 3, 1ª na casa 2 dedo 2".
- Manter a tela acesa durante o treino (Wake Lock, quando o navegador permitir).

---

## Tela 2b: Resumo da sessão

```
┌─────────────────────────────────────┐
│            Treino concluído          │
│                                     │
│   3 ciclos · 48 trocas · 02:24       │
│   C → D → E → F · 60 bpm             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │      ↻ Treinar de novo           │ │
│ └─────────────────────────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ │
│ │ +5 bpm e de   │ │ Ajustar treino│ │  ← atalho para a progressão de BPM
│ │ novo (65)     │ │               │ │
│ └───────────────┘ └───────────────┘ │
│      Salvar como treino (fase 5)     │
└─────────────────────────────────────┘
```

Quando a parada é "Nunca", o botão Parar leva a esta mesma tela.

---

## Tela 3: Biblioteca

```
┌─────────────────────────────────────┐
│ ← Biblioteca              [C|Dó]    │
│ 🔍 Buscar acorde (ex.: Am, Lá, F#)   │  ← busca por cifra, português e aliases
│ (Todos)(Maior)(Menor)(7)(m7)(7M)     │  ← filtro por tipo
│ Dificuldade: (●)(●●)(●●●)            │
├─────────────────────────────────────┤
│ Dó                                   │  ← agrupado por tônica
│ ┌──────┐┌──────┐┌──────┐┌──────┐   │
│ │  C   ││  Cm  ││  C7  ││ C7M  │   │
│ └──────┘└──────┘└──────┘└──────┘   │
│ ┌──────┐                            │
│ │ Cm7  │  + 1 variação              │
│ └──────┘                            │
│ Dó# / Réb                            │
│ …                                    │
└─────────────────────────────────────┘
```

Tocar em um acorde abre o detalhe (folha inferior):

```
┌─────────────────────────────────────┐
│ F · Fá                    dificuldade ●●● │
│ ┌─────────────────┐                 │
│ │ diagrama grande │  Notas: F C F A C F │
│ └─────────────────┘                 │
│ Variações:  [F simplificado]         │
│ ┌─────────────────────────────────┐ │
│ │      + Adicionar ao treino       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Diagrama de acorde (`ChordDiagramComponent`)

Um único componente SVG, usado em três tamanhos: mini (chip, 48 px), médio (próximo acorde,
biblioteca) e grande (acorde atual).

```
     x  x  ○              ← acima: X (abafada) ou ○ (solta); nada se pressionada
   ╒══╤══╤══╤══╤══╕       ← capotraste grosso quando baseFret = 1
   │  │  │  │  │  │
   ├──┼──┼──①──┼──②       ← bolinha com o número do dedo
   │  │  │  │  │  │
3ª ├──┼──┼──┼──③──┤       ← com baseFret > 1: sem capotraste, número da casa à esquerda
   │  │  │  │  │  │
   └──┴──┴──┴──┴──┘
   E  A  D  G  B  E       ← (opcional) nome das cordas
         D  A  D  F#      ← notas soando, alinhadas às cordas
```

- 6 cordas × 5 casas, da 6ª (esquerda) para a 1ª (direita).
- Pestana: barra arredondada de `fromString` a `toString` na casa da pestana, com o "1".
- No tamanho mini, sem números de dedo e sem notas; só a forma.
- Entrada: `chord: Chord`, `size: 'mini' | 'md' | 'lg'`, `showNotes`, `showFingers`.

---

## Decisão em aberto: tempos por acorde x troca no tempo 1

RN5 diz que a troca sempre cai no tempo 1, mas o preset "Troca rápida" usa 1 tempo por acorde.
Proposta para o MVP:

- **N ≥ 4**: N precisa ser múltiplo de 4 (4, 8, 12, 16). A troca sempre cai no tempo 1.
- **N < 4**: só 1 ou 2, que dividem o compasso. A troca cai nos tempos 1 e 3 (N = 2) ou em
  todos os tempos (N = 1). O acento continua só no tempo 1.
- Valores como 3, 5 ou 6 ficam de fora do MVP. Se forem pedidos, a opção é trocar o compasso
  da sessão para N/4 (ex.: 3 tempos = compasso 3/4).

Essa proposta é a que o protótipo implementa (opções 1, 2, 4, 8 e 16).

# Catálogo de acordes

Fonte de dados: [`data/chords.json`](../data/chords.json), gerado por
[`tools/build-chord-catalog.mjs`](../tools/build-chord-catalog.mjs).

O arquivo JSON **não deve ser editado à mão**. Altere as formações no script e rode:

```bash
node tools/build-chord-catalog.mjs          # gera data/chords.json
node tools/build-chord-catalog.mjs --check  # valida e confere se o JSON está em dia (para o CI)
```

As formações são conhecimento musical comum e foram cadastradas uma a uma. Nada é recortado
ou transcrito do PDF do curso; ele serve só como referência de estudo e de layout.

## Modelo

Segue o `Chord` do plano, com quatro campos a mais (marcados com ➕):

```ts
type ChordQuality = 'maj' | 'min' | '7' | 'm7' | 'maj7';

type StringState =
  | { type: 'muted' }
  | { type: 'open' }
  | { type: 'fretted'; fret: number; finger: 1 | 2 | 3 | 4 };

interface Chord {
  id: string;              // "C", "Am", "G7", "Cmaj7", "F-simples"
  root: string;            // "C", "F#", "Bb"
  quality: ChordQuality;
  labelCifra: string;      // "C", "Am", "C7M"
  labelPt: string;         // "Dó", "Lá menor", "Dó 7M"
  strings: StringState[];  // 6 cordas, da 6ª (Mi grave) para a 1ª (Mi agudo)
  barre?: { fret: number; fromString: number; toString: number }; // números de corda 6..1
  baseFret: number;        // casa do topo do diagrama; 1 = mostra o capotraste (pestana do braço)
  notes: string[];         // notas soando, da corda mais grave para a mais aguda
  difficulty: 1 | 2 | 3;
  catalogPhase: 1 | 2 | 3 | 4;  // ➕ fase do roadmap em que o acorde entra
  aliases: string[];            // ➕ nomes enarmônicos aceitos na busca ("C#" para "Db")
  variantOf?: string;           // ➕ id do acorde principal, quando é uma variação
  variantName?: string;         // ➕ "Simplificado (sem pestana inteira)", "Pestana na 5ª casa"
}
```

### Convenções

- **`fret` é a casa absoluta no braço.** O componente de diagrama desenha a casa
  `fret - baseFret + 1` da grade. Assim o mesmo dado serve para lista, busca e áudio.
- **`baseFret`**: 1 quando todas as casas usadas estão entre 1 e 4. Caso contrário, é a
  menor casa usada, e o diagrama mostra o número dela ao lado (ex.: "3ª" no Cm).
- **Pestana**: `fromString`/`toString` usam a numeração do violão (6 = Mi grave). O dedo da
  pestana aparece como `finger: 1` em todas as cordas que ela cobre.
- **Notas** com a grafia correta do acorde: Eb–G–Bb (não D#–G–A#), F#7M com E#, Db7 com Cb.
  A interface pode trocar `#`/`b` por ♯/♭ na exibição.
- **Cifra brasileira** para sétima maior: `C7M` (o id continua `Cmaj7`).
- **Tônica enarmônica**: maiores e com sétima usam Db, Eb, Ab, Bb; menores usam C#, Eb, G#, Bb,
  que são as grafias mais comuns em songbooks. O outro nome fica em `aliases`.

### Dificuldade (calculada pelo script)

| Nível | Critério | Exemplos |
|---|---|---|
| 1 | Sem pestana e até 3 dedos | C, G, Am, E7, Cmaj7 |
| 2 | Meia pestana ou 4 dedos | C7, B7, Dm7, F simplificado |
| 3 | Pestana de 5 ou 6 cordas | F, B, Bm, Cm, Bb7 |

### Validação automática

O script recusa uma formação quando:

- alguma corda soa uma nota que não pertence ao acorde;
- falta a terça ou a sétima (a quinta pode ser omitida);
- o baixo (corda mais grave tocada) não é a tônica;
- há menos de 4 cordas soando;
- uma corda pressionada não tem dedo, ou uma corda solta/abafada tem dedo;
- a abertura passa de 5 casas;
- a pestana não cobre todas as cordas que declara.

## Conteúdo por fase

### Fase 1: iniciais (10)

As 7 do PDF mais as 3 menores essenciais para progressões.

| Cifra | Português | Formação (6ª→1ª) | Dificuldade |
|---|---|---|---|
| C | Dó | x 3 2 0 1 0 | 1 |
| D | Ré | x x 0 2 3 2 | 1 |
| E | Mi | 0 2 2 1 0 0 | 1 |
| F | Fá | 1 3 3 2 1 1 (pestana) | 3 |
| G | Sol | 3 2 0 0 0 3 | 1 |
| A | Lá | x 0 2 2 2 0 | 1 |
| B | Si | x 2 4 4 4 2 (pestana) | 3 |
| Am | Lá menor | x 0 2 2 1 0 | 1 |
| Dm | Ré menor | x x 0 2 3 1 | 1 |
| Em | Mi menor | 0 2 2 0 0 0 | 1 |

> F e B entram na fase 1 com pestana porque é como aparecem no curso. Para quem ainda não
> faz pestana, a fase 4 traz o **F simplificado** (x x 3 2 1 1), que pode ser oferecido
> como alternativa já na tela de montar treino.

### Fase 2: todos os maiores e menores (14 novos, 24 no total)

| Tônica | Maior | Menor |
|---|---|---|
| C | C · x32010 | Cm · x35543 (3ª) |
| C#/Db | Db · x46664 (4ª) | C#m · x46654 (4ª) |
| D | D · xx0232 | Dm · xx0231 |
| D#/Eb | Eb · x68886 (6ª) | Ebm · x68876 (6ª) |
| E | E · 022100 | Em · 022000 |
| F | F · 133211 | Fm · 133111 |
| F#/Gb | F# · 244322 | F#m · 244222 |
| G | G · 320003 | Gm · 355333 (3ª) |
| G#/Ab | Ab · 466544 (4ª) | G#m · 466444 (4ª) |
| A | A · x02220 | Am · x02210 |
| A#/Bb | Bb · x13331 | Bbm · x13321 |
| B | B · x24442 | Bm · x24432 |

O número entre parênteses é o `baseFret` quando o diagrama não começa na 1ª casa.

### Fase 3: com sétima (36)

| Tônica | 7 | m7 | 7M |
|---|---|---|---|
| C | C7 · x32310 | Cm7 · x35343 | C7M · x32000 |
| C#/Db | Db7 · x46464 | C#m7 · x46454 | Db7M · x46564 |
| D | D7 · xx0212 | Dm7 · xx0211 | D7M · xx0222 |
| D#/Eb | Eb7 · x68686 | Ebm7 · x68676 | Eb7M · x68786 |
| E | E7 · 020100 | Em7 · 020000 | E7M · 021100 |
| F | F7 · 131211 | Fm7 · 131111 | F7M · xx3210 |
| F#/Gb | F#7 · 242322 | F#m7 · 242222 | F#7M · 2x332x |
| G | G7 · 320001 | Gm7 · 353333 | G7M · 320002 |
| G#/Ab | Ab7 · 464544 | G#m7 · 464444 | Ab7M · 4x554x |
| A | A7 · x02020 | Am7 · x02010 | A7M · x02120 |
| A#/Bb | Bb7 · x13131 | Bbm7 · x13121 | Bb7M · x13231 |
| B | B7 · x21202 | Bm7 · x24232 | B7M · x24342 |

### Fase 4: pestanas e variações (11)

| id | Acorde | Formação | Para quê |
|---|---|---|---|
| `F-simples` | F | x x 3 2 1 1 | F sem pestana inteira, para iniciantes |
| `G-4dedos` | G | 3 2 0 0 3 3 | Facilita a troca G ↔ C e G ↔ D |
| `C-pestana3` | C | x 3 5 5 5 3 | Forma de Lá com pestana |
| `D-pestana5` | D | x 5 7 7 7 5 | Forma de Lá com pestana |
| `E-pestana7` | E | x 7 9 9 9 7 | Forma de Lá com pestana |
| `G-pestana3` | G | 3 5 5 4 3 3 | Forma de Mi com pestana |
| `A-pestana5` | A | 5 7 7 6 5 5 | Forma de Mi com pestana |
| `Am-pestana5` | Am | 5 7 7 5 5 5 | Forma de Mi menor com pestana |
| `Dm-pestana5` | Dm | x 5 7 7 6 5 | Forma de Lá menor com pestana |
| `Em-pestana7` | Em | x 7 9 9 8 7 | Forma de Lá menor com pestana |
| `Bm7-aberto` | Bm7 | x 2 0 2 0 2 | Bm7 sem pestana |

Variações aparecem na biblioteca agrupadas sob o acorde principal (`variantOf`) e podem ser
escolhidas no lugar dele ao montar um treino.

## Próximas extensões (fora do MVP)

- Mais qualidades: sus2, sus4, add9, dim, aug, 6, 9.
- Mais de uma formação por acorde na fase 4 (todas as formas CAGED).
- Escalas (RN9) ficam em outro catálogo, com outro tipo de diagrama.

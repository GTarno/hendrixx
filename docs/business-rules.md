# Regras de negócio

Fonte de verdade das regras de prática do Hendrixx. Código, testes e telas seguem este
documento; quando uma regra mudar, ela muda aqui primeiro.

O [protótipo](../prototype/metronome.html) já implementa todas as regras abaixo e serve de
referência de comportamento.

## Glossário

| Termo                       | Significado                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Tempo**                   | Uma batida do metrônomo (um clique).                                                        |
| **Compasso**                | Grupo de tempos. No MVP, sempre 4/4: 4 tempos, com acento no tempo 1.                       |
| **BPM**                     | Tempos por minuto. Duração de um tempo = `60 / bpm` segundos.                               |
| **Tempos por acorde** (`N`) | Quantos tempos cada acorde fica em destaque antes da troca.                                 |
| **Posição**                 | Cada vez que um acorde aparece na sequência tocada. Uma troca acontece a cada nova posição. |
| **Ciclo**                   | Uma passada completa pela lista de acordes, conforme a ordem escolhida.                     |
| **Contagem**                | Compasso opcional de preparação antes do primeiro acorde.                                   |

## RN1. Duração do acorde em tempos, não em segundos

A duração de cada acorde é configurada em **tempos**. O tempo em segundos é consequência do BPM.

```
duração do acorde (s) = N × 60 / bpm
```

| N   | BPM | Duração do acorde |
| --- | --- | ----------------- |
| 4   | 60  | 4 s               |
| 4   | 90  | 2,67 s            |
| 4   | 120 | 2 s               |
| 8   | 60  | 8 s               |

Mudar o BPM muda a duração em segundos, nunca a quantidade de tempos. Isso mantém a lógica
musical: o acorde sempre dura "1 compasso", "2 compassos" etc.

## RN2. Ciclo de treino

O treino é uma **lista ordenada** de acordes. Cada acorde fica `N` tempos em destaque e, ao
terminar, dá lugar ao próximo. Depois do último, o ciclo recomeça.

```
duração do ciclo (s) = posições por ciclo × N × 60 / bpm
```

Exemplo: C → D → E → F, 4 tempos, 60 bpm → 4 posições × 4 × 1 s = **16 s por ciclo**.

- Cada acorde entra na lista **uma vez só**. Repetições vêm da ordem (RN3), não da lista.
- A tela mostra sempre o **acorde atual** e o **próximo**.

## RN3. Ordem

| Ordem          | Sequência com C, D, E, F      | Posições por ciclo  |
| -------------- | ----------------------------- | ------------------- |
| **Sequencial** | C D E F · C D E F · …         | `n`                 |
| **Aleatória**  | ex.: E C F D · C F D E · …    | `n`                 |
| **Ping-pong**  | C D E F E D · C D E F E D · … | `2n − 2` (mínimo 2) |

Regras da ordem aleatória:

- Cada ciclo é uma **permutação** da lista: todos os acordes aparecem uma vez por ciclo.
- O mesmo acorde **nunca aparece duas vezes seguidas**, nem na virada de um ciclo para o
  outro (o primeiro de um ciclo é sempre diferente do último do ciclo anterior).
- Com 2 acordes, a ordem aleatória vira alternância (A B A B…). A tela avisa isso.

Regras do ping-pong:

- Ida e volta sem repetir as pontas: `C D E F E D`, depois `C D E F E D` de novo.
  O C e o F aparecem uma vez por ciclo; os acordes do meio, duas.
- Com 2 acordes, ping-pong é igual a sequencial (A B A B…).

## RN4. Condição de parada

| Parada        | Quando o treino termina                                                               |
| ------------- | ------------------------------------------------------------------------------------- |
| **Infinito**  | Só quando a pessoa toca em Parar.                                                     |
| **X ciclos**  | No tempo 1 em que começaria o ciclo `X + 1`. Ou seja, depois de `X` ciclos completos. |
| **X minutos** | No primeiro tempo 1 de troca de acorde depois de passados `X` minutos de treino.      |

- O treino termina com um clique acentuado final (o "tempo 1" de chegada), sem iniciar um acorde novo.
- Os **minutos contam só o tempo tocando**: não incluem a contagem inicial nem as pausas.
- Por minutos, o treino nunca corta um acorde no meio. Pode passar do limite em até `N` tempos.
- Limites: 1 a 99 ciclos; 1 a 60 minutos.
- Parar manualmente (em qualquer modo) leva à mesma tela de resumo do fim automático.

## RN5. Compasso, acento e momento da troca

- Compasso **4/4** no MVP (`beatsPerBar = 4`).
- O **tempo 1** de cada compasso recebe um clique **mais agudo** (acento); os tempos 2, 3 e 4,
  um clique mais grave. O visual também diferencia o tempo 1 por tamanho, não só por cor.
- A troca de acorde acontece **no início de um tempo**, alinhada ao relógio de áudio, nunca no
  meio de um tempo.
- Com `N` múltiplo de 4, **toda troca cai no tempo 1** (ver D1 para `N` = 1 e 2).

## RN6. Contagem inicial

- Opcional, ligada por padrão.
- Dura **1 compasso** (4 tempos) no BPM do treino, com acento no tempo 1.
- Durante a contagem, a tela mostra os números 1 · 2 · 3 · 4 e o **primeiro acorde** do treino
  (diagrama esmaecido e como "Próximo"), para a pessoa posicionar a mão.
- A contagem **não conta** como tempo de treino nem como ciclo.
- Ao continuar depois de uma pausa, a contagem é feita de novo, se estiver ligada.

## RN7. Limites e validação

| Campo              | Regra                         | Ao violar                                |
| ------------------ | ----------------------------- | ---------------------------------------- |
| BPM                | Inteiro de **30 a 240**       | O valor é limitado à faixa, com aviso    |
| Acordes            | **Mínimo 2**, sem repetição   | Botão Iniciar desabilitado, com o motivo |
| Tempos por acorde  | **1, 2, 4, 8 ou 16** (ver D1) | Outros valores não são oferecidos        |
| Parada por ciclos  | 1 a 99                        | O valor é limitado à faixa               |
| Parada por minutos | 1 a 60                        | O valor é limitado à faixa               |

O mínimo de 2 acordes existe porque o objetivo do app é treinar a **troca** entre acordes.

## RN8. Nomenclatura

A pessoa alterna, a qualquer momento (inclusive durante o treino), entre:

| Modo          | Exemplos                                       |
| ------------- | ---------------------------------------------- |
| **Cifra**     | C, D, Am, G7, C7M, F#m, Bb                     |
| **Português** | Dó, Ré, Lá menor, Sol 7, Dó 7M, Fá# menor, Sib |

- Notas: Dó (C), Ré (D), Mi (E), Fá (F), Sol (G), Lá (A), Si (B).
- Sétima maior usa a cifra brasileira **7M** (C7M), não "maj7".
- Os dois nomes vêm do catálogo (`labelCifra` e `labelPt`); a interface nunca monta nomes
  por conta própria. A tela de treino mostra o nome no modo escolhido em destaque e o outro
  menor, embaixo.
- A busca da biblioteca aceita os dois modos e os nomes enarmônicos (C# ou Db).

## RN9. Acordes, não escalas

O app treina **acordes**: os 12 tons combinados com os tipos (maior, menor, 7, m7, 7M e, depois,
outros). O catálogo está em [`docs/chord-catalog.md`](chord-catalog.md).

**Escalas** (maior, pentatônica etc.) são um módulo futuro, fora do MVP, com outro tipo de
diagrama (várias notas por corda ao longo do braço).

## Durante o treino

### Mudança de BPM ao vivo

- Permitida a qualquer momento, em passos de ±5 ou pelo slider.
- Vale a partir do **próximo tempo ainda não agendado**. Cliques já agendados (até ~100 ms à
  frente) mantêm o BPM anterior.
- Não reinicia o acorde nem o ciclo.

### Mudança de outras configurações

Acordes, ordem, tempos por acorde, parada e contagem **só mudam com o treino parado**. A
nomenclatura (RN8) muda a qualquer momento.

### Pausa

- Pausar silencia na hora: cliques já agendados e ainda não tocados são cancelados.
- Ao continuar, o treino recomeça **no tempo 1 do acorde atual** (alinhado ao início do
  compasso quando `N` < 4), precedido da contagem se ela estiver ligada.
- O relógio de treino não anda durante a pausa.

### Resumo ao final

Mostra ciclos completos, quantidade de trocas de acorde e duração (só tempo tocando).

```
trocas = posições tocadas − 1
```

## Precisão do metrônomo (requisito)

- O clique é agendado no relógio do `AudioContext` (Web Audio API), nunca disparado por
  `setInterval`/`setTimeout`. Um timer curto (~25 ms) só acorda o agendador, que agenda os
  cliques dos próximos ~100 ms.
- Troca de acorde e animação são derivadas do **mesmo relógio de áudio** que agenda os cliques.
- O áudio só começa após um gesto da pessoa (botão Iniciar), por causa das políticas de
  autoplay (especialmente no iOS).

## Decisões

### D1. Tempos por acorde menores que um compasso (proposta adotada, confirmar)

RN5 pede a troca no tempo 1, mas o treino sugerido "Troca rápida" usa 1 tempo por acorde.

- `N` ≥ 4: múltiplos de 4, e a tela oferece 4, 8 e 16. A troca sempre cai no tempo 1.
- `N` = 2: trocas nos tempos 1 e 3.
- `N` = 1: troca em todos os tempos.
- O acento continua só no tempo 1 do compasso.
- Valores que não dividem nem são múltiplos de 4 (3, 5, 6…) ficam fora do MVP. Se forem pedidos, a alternativa é mudar o
  compasso da sessão (3 tempos → 3/4).

### D2. Grafia das notas (decidida: grafia teórica, por ora)

O catálogo mantém a grafia teórica correta (Cb no Db7, E# no F#7M), decidida na issue #10.
A alternativa, a grafia mais comum em songbooks (B, F), pode ser revista no futuro; a mudança
seria só no script do catálogo (`tools/build-chord-catalog.mjs`).

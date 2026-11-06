# Protótipo: metrônomo + sessão de treino

`metronome.html` é um arquivo único, sem dependências de build, para validar a experiência
antes de levar para Angular. Abra direto no navegador.

O que ele já valida:

- Clique gerado por oscilador da Web Audio API e agendado no relógio do `AudioContext`.
- Scheduler com lookahead: acorda a cada 25 ms (Web Worker) e agenda os cliques dos
  próximos 100 ms. Nenhum `setInterval` dispara o clique.
- Animação (pêndulo, pontos de tempo, barra até a troca) lida do relógio de áudio a cada quadro.
- Ciclo padrão C → D → E → F a 60 bpm, 4 tempos por acorde, compasso 4/4 com acento no tempo 1.
- Contagem inicial de 1 compasso, ordem sequencial/aleatória/ping-pong, parada por ciclos ou
  minutos, BPM ao vivo (±5, slider, tap tempo), nomenclatura cifra/português, pausa que
  retoma no tempo 1 do acorde atual, resumo ao final.

Os 10 acordes da fase 1 estão embutidos no arquivo, copiados de `data/chords.json`.
Se o catálogo mudar, atualize a constante `CHORDS` no script.

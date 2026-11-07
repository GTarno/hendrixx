# Teste em aparelhos reais

O metrônomo é testado de forma automática com um relógio de áudio simulado, mas som, tela
acesa e layout só podem ser confirmados num aparelho de verdade. Este roteiro serve para isso.

App publicado: **https://gtarno.github.io/hendrixx/** (atualizado a cada merge na `main`).

## Como testar

Use o treino padrão (C → D → E → F, 4 tempos, com contagem) e um volume confortável.

### 1. Início do áudio

- [ ] Tocar em **Iniciar** começa a contagem com som já no primeiro clique.
- [ ] O tempo 1 de cada compasso soa mais agudo que os outros.
- [ ] Depois de **Parar** e **Treinar de novo**, o som volta normalmente.

No iPhone, o áudio só pode começar depois de um toque da pessoa; o botão Iniciar é esse toque.
Se o iPhone estiver no modo silencioso, o Safari pode não tocar som nenhum: confira a chave
lateral antes de concluir que há um problema.

### 2. Precisão

Compare com um metrônomo de referência (um aplicativo de metrônomo em outro aparelho, ou um
metrônomo físico) no mesmo BPM. Comece os dois juntos e ouça por **1 minuto**.

- [ ] **60 bpm:** os cliques continuam juntos depois de 1 minuto.
- [ ] **120 bpm:** idem.
- [ ] **200 bpm:** idem.

Anote quanto um se afastou do outro ao fim do minuto ("juntos", "meio tempo", "um tempo").
Um afastamento crescente indica problema de precisão; uma diferença fixa desde o início é só
a diferença de quando cada um começou.

### 3. Visual alinhado ao som

- [ ] O pêndulo chega ao extremo exatamente quando o clique soa.
- [ ] O ponto do tempo acende junto com o clique.
- [ ] A troca de acorde acontece no clique acentuado (tempo 1).

### 4. Aba em segundo plano e tela bloqueada

- [ ] Trocar de aba por alguns segundos e voltar: o som continuou e a tela se ressincroniza.
- [ ] Durante o treino, a tela **não apaga sozinha** (tela sempre acesa).
- [ ] Na pausa e no fim, a tela volta a apagar no tempo normal do aparelho.
- [ ] Bloquear a tela durante o treino: anote se o som continua ou para.

Esperado: celulares costumam suspender o áudio de páginas com a tela bloqueada, então parar ao
bloquear não é defeito do app. Ao desbloquear, use **Pausar** e **Continuar** para retomar.

### 5. Layout

- [ ] **Em pé:** acorde atual, próximo acorde, tempos, BPM e botões cabem na tela sem rolar.
- [ ] **Deitado:** o layout passa para duas colunas e tudo fica legível.
- [ ] O nome do acorde e o diagrama são legíveis a cerca de 1 m de distância.
- [ ] O tema da tela de treino é escuro e o botão ☀/☾ troca para o claro.
- [ ] Todos os botões são fáceis de tocar com o polegar.

### 6. Instalação e uso sem internet (PWA)

Instale o app pela página publicada:

- **Android (Chrome):** menu ⋮ → **Instalar app** (ou **Adicionar à tela inicial**).
- **iPhone (Safari):** botão **Compartilhar** → **Adicionar à Tela de Início**.
- **Desktop (Chrome/Edge):** ícone de instalar na barra de endereço.

- [ ] O ícone do Hendrixx (metrônomo âmbar) aparece na tela inicial.
- [ ] O app abre em tela própria, sem a barra do navegador.
- [ ] Com o **modo avião** ligado, o app abre e roda um treino completo.
- [ ] Depois de publicar uma versão nova, ao abrir o app aparece o aviso **Há uma versão nova do
      Hendrixx** com o botão **Atualizar** (o aviso nunca aparece no meio de um treino).

Abra o app uma vez com internet antes de testar o modo avião: é nessa primeira visita que ele
fica guardado no aparelho.

### 7. Desktop (só no computador)

- [ ] Botão ⛶ e tecla **F** entram e saem da tela cheia.
- [ ] Atalhos: **Espaço** pausa, **Esc** para, **↑/↓** mudam o BPM, **N** troca cifra/português.

## Resultados

Preencha uma linha por aparelho testado. Use ✅ (ok), ⚠️ (funciona com ressalva) ou ❌ (falhou)
e descreva ressalvas e falhas nas observações.

| Data | Aparelho | Sistema e navegador | 1. Início | 2. Precisão (60/120/200) | 3. Visual | 4. Segundo plano | 5. Layout | 6. PWA | 7. Desktop | Observações |
| ---- | -------- | ------------------- | --------- | ------------------------ | --------- | ---------------- | --------- | ------ | ---------- | ----------- |
|      |          |                     |           |                          |           |                  |           |        |            |             |

Navegadores a cobrir: Chrome no desktop, Safari no iOS e Chrome no Android.

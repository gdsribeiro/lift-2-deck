# GDD: Fitness Score

**Version**: 1.0
**Data**: 2026-03-28
**Status**: Design -- aguardando implementacao

---

## 1. Visao Geral

### Proposito
Substituir o stat "volume semanal" do dashboard por um **score composto unico** que recompensa consistencia acima de intensidade. O score deve funcionar como um sistema de progressao de jogo: acessivel para iniciantes, escalavel para avancados, e com decay suave que incentiva retorno em vez de punir ausencia.

### Fantasia do Jogador
"Eu estou ficando mais forte e mais disciplinado -- o numero prova isso."

### Pilares de Design
1. **Consistencia acima de intensidade** -- treinar 4x/semana vale mais que uma sessao monstruosa
2. **Progresso visivel** -- o usuario deve sentir melhora semana a semana
3. **Recuperacao acolhedora** -- voltar apos pausa deve parecer "bem-vindo de volta", nao punicao
4. **Honestidade** -- o score reflete esforco real, sem inflacao artificial

---

## 2. Escala e Justificativa

### Escala escolhida: 0-100

**Por que 0-100 e nao XP infinito ou 0-1000?**

| Escala     | Pros                           | Contras                                |
|------------|--------------------------------|----------------------------------------|
| 0-100      | Intuitivo, "nota", facil comparar semana a semana | Teto pode desmotivar top users |
| 0-1000     | Mais granular                  | Numeros grandes perdem significado      |
| XP infinito| Sempre subindo                 | Sem referencia, infla infinitamente     |

A escala 0-100 funciona como "nota de saude da semana". O teto de 100 e aspiracional mas atingivel -- um usuario avancado e consistente alcanca 85-95. Atingir 100 requer uma semana excepcional. Isso cria o "just one more" sem criar inflacao.

### Faixas de Score

| Faixa   | Label         | Significado                                |
|---------|---------------|--------------------------------------------|
| 0-19    | Iniciando     | Primeira semana ou retorno apos pausa longa |
| 20-39   | Aquecendo     | Treinou pouco mas esta presente             |
| 40-59   | No Ritmo      | Consistencia media, bom inicio              |
| 60-79   | Em Forma      | Consistencia alta, boa variedade            |
| 80-94   | Excelente     | Semana muito completa                       |
| 95-100  | Semana Perfeita | Raro. Tudo alinhado.                      |

---

## 3. Formula

### Componentes e Pesos

```
FITNESS_SCORE = (
    CONSISTENCY_SCORE   * 0.40  +
    VOLUME_SCORE        * 0.20  +
    VARIETY_SCORE        * 0.15  +
    CARDIO_SCORE        * 0.10  +
    STREAK_BONUS        * 0.10  +
    IMPROVEMENT_BONUS   * 0.05
) * DECAY_MULTIPLIER
```

**Peso total: 1.00**

A consistencia responde por 40% do score total -- este e o pilar de design numero 1.

### 3.1 CONSISTENCY_SCORE (peso: 0.40)

Mede quantos dias unicos o usuario treinou na semana.

```
CONSISTENCY_SCORE = min(days_trained / CONSISTENCY_TARGET, 1.0) * 100
```

| Variavel           | Valor Base | Min | Max | Notas de Tuning                          |
|--------------------|------------|-----|-----|------------------------------------------|
| CONSISTENCY_TARGET | 4          | 3   | 6   | [PLACEHOLDER] -- meta configuravel pelo usuario |

**Curva de pontuacao por dias:**

| days_trained | Score (target=4) |
|--------------|------------------|
| 0            | 0                |
| 1            | 25               |
| 2            | 50               |
| 3            | 75               |
| 4+           | 100              |

**Decisao de design:** Sem bonus por treinar alem do target. Isso e intencional -- nao queremos recompensar overtraining. Treinar 7 dias rende o mesmo que 4 neste componente. O beneficio extra aparece no volume e variedade.

### 3.2 VOLUME_SCORE (peso: 0.20)

Compara o volume da semana atual com a media movel das ultimas 4 semanas do usuario.

```
volume_ratio = total_volume / personal_avg_volume_4w
VOLUME_SCORE = min(volume_ratio, 1.5) / 1.5 * 100
```

| Variavel                | Valor Base | Min  | Max  | Notas de Tuning                           |
|-------------------------|------------|------|------|-------------------------------------------|
| personal_avg_volume_4w  | calculado  | --   | --   | Media movel 4 semanas do proprio usuario  |
| volume_ratio_cap        | 1.5        | 1.2  | 2.0  | Cap evita que 1 sessao absurda domine     |

**Por que relativo e nao absoluto?** Um iniciante levantando 500kg de volume total na semana e tao valido quanto um avancado levantando 15.000kg. A comparacao e consigo mesmo.

**Edge case -- novo usuario sem historico:** Usa benchmark de 2000 kg*reps como baseline inicial (equivalente a ~3 sessoes leves). Esse valor e substituido pela media real apos a segunda semana.

| Variavel              | Valor Base | Min  | Max   | Notas de Tuning                       |
|-----------------------|------------|------|-------|---------------------------------------|
| new_user_volume_base  | 2000       | 1000 | 5000  | [PLACEHOLDER] -- testar com usuarios reais |

### 3.3 VARIETY_SCORE (peso: 0.15)

Recompensa variedade de exercicios para evitar monotonia e promover treino equilibrado.

```
VARIETY_SCORE = min(unique_exercises / VARIETY_TARGET, 1.0) * 100
```

| Variavel        | Valor Base | Min | Max | Notas de Tuning                         |
|-----------------|------------|-----|-----|-----------------------------------------|
| VARIETY_TARGET  | 8          | 5   | 15  | [PLACEHOLDER] -- 8 exercicios diferentes/semana |

| unique_exercises | Score (target=8) |
|------------------|------------------|
| 1-2              | 12-25            |
| 3-4              | 37-50            |
| 5-6              | 62-75            |
| 7                | 87               |
| 8+               | 100              |

### 3.4 CARDIO_SCORE (peso: 0.10)

Componente dedicado a cardio para usuarios que fazem treino hibrido.

```
CARDIO_SCORE = min(cardio_minutes / CARDIO_TARGET, 1.0) * 100
```

| Variavel       | Valor Base | Min | Max | Notas de Tuning                     |
|----------------|------------|-----|-----|-------------------------------------|
| CARDIO_TARGET  | 60         | 30  | 150 | [PLACEHOLDER] -- 60 min/semana      |

**Edge case -- usuario que so faz musculacao:** O peso de cardio e apenas 10%. Um usuario que ignora cardio completamente perde no maximo 10 pontos. Isso e intencional -- o score nao deve punir quem tem foco diferente, mas deve recompensar quem faz ambos.

**Edge case -- usuario de cardio puro:** Sem volume de forca, perde os 20% de VOLUME_SCORE. Mas ganha em consistencia (40%), cardio (10%), e variedade se faz diferentes tipos de cardio. Score maximo realista: ~70-75. Isso e justo -- o app e focado em gym tracking.

### 3.5 STREAK_BONUS (peso: 0.10)

Recompensa consistencia de longo prazo (dias consecutivos treinando com no maximo 1 dia de descanso entre sessoes).

```
STREAK_BONUS = min(streak / STREAK_TARGET, 1.0) * 100
```

| Variavel      | Valor Base | Min | Max | Notas de Tuning                      |
|---------------|------------|-----|-----|--------------------------------------|
| STREAK_TARGET | 14         | 7   | 30  | [PLACEHOLDER] -- 2 semanas de streak |

A curva satura em 14 dias (2 semanas). Isso garante que o streak contribua para o score mas nao domine.

### 3.6 IMPROVEMENT_BONUS (peso: 0.05)

Micro-bonus por "tendencia positiva" -- compara o score parcial desta semana com o da semana anterior.

```
if current_week_base_score > last_week_score:
    IMPROVEMENT_BONUS = 100
else:
    IMPROVEMENT_BONUS = max(0, 50 + (current_week_base_score - last_week_score))
```

**Decisao de design:** Este componente vale apenas 5% (5 pontos no maximo). Seu proposito e psicologico -- sentir que "estou melhorando" reforca o loop de motivacao. Nao queremos que isso distorca o score.

### 3.7 DECAY_MULTIPLIER

Aplicado quando o usuario nao treina por dias consecutivos DENTRO da semana.

```
days_since_last_session = dias desde a ultima sessao (dentro da semana atual)

if days_since_last_session <= 1:
    DECAY_MULTIPLIER = 1.0       // sem decay
elif days_since_last_session == 2:
    DECAY_MULTIPLIER = 0.95      // -5%
elif days_since_last_session == 3:
    DECAY_MULTIPLIER = 0.90      // -10%
elif days_since_last_session >= 4:
    DECAY_MULTIPLIER = 0.85      // -15% cap
```

| Variavel            | Valor Base | Min  | Max  | Notas de Tuning                        |
|---------------------|------------|------|------|----------------------------------------|
| decay_floor         | 0.85       | 0.70 | 0.95 | [PLACEHOLDER] -- nunca perde mais que 15% |
| decay_step          | 0.05       | 0.03 | 0.10 | [PLACEHOLDER] -- perda por dia de ausencia |

**Decisao de design critica:** O decay e SUAVE e tem floor. O score nunca pode ficar zerado por inatividade dentro da semana. Isso implementa o pilar "recuperacao acolhedora". O pior cenario e perder 15% do score calculado.

**O decay NAO se aplica entre semanas.** Cada semana comeca zerada. O historico mostra o que aconteceu, mas a nova semana e uma pagina em branco.

---

## 4. Simulacoes

### Cenario A: Usuario Consistente Intermediario
```
days_trained: 4, total_volume: 8000 (media 4w: 7500), unique_exercises: 10,
cardio_minutes: 45, streak: 8, last_week_score: 68, days_since_last: 0

CONSISTENCY  = min(4/4, 1) * 100 = 100  * 0.40 = 40.0
VOLUME       = min(8000/7500, 1.5)/1.5 * 100 = min(1.07, 1.5)/1.5 * 100 = 71.1  * 0.20 = 14.2
VARIETY      = min(10/8, 1) * 100 = 100  * 0.15 = 15.0
CARDIO       = min(45/60, 1) * 100 = 75   * 0.10 = 7.5
STREAK       = min(8/14, 1) * 100 = 57.1  * 0.10 = 5.7
IMPROVEMENT  = 100 (score subiu)   * 0.05 = 5.0
DECAY        = 1.0

TOTAL = (40.0 + 14.2 + 15.0 + 7.5 + 5.7 + 5.0) * 1.0 = 87.4
```
**Label: Excelente.** Faz sentido para alguem que treinou 4 dias, boa variedade, algum cardio.

### Cenario B: Uma Sessao Pesada Unica
```
days_trained: 1, total_volume: 15000 (media 4w: 7500), unique_exercises: 5,
cardio_minutes: 0, streak: 1, days_since_last: 4

CONSISTENCY  = min(1/4, 1) * 100 = 25   * 0.40 = 10.0
VOLUME       = min(15000/7500, 1.5)/1.5 * 100 = 100  * 0.20 = 20.0
VARIETY      = min(5/8, 1) * 100 = 62.5  * 0.15 = 9.4
CARDIO       = 0                   * 0.10 = 0.0
STREAK       = min(1/14, 1) * 100 = 7.1   * 0.10 = 0.7
IMPROVEMENT  = 0 (score caiu)      * 0.05 = 0.0
DECAY        = 0.85

TOTAL = (10.0 + 20.0 + 9.4 + 0.0 + 0.7 + 0.0) * 0.85 = 34.1
```
**Label: Aquecendo.** Mesmo com volume absurdo, a consistencia baixa limita o score. Isso e intencional.

### Cenario C: Iniciante Primeira Semana
```
days_trained: 2, total_volume: 1200 (sem historico, usa baseline 2000),
unique_exercises: 4, cardio_minutes: 20, streak: 2, days_since_last: 0

CONSISTENCY  = min(2/4, 1) * 100 = 50   * 0.40 = 20.0
VOLUME       = min(1200/2000, 1.5)/1.5 * 100 = 40  * 0.20 = 8.0
VARIETY      = min(4/8, 1) * 100 = 50    * 0.15 = 7.5
CARDIO       = min(20/60, 1) * 100 = 33.3 * 0.10 = 3.3
STREAK       = min(2/14, 1) * 100 = 14.3  * 0.10 = 1.4
IMPROVEMENT  = 100 (primeira semana, sempre bonus) * 0.05 = 5.0
DECAY        = 1.0

TOTAL = (20.0 + 8.0 + 7.5 + 3.3 + 1.4 + 5.0) * 1.0 = 45.2
```
**Label: No Ritmo.** Um iniciante treinando 2x/semana ja entra em "No Ritmo". Isso e motivador -- nao comeca do zero.

### Cenario D: Retorno Apos 3 Semanas Parado
```
days_trained: 1, total_volume: 3000 (media 4w inclui semanas zero: 1500),
unique_exercises: 6, cardio_minutes: 0, streak: 1, days_since_last: 0

CONSISTENCY  = min(1/4, 1) * 100 = 25   * 0.40 = 10.0
VOLUME       = min(3000/1500, 1.5)/1.5 * 100 = 100  * 0.20 = 20.0
VARIETY      = min(6/8, 1) * 100 = 75    * 0.15 = 11.3
CARDIO       = 0                   * 0.10 = 0.0
STREAK       = min(1/14, 1) * 100 = 7.1   * 0.10 = 0.7
IMPROVEMENT  = 100                 * 0.05 = 5.0
DECAY        = 1.0

TOTAL = (10.0 + 20.0 + 11.3 + 0.0 + 0.7 + 5.0) * 1.0 = 47.0
```
**Label: No Ritmo.** Um unico treino apos 3 semanas ja coloca em "No Ritmo". O volume relativo a media recente (que inclui semanas zero) ajuda aqui. Mensagem: "Bem-vindo de volta."

---

## 5. Feedback Visual

### 5.1 Cores por Faixa

| Faixa      | Cor Principal   | CSS Variable                | Hex       |
|------------|----------------|-----------------------------|-----------|
| 0-19       | Cinza neutro   | --score-color-starting      | #6b7280   |
| 20-39      | Azul frio      | --score-color-warming       | #60a5fa   |
| 40-59      | Amarelo        | --score-color-rhythm        | #fbbf24   |
| 60-79      | Verde lima     | --score-color-fit           | #a3e635   |
| 80-94      | Verde brilhante| --score-color-excellent     | #22c55e   |
| 95-100     | Dourado        | --score-color-perfect       | #f59e0b   |

### 5.2 Componente Visual no Dashboard

O score substitui o card "volume semanal" e ganha destaque visual:

```
+------------------------------------------+
|                                          |
|          FITNESS SCORE                   |
|                                          |
|             [ 87 ]          <-- numero grande, cor por faixa
|           Excelente         <-- label da faixa
|                                          |
|    [============================--]      <-- barra de progresso
|                                          |
|    Consistencia  ████████████  40/40     |
|    Volume        ███████░░░░░  14/20     |
|    Variedade     ████████████  15/15     |
|    Cardio        ██████░░░░░░   8/10     |
|    Streak        ████░░░░░░░░   6/10     |
|    Melhoria      ██████████░░   5/5      |
|                                          |
|    vs semana passada: +12 pts  (seta)    |
|                                          |
+------------------------------------------+
```

### 5.3 Animacoes e Micro-Interacoes

**Ao carregar o dashboard:**
- O numero anima de 0 ate o valor final com easing (cubic-bezier, ~800ms)
- A barra de progresso preenche com delay de 200ms apos o numero
- As sub-barras aparecem em cascade (50ms de delay entre cada)

**Ao atingir threshold de faixa:**
- Transicao de cor com fade suave (300ms)
- Se subiu de faixa: pulse animation no numero (scale 1.0 -> 1.1 -> 1.0)
- Se atingiu 95+: shimmer/glow effect dourado sutil

**Ao tocar/clicar no score:**
- Expande para mostrar breakdown detalhado (as sub-barras)
- Estado colapsado mostra apenas o numero e label

**Delta vs semana passada:**
- Seta verde para cima se melhorou, vermelha para baixo se caiu
- "+12 pts" em verde ou "-5 pts" em vermelho com cor suave (nao agressiva)

### 5.4 Notificacoes Contextuais (dentro do app, nao push)

| Trigger                    | Mensagem                                          |
|----------------------------|---------------------------------------------------|
| Score subiu de faixa       | "Voce subiu para [Faixa]! Continue assim."        |
| Score >= 80 pela 1a vez    | "Excelente! Sua melhor semana ate agora."          |
| Primeira semana do usuario | "Seu primeiro Fitness Score: [X]. Cada treino conta." |
| Retorno apos >= 7 dias     | "Bem-vindo de volta! Vamos reconstruir juntos."   |
| Score caiu vs semana passada| "Semana mais leve -- tudo bem. Consistencia e o que importa." |

---

## 6. Edge Cases

### 6.1 Novo Usuario -- Primeira Semana
- **personal_avg_volume_4w** nao existe. Usa `new_user_volume_base = 2000`.
- **last_week_score** nao existe. IMPROVEMENT_BONUS = 100 (bonus total -- recompensar o inicio).
- **streak** comeca em 0 naturalmente.
- **Mensagem especial:** "Seu primeiro Fitness Score!"

### 6.2 Retorno Apos Pausa Longa (>= 2 semanas sem treinar)
- **personal_avg_volume_4w** inclui semanas com 0, baixando a media. Isso AJUDA o volume_ratio -- o usuario que volta e treina com metade do que fazia antes ainda pontua bem.
- **streak** resetou para 0 -- comeca a reconstruir.
- **IMPROVEMENT_BONUS** = 100 (qualquer treino apos inatividade e melhoria).
- **Mensagem:** "Bem-vindo de volta! Vamos reconstruir juntos."

### 6.3 Usuario de Cardio Puro
- **total_volume** = 0. VOLUME_SCORE = 0.
- **Teto realista:** ~75 pontos (40 consistencia + 0 volume + 15 variedade + 10 cardio + 10 streak).
- Isso e justo -- o app e um gym tracker. O score reflete isso sem punir excessivamente.

### 6.4 Semana com Apenas 1 Sessao Muito Longa
- **days_trained** = 1 -> CONSISTENCY_SCORE = 25 -> contribuicao = 10 pontos de 40 possiveis.
- Mesmo com volume e variedade altos, o teto realista e ~55. Mensagem clara: consistencia > intensidade.

### 6.5 Overtraining (7 dias/semana)
- CONSISTENCY_SCORE = 100 (cap em target), sem bonus extra.
- Volume e variedade provavelmente altos, entao score sera alto naturalmente.
- Mas nao ha incentivo mecanico para treinar 7 dias vs 4. O sistema nao recompensa overtraining.

### 6.6 Semana Incompleta (meio da semana)
- O score e calculado em tempo real com os dados disponiveis ate o momento.
- Exibir como "Score parcial" com icone de relogio quando a semana nao terminou.
- Projecao opcional: "Se voce treinar mais [X] dias, pode chegar a [Y]."

---

## 7. Historico de Scores

### Deve ser visivel? Sim.

O historico de scores semanais e essencial para o long-term loop de retencao.

### Estrutura de Dados

```typescript
interface WeeklyFitnessScore {
  week_start: string;       // ISO date (segunda-feira)
  week_end: string;         // ISO date (domingo)
  total_score: number;      // 0-100
  tier: ScoreTier;          // "starting" | "warming" | "rhythm" | "fit" | "excellent" | "perfect"
  breakdown: {
    consistency: number;    // contribuicao final (0-40)
    volume: number;         // contribuicao final (0-20)
    variety: number;        // contribuicao final (0-15)
    cardio: number;         // contribuicao final (0-10)
    streak: number;         // contribuicao final (0-10)
    improvement: number;    // contribuicao final (0-5)
  };
  decay_applied: number;    // 0.85 - 1.0
  delta_vs_previous: number | null; // diferenca vs semana anterior
  raw_data: {
    days_trained: number;
    total_volume: number;
    unique_exercises: number;
    cardio_minutes: number;
    streak: number;
  };
}

type ScoreTier = "starting" | "warming" | "rhythm" | "fit" | "excellent" | "perfect";
```

### Visualizacao do Historico

**Grafico de barras verticais** das ultimas 12 semanas, com cor por faixa:

```
100|
 80|          ██  ██
 60|      ██  ██  ██  ██
 40|  ██  ██  ██  ██  ██  ██
 20|  ██  ██  ██  ██  ██  ██  ██
  0|--+---+---+---+---+---+---+---
    S1  S2  S3  S4  S5  S6  S7  S8
```

- Cada barra colorida pela faixa daquela semana
- Ao tocar uma barra, mostra breakdown detalhado
- Linha horizontal tracejada mostrando a media das 12 semanas

### Onde Exibir
- **Dashboard:** Score atual (prominente) + mini sparkline das ultimas 4 semanas
- **Pagina de Evolucao:** Historico completo com 12+ semanas e breakdown por componente

---

## 8. Modelo de Dados e API

### Endpoint Atualizado: GET /dashboard/stats

```typescript
// Resposta atualizada
interface DashboardStats {
  days_this_week: number;
  weekly_volume: number;
  streak: number;
  fitness_score: {
    total: number;
    tier: ScoreTier;
    breakdown: {
      consistency: number;
      volume: number;
      variety: number;
      cardio: number;
      streak: number;
      improvement: number;
    };
    decay_applied: number;
    delta_vs_previous: number | null;
    is_partial_week: boolean;
  };
}
```

### Novo Endpoint: GET /dashboard/score-history?weeks=12

```typescript
interface ScoreHistoryResponse {
  scores: WeeklyFitnessScore[];
}
```

---

## 9. Tuning Levers -- Resumo

Todos os valores marcados como [PLACEHOLDER] para ajuste em playtesting:

| Lever                  | Valor Atual | Efeito ao Aumentar              | Efeito ao Diminuir              |
|------------------------|-------------|----------------------------------|----------------------------------|
| CONSISTENCY_TARGET     | 4 dias      | Score de consistencia mais dificil | Mais facil atingir max          |
| VARIETY_TARGET         | 8 exercicios| Exige mais variedade             | Mais facil atingir max          |
| CARDIO_TARGET          | 60 min      | Exige mais cardio                | Mais facil para quem faz pouco  |
| STREAK_TARGET          | 14 dias     | Streak demora mais pra saturar   | Satura rapido, menos impacto    |
| new_user_volume_base   | 2000        | Iniciante pontua menos em volume | Iniciante pontua mais           |
| volume_ratio_cap       | 1.5         | Volume extremo vale mais         | Volume extremo vale menos       |
| decay_floor            | 0.85        | Menos punitivo                   | Mais punitivo                   |
| decay_step             | 0.05        | Decay mais agressivo por dia     | Decay mais suave                |

### Meta de Distribuicao Alvo

Apos tuning, a distribuicao ideal de scores entre usuarios ativos seria:

| Faixa        | % usuarios alvo |
|--------------|-----------------|
| 0-19         | 5%              |
| 20-39        | 15%             |
| 40-59        | 35%             |
| 60-79        | 30%             |
| 80-94        | 12%             |
| 95-100       | 3%              |

---

## 10. Dependencias

| Sistema          | Dependencia                                           |
|------------------|-------------------------------------------------------|
| WorkoutSession   | Leitura de sessions da semana para calcular days_trained, total_volume |
| WorkoutLog       | Leitura de logs para calcular volume (weight_kg * reps), unique_exercises, cardio_minutes |
| Streak           | Valor ja calculado no backend atual                   |
| Evolution API    | Historico de volume para calcular personal_avg_volume_4w |
| Dashboard API    | Endpoint existente precisa ser estendido              |

---

## Changelog

| Versao | Data       | Mudanca                    |
|--------|------------|----------------------------|
| 1.0    | 2026-03-28 | Documento inicial completo |

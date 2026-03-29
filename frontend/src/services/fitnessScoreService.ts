/**
 * FitPoints — Média ponderada móvel com janelas de 7 e 30 dias.
 *
 * Últimos 7 dias: 70% do peso
 * Dias 8-30: 30% do peso
 * Acima de 30 dias: ignorado
 *
 * Componentes:
 *   Consistência (0-40) — sessões / meta
 *   Volume Relativo (0-25) — volume / média 30d
 *   Progressão (0-15) — delta 7d vs 30d
 *   Diversidade (0-10) — grupos musculares distintos
 *   Bônus (0-10) — streak + milestones
 */

import type { ScoreTier } from "../types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const SCORE_CONFIG = {
  /** Meta de sessões por semana (usado para escalar consistência) */
  SESSIONS_TARGET: 4,
  /** Teto de grupos musculares para diversidade máxima */
  DIVERSITY_TARGET: 5,
  /** Peso da janela de 7 dias */
  WEIGHT_7D: 0.7,
  /** Peso da janela de 8-30 dias */
  WEIGHT_30D: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

const TIER_THRESHOLDS: readonly { min: number; tier: ScoreTier; label: string }[] = [
  { min: 85, tier: "imparavel", label: "Imparável" },
  { min: 70, tier: "forte", label: "Forte" },
  { min: 50, tier: "no-ritmo", label: "No Ritmo" },
  { min: 30, tier: "aquecendo", label: "Aquecendo" },
  { min: 0, tier: "retomando", label: "Retomando" },
];

export function getTier(score: number): { tier: ScoreTier; label: string } {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  for (const t of TIER_THRESHOLDS) {
    if (clamped >= t.min) return { tier: t.tier, label: t.label };
  }
  return { tier: "retomando", label: "Retomando" };
}

export function getTierColor(tier: ScoreTier): string {
  const colors: Record<ScoreTier, string> = {
    retomando: "#a8a29e",
    aquecendo: "#f97316",
    "no-ritmo": "#eab308",
    forte: "#818cf8",
    imparavel: "#22c55e",
  };
  return colors[tier];
}

// ---------------------------------------------------------------------------
// Input para cada janela temporal
// ---------------------------------------------------------------------------

export interface WindowInput {
  sessions: number;
  total_volume: number;
  muscle_groups: number;
  has_cardio_30min: boolean;
  had_pr: boolean;
}

export interface ScoreInput {
  /** Dados dos últimos 7 dias */
  last_7d: WindowInput;
  /** Dados dos dias 8-30 */
  prev_30d: WindowInput;
  /** Streak em semanas consecutivas com >= 2 sessões */
  streak_weeks: number;
  /** Score do período anterior (para calcular delta) */
  previous_score: number | null;
}

export interface ScoreBreakdown {
  consistency: number;
  relativeVolume: number;
  progression: number;
  diversity: number;
  bonus: number;
}

export interface ScoreResult {
  total: number;
  tier: ScoreTier;
  label: string;
  color: string;
  breakdown: ScoreBreakdown;
  delta: number | null;
}

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function calcWindowScore(w: WindowInput, refVolume: number): {
  consistency: number;
  relativeVolume: number;
  diversity: number;
} {
  // Consistência: sessões / meta semanal (escala para a janela)
  const consistency = clamp(w.sessions / SCORE_CONFIG.SESSIONS_TARGET, 0, 1) * 40;

  // Volume relativo: volume / referência
  const ref = refVolume > 0 ? refVolume : 1;
  const relativeVolume = clamp(w.total_volume / ref, 0, 1) * 25;

  // Diversidade: grupos musculares / meta
  const diversity = clamp(w.muscle_groups / SCORE_CONFIG.DIVERSITY_TARGET, 0, 1) * 10;

  return { consistency, relativeVolume, diversity };
}

export function calculateFitPoints(input: ScoreInput): ScoreResult {
  // Volume de referência = média diária dos últimos 30 dias, projetada para 7 dias
  const totalVolume30d = input.last_7d.total_volume + input.prev_30d.total_volume;
  const avgDailyVolume = totalVolume30d / 30;
  const refVolume7d = avgDailyVolume * 7;

  // Score de cada janela
  const score7d = calcWindowScore(input.last_7d, refVolume7d);
  const score30d = calcWindowScore(input.prev_30d, refVolume7d);

  // Média ponderada por janela
  const W7 = SCORE_CONFIG.WEIGHT_7D;
  const W30 = SCORE_CONFIG.WEIGHT_30D;

  const consistency = score7d.consistency * W7 + score30d.consistency * W30;
  const relativeVolume = score7d.relativeVolume * W7 + score30d.relativeVolume * W30;
  const diversity = score7d.diversity * W7 + score30d.diversity * W30;

  // Progressão: delta entre 7d e média 30d (0=regressão, 7.5=neutro, 15=progresso)
  const vol7d = input.last_7d.total_volume;
  const vol30dWeekly = (input.prev_30d.total_volume / 23) * 7; // média semanal dos dias 8-30
  const deltaPct = vol30dWeekly > 0 ? ((vol7d - vol30dWeekly) / vol30dWeekly) * 100 : 0;
  const progression = clamp(deltaPct / 5, -1, 1) * 7.5 + 7.5;

  // Bônus: streak + milestones
  let streakBonus = 0;
  if (input.streak_weeks >= 8) streakBonus = 7;
  else if (input.streak_weeks >= 4) streakBonus = 5;
  else if (input.streak_weeks >= 2) streakBonus = 3;

  let milestoneBonus = 0;
  if (input.last_7d.had_pr) milestoneBonus += 2;
  if (input.last_7d.has_cardio_30min) milestoneBonus += 1;
  milestoneBonus = Math.min(milestoneBonus, 3);

  const bonus = Math.min(streakBonus + milestoneBonus, 10);

  const total = clamp(Math.round(consistency + relativeVolume + progression + diversity + bonus), 0, 100);

  const { tier, label } = getTier(total);
  const color = getTierColor(tier);

  const delta = input.previous_score !== null ? total - input.previous_score : null;

  return {
    total,
    tier,
    label,
    color,
    breakdown: {
      consistency: Math.round(consistency * 10) / 10,
      relativeVolume: Math.round(relativeVolume * 10) / 10,
      progression: Math.round(progression * 10) / 10,
      diversity: Math.round(diversity * 10) / 10,
      bonus: Math.round(bonus * 10) / 10,
    },
    delta,
  };
}

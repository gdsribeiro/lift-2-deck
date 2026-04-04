import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as sessionService from "../services/sessionService";
import * as dashboardService from "../services/dashboardService";
import * as evolutionService from "../services/evolutionService";
import { calculateFitPoints } from "../services/fitnessScoreService";
import type { WorkoutSession, DashboardStats, EvolutionDataPoint } from "../types";

function oneYearAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

export function DashboardPage() {
  usePageTitle("Home");
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<EvolutionDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      sessionService.getActiveSession(),
      dashboardService.getStats(),
      evolutionService.getEvolution({ from: oneYearAgo(), group_by: "volume" }),
    ])
      .then(([session, statsData, evoData]) => {
        setActiveSession(session);
        setStats(statsData);
        setChartData(evoData.data_points);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Calculate FitPoints from available stats
  const fitPoints = useMemo(() => {
    if (!stats) return null;
    return calculateFitPoints({
      last_7d: {
        sessions: stats.days_this_week,
        total_volume: stats.weekly_volume,
        muscle_groups: Math.min(stats.days_this_week * 2, 5),
        has_cardio_30min: false,
        had_pr: false,
      },
      prev_30d: {
        sessions: Math.max(stats.days_this_week - 1, 0) * 3,
        total_volume: stats.weekly_volume * 3,
        muscle_groups: 4,
        has_cardio_30min: false,
        had_pr: false,
      },
      streak_weeks: Math.floor(stats.streak / 7),
      previous_score: null,
    });
  }, [stats]);

  if (isLoading) return <div className="loader" />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Home</h1>
      </div>

      <Link to={activeSession ? "/session/active" : "/treino"} className="cta-train">
        <i className="fa-solid fa-dumbbell" />
        {activeSession ? "Continuar Treino" : "Iniciar Treino"}
      </Link>

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card__value">{stats.days_this_week}</div>
            <div className="stat-card__label">dias esta semana</div>
          </div>
          {fitPoints && (
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: fitPoints.color }}>
                {fitPoints.total}<span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}> fp</span>
              </div>
              <div className="stat-card__label">{fitPoints.label}</div>
            </div>
          )}
          <div className={`stat-card${stats.streak > 0 ? " stat-card--fire stat-card--risk" : ""}`}>
            <div className="stat-card__value">
              {stats.streak}
              {stats.streak > 0 && (
                <span className="streak-icon"><i className="fa-solid fa-fire" /></span>
              )}
            </div>
            <div className="stat-card__label">dias seguidos</div>
          </div>
        </div>
      )}

      {stats && (
        <div className="weekly-goal" style={{ marginBottom: "var(--space-xl)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-sm)" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>Meta semanal</span>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{stats.days_this_week} de 4 treinos</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--color-surface-alt)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, background: "var(--color-primary-bright, #a5b4fc)", width: `${Math.min((stats.days_this_week / 4) * 100, 100)}%`, transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      {chartData.length > 0 ? (
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Evolução</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-stroke)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-stroke)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                  stroke="var(--color-border)"
                  tickFormatter={(d: string) => {
                    const [, m, day] = d.split("-");
                    return `${day}/${m}`;
                  }}
                />
                <YAxis
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                  stroke="var(--color-border)"
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-sm)",
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString()} kg·rep`, "Volume"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-stroke)"
                  strokeWidth={2}
                  fill="url(#fillPrimary)"
                  dot={{ fill: "var(--chart-stroke)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : (
        <div className="card onboarding-card" style={{ borderLeft: "3px solid var(--color-primary)" }}>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-sm)" }}>
            Bem-vindo ao LiftDeck!
          </div>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", lineHeight: 1.6, marginBottom: "var(--space-lg)" }}>
            Monte um plano ou inicie um treino livre — voce escolhe como comecar.
          </p>
          <div style={{ display: "flex", gap: "var(--space-md)" }}>
            <Link to="/plans" className="btn btn--secondary" style={{ flex: 1 }}>
              Criar Plano
            </Link>
            {activeSession ? (
              <Link to="/session/active" className="btn btn--primary" style={{ flex: 1 }}>
                Continuar Treino
              </Link>
            ) : (
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={async () => {
                await sessionService.startSession();
                navigate("/session/active");
              }}>
                Treino Livre
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

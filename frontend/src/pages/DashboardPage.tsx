import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDumbbell } from "@fortawesome/free-solid-svg-icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as sessionService from "../services/sessionService";
import * as dashboardService from "../services/dashboardService";
import * as evolutionService from "../services/evolutionService";
import type { WorkoutSession, DashboardStats, EvolutionDataPoint } from "../types";

function oneYearAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

export function DashboardPage() {
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<EvolutionDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) return <div className="loader">Carregando</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Home</h1>
      </div>

      <Link to={activeSession ? "/session/active" : "/treino"} className="cta-train">
        <FontAwesomeIcon icon={faDumbbell} />
        {activeSession ? "Continuar Treino" : "Iniciar Treino"}
      </Link>

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card__value">{stats.days_this_week}</div>
            <div className="stat-card__label">dias esta semana</div>
          </div>
          <div className="stat-card stat-card--accent">
            <div className="stat-card__value">
              {stats.weekly_volume >= 1000
                ? `${(stats.weekly_volume / 1000).toFixed(1)}`
                : stats.weekly_volume}
              <span>{stats.weekly_volume >= 1000 ? "t" : "kg"}</span>
            </div>
            <div className="stat-card__label">volume semanal</div>
          </div>
          <div className="stat-card stat-card--success">
            <div className="stat-card__value">{stats.streak}</div>
            <div className="stat-card__label">dias seguidos</div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Evolucao</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
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
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#a3e635"
                  strokeWidth={2}
                  dot={{ fill: "#a3e635", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

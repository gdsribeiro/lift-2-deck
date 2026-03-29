import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as evolutionService from "../services/evolutionService";
import * as catalogService from "../services/catalogService";
import type { EvolutionDataPoint, CatalogExercise } from "../types";

type Period = "7d" | "30d" | "1y";
type Bucket = "day" | "week" | "month";
type GroupBy = "volume" | "frequency";

function periodToFrom(p: Period): string {
  const d = new Date();
  if (p === "7d") d.setDate(d.getDate() - 7);
  else if (p === "30d") d.setDate(d.getDate() - 30);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

export function EvolutionPage() {
  const [dataPoints, setDataPoints] = useState<EvolutionDataPoint[]>([]);
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [exerciseId, setExerciseId] = useState<string>("");
  const [period, setPeriod] = useState<Period>("30d");
  const [bucket, setBucket] = useState<Bucket>("day");
  const [groupBy, setGroupBy] = useState<GroupBy>("volume");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    catalogService.getCatalog().then(setExercises);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    evolutionService
      .getEvolution({
        exercise_id: exerciseId || undefined,
        from: periodToFrom(period),
        group_by: groupBy,
        bucket,
      })
      .then((r) => setDataPoints(r.data_points))
      .finally(() => setIsLoading(false));
  }, [exerciseId, period, bucket, groupBy]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Progresso</h1>
      </div>

      {/* Group by toggle */}
      <div className="toggle-group" style={{ marginBottom: "var(--space-lg)" }}>
        <button
          className={`toggle-btn${groupBy === "volume" ? " toggle-btn--active" : ""}`}
          onClick={() => setGroupBy("volume")}
        >
          Volume
        </button>
        <button
          className={`toggle-btn${groupBy === "frequency" ? " toggle-btn--active" : ""}`}
          onClick={() => setGroupBy("frequency")}
        >
          Frequencia
        </button>
      </div>

      {/* Exercise filter */}
      <div className="form-group" style={{ marginBottom: "var(--space-lg)" }}>
        <label className="form-label">Exercicio</label>
        <select
          className="form-input"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          style={{ appearance: "auto" }}
        >
          <option value="">Geral (todos)</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>

      {/* Period + Bucket filters */}
      <div style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ marginBottom: "var(--space-xs)", display: "block" }}>Periodo</label>
          <div className="toggle-group">
            {(["7d", "30d", "1y"] as Period[]).map((p) => (
              <button
                key={p}
                className={`toggle-btn${period === p ? " toggle-btn--active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p === "1y" ? "1a" : p}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label" style={{ marginBottom: "var(--space-xs)", display: "block" }}>Agrupar</label>
          <div className="toggle-group">
            {(["day", "week", "month"] as Bucket[]).map((b) => (
              <button
                key={b}
                className={`toggle-btn${bucket === b ? " toggle-btn--active" : ""}`}
                onClick={() => setBucket(b)}
              >
                {b === "day" ? "Dia" : b === "week" ? "Sem" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="loader">Carregando</div>
      ) : dataPoints.length === 0 ? (
        <div className="empty">
          <p className="empty__text">Sem dados para este filtro.</p>
        </div>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dataPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                stroke="var(--color-border)"
                tickFormatter={(d: string) => {
                  if (d.length === 7) return d; // month bucket "2026-03"
                  const [, m, day] = d.split("-");
                  return `${day}/${m}`;
                }}
              />
              <YAxis
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                stroke="var(--color-border)"
                width={45}
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
                stroke="#a5b4fc"
                strokeWidth={2}
                dot={{ fill: "#a5b4fc", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

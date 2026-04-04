import { useEffect, useState } from "react";
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
import * as evolutionService from "../services/evolutionService";
import * as catalogService from "../services/catalogService";
import * as historyService from "../services/historyService";
import type { EvolutionDataPoint, EvolutionGroupBy, CatalogExercise, WorkoutSessionDetail } from "../types";

type Tab = "evolution" | "history";
type Period = "7d" | "30d" | "1y";
type Bucket = "day" | "week" | "month";

function periodToFrom(p: Period): string {
  const d = new Date();
  if (p === "7d") d.setDate(d.getDate() - 7);
  else if (p === "30d") d.setDate(d.getDate() - 30);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

export function ProgressPage() {
  usePageTitle("Progresso");
  const [tab, setTab] = useState<Tab>("evolution");

  // Evolution state
  const [dataPoints, setDataPoints] = useState<EvolutionDataPoint[]>([]);
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [exerciseId, setExerciseId] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const [bucket, setBucket] = useState<Bucket>("day");
  const [groupBy, setGroupBy] = useState<EvolutionGroupBy>("volume");
  const [evoLoading, setEvoLoading] = useState(true);

  // History state
  const [sessions, setSessions] = useState<WorkoutSessionDetail[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [histLoading, setHistLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [histLoaded, setHistLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const selectedExercise = exercises.find((ex) => ex.id === exerciseId);
  const isCardioSelected = selectedExercise?.exercise_type === "cardio";

  useEffect(() => {
    catalogService.getCatalog().then(setExercises);
  }, []);

  // Reset groupBy when switching between strength/cardio exercises
  useEffect(() => {
    if (isCardioSelected && (groupBy === "volume" || groupBy === "frequency")) {
      setGroupBy("duration");
    } else if (!isCardioSelected && (groupBy === "duration" || groupBy === "distance")) {
      setGroupBy("volume");
    }
  }, [isCardioSelected]);

  useEffect(() => {
    setEvoLoading(true);
    evolutionService
      .getEvolution({ exercise_id: exerciseId || undefined, from: periodToFrom(period), group_by: groupBy, bucket })
      .then((r) => setDataPoints(r.data_points))
      .finally(() => setEvoLoading(false));
  }, [exerciseId, period, bucket, groupBy]);

  useEffect(() => {
    if (tab !== "history") return;
    setHistLoading(true);
    historyService
      .getHistory(page)
      .then((r) => { setSessions(r.data); setTotal(r.total); })
      .finally(() => { setHistLoading(false); setHistLoaded(true); });
  }, [tab, page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Progresso</h1>
      </div>

      <div className="toggle-group" style={{ marginBottom: "var(--space-xl)" }}>
        <button className={`toggle-btn${tab === "evolution" ? " toggle-btn--active" : ""}`} onClick={() => setTab("evolution")}>
          Evolução
        </button>
        <button className={`toggle-btn${tab === "history" ? " toggle-btn--active" : ""}`} onClick={() => setTab("history")}>
          Histórico
        </button>
      </div>

      {tab === "evolution" && (
        <>
          <div className="toggle-group" style={{ marginBottom: "var(--space-lg)" }}>
            {isCardioSelected ? (
              <>
                <button className={`toggle-btn${groupBy === "duration" ? " toggle-btn--active" : ""}`} onClick={() => setGroupBy("duration")}>Duração</button>
                <button className={`toggle-btn${groupBy === "distance" ? " toggle-btn--active" : ""}`} onClick={() => setGroupBy("distance")}>Distância</button>
                <button className={`toggle-btn${groupBy === "frequency" ? " toggle-btn--active" : ""}`} onClick={() => setGroupBy("frequency")}>Frequência</button>
              </>
            ) : (
              <>
                <button className={`toggle-btn${groupBy === "volume" ? " toggle-btn--active" : ""}`} onClick={() => setGroupBy("volume")}>Volume</button>
                <button className={`toggle-btn${groupBy === "frequency" ? " toggle-btn--active" : ""}`} onClick={() => setGroupBy("frequency")}>Frequência</button>
              </>
            )}
          </div>

          <button
            className="btn btn--secondary btn--full"
            style={{ marginBottom: "var(--space-lg)", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-sm)" }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fa-solid fa-filter" />
            Filtros
            <i className="fa-solid fa-chevron-down" style={{ transform: showFilters ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
          </button>

          {showFilters && (
            <>
              <div className="form-group" style={{ marginBottom: "var(--space-lg)" }}>
                <label className="form-label">Exercício</label>
                <select className="form-input" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} style={{ appearance: "auto" }}>
                  <option value="">Geral (todos)</option>
                  {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ marginBottom: "var(--space-xs)", display: "block" }}>Período</label>
                  <div className="toggle-group">
                    {(["7d", "30d", "1y"] as Period[]).map((p) => (
                      <button key={p} className={`toggle-btn${period === p ? " toggle-btn--active" : ""}`} onClick={() => setPeriod(p)}>{p === "1y" ? "1a" : p}</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ marginBottom: "var(--space-xs)", display: "block" }}>Agrupar</label>
                  <div className="toggle-group">
                    {(["day", "week", "month"] as Bucket[]).map((b) => (
                      <button key={b} className={`toggle-btn${bucket === b ? " toggle-btn--active" : ""}`} onClick={() => setBucket(b)}>{b === "day" ? "Dia" : b === "week" ? "Sem" : "Mês"}</button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {evoLoading ? (
            <div className="loader" />
          ) : dataPoints.length === 0 ? (
            <div className="empty">
              <div className="empty__icon"><i className="fa-solid fa-chart-line" /></div>
              <p className="empty__text">Nenhum dado para este periodo. Tente ampliar o filtro ou complete seu proximo treino.</p>
            </div>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dataPoints}>
                  <defs>
                    <linearGradient id="fillPrimaryEvo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-stroke)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--chart-stroke)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
                  <XAxis dataKey="date" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} stroke="var(--color-border)" tickFormatter={(d: string) => { if (d.length === 7) return d; const [, m, day] = d.split("-"); return `${day}/${m}`; }} />
                  <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} stroke="var(--color-border)" width={45} />
                  <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)" }} />
                  <Area type="monotone" dataKey="value" stroke="var(--chart-stroke)" strokeWidth={2} fill="url(#fillPrimaryEvo)" dot={{ fill: "var(--chart-stroke)", r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <>
          {histLoading && !histLoaded ? (
            <div className="loader" />
          ) : sessions.length === 0 ? (
            <div className="empty"><p className="empty__text">Seu histórico começa no próximo treino.</p></div>
          ) : (
            <div className="stagger">
              {sessions.map((session) => {
                const isExpanded = expandedId === session.id;
                return (
                  <div key={session.id} className={`history-item${isExpanded ? " history-item--expanded" : ""}`}>
                    <div className="history-header" role="button" tabIndex={0} onClick={() => setExpandedId(isExpanded ? null : session.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedId(isExpanded ? null : session.id); } }}>
                      <div className="history-header__info">
                        <div className="history-header__name">{session.plan_name ?? "Treino Livre"}</div>
                        <div className="history-header__date">
                          {new Date(session.started_at).toLocaleDateString("pt-BR")}
                          {session.notes && ` — ${session.notes}`}
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-down history-header__chevron" />
                    </div>
                    {isExpanded && (
                      <div className="history-body">
                        {session.logs.map((log) => (
                          <div key={log.id} className="log-entry">
                            <span className="log-entry__set">{log.set_number}</span>
                            <span className="log-entry__name">{log.exercise_name}</span>
                            <span className="log-entry__detail">
                              {log.duration_min
                                ? `${log.duration_min}min${log.distance_km ? ` · ${log.distance_km}km` : ""}`
                                : `${log.weight_kg ?? "—"}kg x ${log.reps ?? "—"}`}
                            </span>
                          </div>
                        ))}
                        {session.ai_feedback && (
                          <div style={{ marginTop: "var(--space-lg)", padding: "var(--space-md)", borderTop: "1px solid var(--color-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", marginBottom: "var(--space-sm)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
                              <i className="fa-solid fa-robot" />
                              <span>Feedback IA</span>
                            </div>
                            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                              {session.ai_feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span className="pagination__info">{page} / {totalPages}</span>
              <button className="btn btn--secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próximo</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

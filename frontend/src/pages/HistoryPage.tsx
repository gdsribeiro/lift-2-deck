import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faRobot } from "@fortawesome/free-solid-svg-icons";
import * as historyService from "../services/historyService";
import type { WorkoutSessionDetail } from "../types";

export function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSessionDetail[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    historyService
      .getHistory(page)
      .then((response) => {
        setSessions(response.data);
        setTotal(response.total);
      })
      .finally(() => setIsLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / 20);

  if (isLoading) return <div className="loader">Carregando</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historico</h1>
        {total > 0 && <span className="badge">{total} treinos</span>}
      </div>

      {sessions.length === 0 ? (
        <div className="empty">
          <p className="empty__text">Seu historico comeca no proximo treino.</p>
        </div>
      ) : (
        <div className="stagger">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.id;
            return (
              <div
                key={session.id}
                className={`history-item${isExpanded ? " history-item--expanded" : ""}`}
              >
                <div
                  className="history-header"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                >
                  <div className="history-header__info">
                    <div className="history-header__name">
                      {session.plan_name ?? "Treino Livre"}
                    </div>
                    <div className="history-header__date">
                      {new Date(session.started_at).toLocaleDateString("pt-BR")}
                      {session.notes && ` — ${session.notes}`}
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronDown} className="history-header__chevron" />
                </div>

                {isExpanded && (
                  <div className="history-body">
                    {session.logs.map((log) => (
                      <div key={log.id} className="log-entry">
                        <span className="log-entry__set">{log.set_number}</span>
                        <span className="log-entry__name">{log.exercise_name}</span>
                        <span className="log-entry__detail">
                          {log.weight_kg ?? "—"}kg x {log.reps ?? "—"}
                        </span>
                      </div>
                    ))}
                    {session.ai_feedback && (
                      <div className="ai-feedback" style={{ marginTop: "var(--space-lg)", padding: "var(--space-md)", borderTop: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", marginBottom: "var(--space-sm)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
                          <FontAwesomeIcon icon={faRobot} />
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
          <button
            className="btn btn--secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </button>
          <span className="pagination__info">{page} / {totalPages}</span>
          <button
            className="btn btn--secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Proximo
          </button>
        </div>
      )}
    </div>
  );
}

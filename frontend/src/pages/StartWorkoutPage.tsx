import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDumbbell, faListCheck } from "@fortawesome/free-solid-svg-icons";
import * as planService from "../services/planService";
import * as sessionService from "../services/sessionService";
import type { PlanDetail } from "../types";

export function StartWorkoutPage() {
  const [plans, setPlans] = useState<PlanDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    planService.getPlans().then(async (list) => {
      const details = await Promise.all(list.map((p) => planService.getPlanDetail(p.id)));
      setPlans(details);
      setIsLoading(false);
    });
  }, []);

  async function startFromSeries(seriesId: string) {
    await sessionService.startSession(seriesId);
    navigate("/session/active");
  }

  async function startFree() {
    await sessionService.startSession();
    navigate("/session/active");
  }

  if (isLoading) return <div className="loader">Carregando</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Treino</h1>
      </div>

      {plans.length > 0 && (
        <section className="section" style={{ marginTop: 0 }}>
          <div className="section__header">
            <h2 className="section__title">Meus Planos</h2>
          </div>
          <div className="stagger">
            {plans.map((plan) => (
              <div key={plan.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "var(--space-lg)", paddingBottom: "var(--space-sm)" }}>
                  <div className="card__title">{plan.name}</div>
                  {plan.description && <div className="card__subtitle">{plan.description}</div>}
                </div>
                <div style={{ padding: "0 var(--space-lg) var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                  {plan.series.map((s) => (
                    <button
                      key={s.id}
                      className="btn btn--secondary btn--full"
                      onClick={() => startFromSeries(s.id)}
                      style={{ justifyContent: "space-between" }}
                    >
                      <span>
                        <FontAwesomeIcon icon={faListCheck} style={{ marginRight: "var(--space-sm)" }} />
                        {s.name}
                      </span>
                      <span className="badge">{s.exercises.length} exercicios</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="divider" />

      <button className="cta-train" onClick={startFree}>
        <FontAwesomeIcon icon={faDumbbell} />
        Treino Livre
      </button>
      <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "calc(-1 * var(--space-md))" }}>
        Registrar exercicios avulsos sem seguir um plano.
      </p>
    </div>
  );
}

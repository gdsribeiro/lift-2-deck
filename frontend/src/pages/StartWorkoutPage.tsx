import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import * as planService from "../services/planService";
import * as sessionService from "../services/sessionService";
import type { PlanDetail } from "../types";

export function StartWorkoutPage() {
  usePageTitle("Treino");
  const [plans, setPlans] = useState<PlanDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    planService.getPlans()
      .then((basicPlans) => Promise.all(basicPlans.map((p) => planService.getPlanDetail(p.id))))
      .then(setPlans)
      .finally(() => setIsLoading(false));
  }, []);

  async function startFromPlan(planId: string) {
    await sessionService.startSession(planId);
    navigate("/session/active");
  }

  async function startFree() {
    await sessionService.startSession();
    navigate("/session/active");
  }

  if (isLoading) return <div className="loader" />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Treino</h1>
      </div>

      <button className="cta-train" onClick={startFree}>
        <i className="fa-solid fa-dumbbell" />
        Treino Livre
      </button>

      <div className="divider" />

      <section className="section--flush">
        <div className="section__header">
          <h2 className="section__title">Meus Planos</h2>
        </div>
        {plans.length > 0 ? (
          <div className="stagger">
            {plans.map((plan) => (
              <button
                key={plan.id}
                className="btn btn--secondary btn--full btn--start"
                onClick={() => startFromPlan(plan.id)}
              >
                <i className="fa-solid fa-list-check" />
                {plan.name}
                <span className="badge" style={{ marginLeft: "auto", fontSize: "var(--text-xs)", opacity: 0.7 }}>{plan.exercises.length} exercicios</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: "var(--space-xl) var(--space-lg)" }}>
            <p className="empty__text">Crie um plano para treinar com estrutura.</p>
            <Link to="/plans/new" className="btn btn--secondary" style={{ marginTop: "var(--space-md)" }}>
              Criar Plano
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

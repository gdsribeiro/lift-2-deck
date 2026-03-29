import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDumbbell, faListCheck } from "@fortawesome/free-solid-svg-icons";
import { ConfirmDialog } from "../components/ConfirmDialog";
import * as planService from "../services/planService";
import * as sessionService from "../services/sessionService";
import type { PlanDetail } from "../types";

export function StartWorkoutPage() {
  usePageTitle("Treino");
  const [plans, setPlans] = useState<PlanDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingFree, setPendingFree] = useState(false);
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

  const pendingPlan = plans.find((p) => p.id === pendingPlanId);

  if (isLoading) return <div className="loader">Carregando</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Treino</h1>
      </div>

      <button className="cta-train" onClick={startFree}>
        <FontAwesomeIcon icon={faDumbbell} />
        Treino Livre
      </button>

      {plans.length > 0 && (
        <>
          <div className="divider" />

          <section className="section--flush">
            <div className="section__header">
              <h2 className="section__title">Meus Planos</h2>
            </div>
            <div className="stagger">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  className="btn btn--secondary btn--full btn--start"
                  onClick={() => setPendingPlanId(plan.id)}
                >
                  <FontAwesomeIcon icon={faListCheck} />
                  {plan.name}
                  <span className="badge" style={{ marginLeft: "auto", fontSize: "var(--text-xs)", opacity: 0.7 }}>{plan.exercises.length} exercícios</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={pendingFree}
        title="Treino Livre"
        description="Iniciar um treino sem plano definido?"
        confirmLabel="Iniciar"
        onConfirm={() => { setPendingFree(false); startFree(); }}
        onCancel={() => setPendingFree(false)}
      />

      <ConfirmDialog
        open={!!pendingPlanId}
        title={`Iniciar ${pendingPlan?.name ?? "treino"}?`}
        description={`${pendingPlan?.exercises.length ?? 0} exercícios neste plano.`}
        confirmLabel="Iniciar"
        onConfirm={() => { const id = pendingPlanId!; setPendingPlanId(null); startFromPlan(id); }}
        onCancel={() => setPendingPlanId(null)}
      />
    </div>
  );
}

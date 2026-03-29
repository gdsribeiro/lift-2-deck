import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { ConfirmDialog } from "../components/ConfirmDialog";
import * as planService from "../services/planService";
import type { TrainingPlan } from "../types";

export function PlansPage() {
  usePageTitle("Planos");
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    planService.getPlans().then(setPlans).finally(() => setIsLoading(false));
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    await planService.deletePlan(deleteTarget.id);
    setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  if (isLoading) return <div className="loader">Carregando</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Meus Planos</h1>
        <Link to="/plans/new" className="btn btn--primary">
          <FontAwesomeIcon icon={faPlus} /> Novo
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="empty">
          <div className="empty__icon"><FontAwesomeIcon icon={faClipboardList} /></div>
          <p className="empty__text">Nenhum plano ainda. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="exercise-list">
          {plans.map((plan) => (
            <div key={plan.id} className="exercise-item">
              <Link to={`/plans/${plan.id}`} className="exercise-info">
                <div className="exercise-name">{plan.name}</div>
              </Link>
              <button className="btn btn--icon btn--ghost" onClick={() => setDeleteTarget(plan)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir plano?"
        description={`O plano "${deleteTarget?.name}" sera removido permanentemente.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

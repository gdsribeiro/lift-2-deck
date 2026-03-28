import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import * as planService from "../services/planService";
import type { TrainingPlan } from "../types";

export function PlansPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    planService.getPlans().then(setPlans).finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const plan = await planService.createPlan({ name, description: description || undefined });
    setPlans((prev) => [...prev, plan]);
    setName("");
    setDescription("");
    setShowForm(false);
  }

  async function handleDelete(planId: string) {
    await planService.deletePlan(planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  }

  if (isLoading) return <div className="loader">Carregando</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Planos de Treino</h1>
        <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
          <FontAwesomeIcon icon={faPlus} /> Novo
        </button>
      </div>

      {showForm && (
        <div className="inline-form" style={{ marginBottom: "var(--space-xl)" }}>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label" htmlFor="planName">Nome</label>
              <input
                className="form-input"
                id="planName"
                placeholder="Ex: Push Pull Legs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="planDesc">Descricao (opcional)</label>
              <input
                className="form-input"
                id="planDesc"
                placeholder="Breve descricao do plano"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn--primary" type="submit">Salvar</button>
              <button className="btn btn--secondary" type="button" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="empty">
          <p className="empty__text">Nenhum plano cadastrado.</p>
        </div>
      ) : (
        <div className="stagger">
          {plans.map((plan) => (
            <div key={plan.id} className="card">
              <div className="card__row">
                <Link to={`/plans/${plan.id}`} style={{ flex: 1 }}>
                  <div className="card__title">{plan.name}</div>
                  {plan.description && (
                    <div className="card__subtitle">{plan.description}</div>
                  )}
                </Link>
                <button className="btn btn--icon btn--danger" onClick={() => handleDelete(plan.id)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

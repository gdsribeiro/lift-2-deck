import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import * as planService from "../services/planService";

export function CreatePlanPage() {
  usePageTitle("Novo Plano");
  const navigate = useNavigate();
  const [name, setName] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const plan = await planService.createPlan({ name });
    navigate(`/plans/${plan.id}`);
  }

  return (
    <div>
      <Link to="/plans" className="btn btn--ghost back-link">
        <i className="fa-solid fa-arrow-left" /> Planos
      </Link>
      <div className="page-header">
        <h1 className="page-title">Novo Plano</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="planName">Nome do plano</label>
          <input
            className="form-input"
            id="planName"
            placeholder="Ex: Push A, Pull A, Legs A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button className="btn btn--primary btn--full" type="submit">Criar Plano</button>
        </div>
      </form>
    </div>
  );
}

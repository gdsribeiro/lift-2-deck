import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import * as catalogService from "../services/catalogService";

export function CreateExercisePage() {
  usePageTitle("Novo Exercicio");
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [exerciseType, setExerciseType] = useState<"strength" | "cardio">("strength");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await catalogService.addExercise({ name, category, exercise_type: exerciseType });
    navigate("/catalog");
  }

  return (
    <div>
      <Link to="/catalog" className="btn btn--ghost back-link">
        <i className="fa-solid fa-arrow-left" /> Exercicios
      </Link>
      <div className="page-header">
        <h1 className="page-title">Novo Exercicio</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="exName">Nome</label>
          <input
            className="form-input"
            id="exName"
            placeholder="Ex: Supino com Halteres"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="exCategory">Grupo muscular</label>
          <input
            className="form-input"
            id="exCategory"
            placeholder="Ex: Peito, Costas, Pernas"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
        </div>
        <div className="toggle-group mb-md">
          <button
            type="button"
            className={`toggle-btn${exerciseType === "strength" ? " toggle-btn--active" : ""}`}
            onClick={() => setExerciseType("strength")}
          >
            Forca
          </button>
          <button
            type="button"
            className={`toggle-btn${exerciseType === "cardio" ? " toggle-btn--active" : ""}`}
            onClick={() => setExerciseType("cardio")}
          >
            Cardio
          </button>
        </div>
        <div className="form-actions">
          <button className="btn btn--primary btn--full" type="submit">Criar Exercicio</button>
        </div>
      </form>
    </div>
  );
}

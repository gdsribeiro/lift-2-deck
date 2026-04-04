import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { ConfirmDialog } from "../components/ConfirmDialog";
import * as planService from "../services/planService";
import * as exerciseService from "../services/exerciseService";
import * as catalogService from "../services/catalogService";
import { ExerciseIcon, getGroupColor } from "../components/ExerciseIcon";
import type { PlanDetail, Exercise, CatalogExercise } from "../types";

export function PlanDetailPage() {
  usePageTitle("Detalhe do Plano");
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showPicker, setShowPicker] = useState(false);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<CatalogExercise | null>(null);

  const [sets, setSets] = useState(3);
  const [repsTarget, setRepsTarget] = useState("8-12");
  const [restSeconds, setRestSeconds] = useState(60);

  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);

  useEffect(() => {
    if (!planId) return;
    Promise.all([
      planService.getPlanDetail(planId),
      catalogService.getCatalog(),
    ]).then(([planData, catalogData]) => {
      setPlan(planData);
      setCatalog(catalogData);
    }).finally(() => setIsLoading(false));
  }, [planId]);

  function handleSelectExercise(cat: CatalogExercise) {
    if (cat.exercise_type === "cardio") {
      addExercise(cat, 1, "", 0);
    } else {
      setSelected(cat);
      setSets(3);
      setRepsTarget("8-12");
      setRestSeconds(60);
    }
  }

  async function addExercise(cat: CatalogExercise, setsVal: number, reps: string, rest: number) {
    if (!planId || !plan) return;
    const exercise = await exerciseService.createExercise(planId, {
      name: cat.name,
      muscle_group: cat.category,
      exercise_type: cat.exercise_type,
      sets: setsVal,
      reps_target: reps,
      rest_seconds: rest,
      order_index: plan.exercises.length,
    });
    setPlan({ ...plan, exercises: [...plan.exercises, exercise] });
    resetPicker();
  }

  function handleConfirmStrength() {
    if (!selected) return;
    addExercise(selected, sets, repsTarget, restSeconds);
  }

  function resetPicker() {
    setShowPicker(false);
    setSearchQuery("");
    setSelected(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await exerciseService.deleteExercise(deleteTarget.id);
    if (plan) {
      setPlan({ ...plan, exercises: plan.exercises.filter((ex) => ex.id !== deleteTarget.id) });
    }
    setDeleteTarget(null);
  }

  if (isLoading) return <div className="loader" />;
  if (!plan) return <div className="empty"><p className="empty__text">Plano nao encontrado.</p></div>;

  const filteredCatalog = searchQuery
    ? catalog.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : catalog;

  const catalogByCategory = filteredCatalog.reduce<Record<string, CatalogExercise[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div>
      <Link to="/plans" className="btn btn--ghost back-link">
        <i className="fa-solid fa-arrow-left" /> Planos
      </Link>
      <div className="page-header">
        <h1 className="page-title">{plan.name}</h1>
      </div>

      {plan.exercises.length === 0 ? (
        <div className="empty">
          <p className="empty__text">Plano vazio. Adicione exercicios abaixo.</p>
        </div>
      ) : (
        <div className="exercise-list">
          {plan.exercises.map((exercise: Exercise) => (
            <div key={exercise.id} className="exercise-item">
              <span className="exercise-icon" style={{ color: getGroupColor(exercise.muscle_group) }}>
                <ExerciseIcon name={exercise.name} />
              </span>
              <div className="exercise-info">
                <div className="exercise-name">{exercise.name}</div>
                <div className="exercise-meta">
                  {exercise.exercise_type === "cardio" ? (
                    <span>Cardio</span>
                  ) : (
                    <>
                      <span>{exercise.sets}x{exercise.reps_target}</span>
                      <span>|</span>
                      <span>{exercise.rest_seconds}s descanso</span>
                    </>
                  )}
                </div>
              </div>
              <button className="btn btn--icon btn--ghost" onClick={() => setDeleteTarget(exercise)}>
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="picker-area">
        {!showPicker && !selected ? (
          <button className="btn btn--secondary btn--full" onClick={() => setShowPicker(true)}>
            <i className="fa-solid fa-plus" /> Exercicio
          </button>
        ) : selected ? (
          <div className="inline-form">
            <div className="picker-selected">
              <div className="picker-selected__name">{selected.name}</div>
              <div className="picker-selected__category">{selected.category}</div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Series</label>
                <input className="form-input" type="number" value={sets} onChange={(e) => setSets(Number(e.target.value))} min={1} />
              </div>
              <div className="form-group">
                <label className="form-label">Reps</label>
                <input className="form-input" placeholder="8-12" value={repsTarget} onChange={(e) => setRepsTarget(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Desc. (s)</label>
                <input className="form-input" type="number" value={restSeconds} onChange={(e) => setRestSeconds(Number(e.target.value))} min={0} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn--primary" onClick={handleConfirmStrength}>Adicionar</button>
              <button className="btn btn--secondary" onClick={resetPicker}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="inline-form">
            <div className="form-group picker-search">
              <input
                className="form-input"
                placeholder="Buscar exercicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="picker-scroll">
              {Object.entries(catalogByCategory).map(([category, items]) => (
                <div key={category} className="picker-group">
                  <div className="picker-group__label">{category}</div>
                  {items.map((cat) => (
                    <button
                      key={cat.id}
                      className="btn btn--ghost btn--full btn--start picker-item"
                      onClick={() => handleSelectExercise(cat)}
                    >
                      <span style={{ color: getGroupColor(cat.category) }}><ExerciseIcon name={cat.name} /></span>
                      {cat.name}
                    </button>
                  ))}
                </div>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="picker-empty">Nenhum exercicio encontrado.</p>
              )}
            </div>
            <button className="btn btn--ghost btn--full picker-action" onClick={() => navigate("/catalog/new")}>
              <i className="fa-solid fa-plus" /> Criar exercicio
            </button>
            <button className="btn btn--ghost btn--full picker-action" onClick={resetPicker}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remover exercicio?"
        description={`"${deleteTarget?.name}" sera removido deste plano.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

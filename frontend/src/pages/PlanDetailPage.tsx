import { type FormEvent, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import * as planService from "../services/planService";
import * as seriesService from "../services/seriesService";
import * as exerciseService from "../services/exerciseService";
import type { PlanDetail, Exercise } from "../types";

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [newSeriesName, setNewSeriesName] = useState("");
  const [addingSeriesForm, setAddingSeriesForm] = useState(false);

  const [addingExerciseTo, setAddingExerciseTo] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    muscle_group: "",
    sets: 3,
    reps_target: "8-12",
    rest_seconds: 60,
  });

  useEffect(() => {
    if (!planId) return;
    planService.getPlanDetail(planId).then(setPlan).finally(() => setIsLoading(false));
  }, [planId]);

  async function handleAddSeries(e: FormEvent) {
    e.preventDefault();
    if (!planId || !plan) return;
    const series = await seriesService.createSeries(planId, {
      name: newSeriesName,
      order_index: plan.series.length,
    });
    setPlan({ ...plan, series: [...plan.series, { ...series, exercises: [] }] });
    setNewSeriesName("");
    setAddingSeriesForm(false);
  }

  async function handleDeleteSeries(seriesId: string) {
    await seriesService.deleteSeries(seriesId);
    if (plan) {
      setPlan({ ...plan, series: plan.series.filter((s) => s.id !== seriesId) });
    }
  }

  async function handleAddExercise(e: FormEvent, seriesId: string) {
    e.preventDefault();
    if (!plan) return;
    const targetSeries = plan.series.find((s) => s.id === seriesId);
    if (!targetSeries) return;

    const exercise = await exerciseService.createExercise(seriesId, {
      ...exerciseForm,
      order_index: targetSeries.exercises.length,
    });

    setPlan({
      ...plan,
      series: plan.series.map((s) =>
        s.id === seriesId ? { ...s, exercises: [...s.exercises, exercise] } : s
      ),
    });
    setExerciseForm({ name: "", muscle_group: "", sets: 3, reps_target: "8-12", rest_seconds: 60 });
    setAddingExerciseTo(null);
  }

  async function handleDeleteExercise(seriesId: string, exerciseId: string) {
    await exerciseService.deleteExercise(exerciseId);
    if (plan) {
      setPlan({
        ...plan,
        series: plan.series.map((s) =>
          s.id === seriesId
            ? { ...s, exercises: s.exercises.filter((ex) => ex.id !== exerciseId) }
            : s
        ),
      });
    }
  }

  if (isLoading) return <div className="loader">Carregando</div>;
  if (!plan) return <div className="empty"><p className="empty__text">Plano nao encontrado.</p></div>;

  return (
    <div>
      <Link to="/plans" className="btn btn--ghost" style={{ marginBottom: "var(--space-md)", display: "inline-flex" }}>
        <FontAwesomeIcon icon={faArrowLeft} /> Planos
      </Link>
      <div className="page-header">
        <div>
          <h1 className="page-title">{plan.name}</h1>
          {plan.description && (
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "var(--space-xs)" }}>
              {plan.description}
            </p>
          )}
        </div>
      </div>

      <div className="stagger">
        {plan.series.map((series) => (
          <div key={series.id} className="series-block">
            <div className="series-block__header">
              <h2 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)" }}>
                {series.name}
              </h2>
              <button className="btn btn--icon btn--danger" onClick={() => handleDeleteSeries(series.id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>

            <div className="series-block__body">
              {series.exercises.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", padding: "var(--space-md) 0" }}>
                  Nenhum exercicio nesta serie.
                </p>
              ) : (
                series.exercises.map((exercise: Exercise) => (
                  <div key={exercise.id} className="exercise-item">
                    <div className="exercise-info">
                      <div className="exercise-name">{exercise.name}</div>
                      <div className="exercise-meta">
                        <span>{exercise.sets}x{exercise.reps_target}</span>
                        <span>|</span>
                        <span>{exercise.rest_seconds}s descanso</span>
                        {exercise.notes && (
                          <>
                            <span>|</span>
                            <span>{exercise.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button className="btn btn--icon btn--ghost" onClick={() => handleDeleteExercise(series.id, exercise.id)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="series-block__footer">
              {addingExerciseTo === series.id ? (
                <div className="inline-form">
                  <form onSubmit={(e) => handleAddExercise(e, series.id)}>
                    <div className="form-group">
                      <input
                        className="form-input"
                        placeholder="Nome do exercicio"
                        value={exerciseForm.name}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        className="form-input"
                        placeholder="Grupo muscular"
                        value={exerciseForm.muscle_group}
                        onChange={(e) => setExerciseForm({ ...exerciseForm, muscle_group: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Series</label>
                        <input
                          className="form-input"
                          type="number"
                          value={exerciseForm.sets}
                          onChange={(e) => setExerciseForm({ ...exerciseForm, sets: Number(e.target.value) })}
                          min={1}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Reps</label>
                        <input
                          className="form-input"
                          placeholder="8-12"
                          value={exerciseForm.reps_target}
                          onChange={(e) => setExerciseForm({ ...exerciseForm, reps_target: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Desc. (s)</label>
                        <input
                          className="form-input"
                          type="number"
                          value={exerciseForm.rest_seconds}
                          onChange={(e) => setExerciseForm({ ...exerciseForm, rest_seconds: Number(e.target.value) })}
                          min={0}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button className="btn btn--primary" type="submit">Salvar</button>
                      <button className="btn btn--secondary" type="button" onClick={() => setAddingExerciseTo(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button className="btn btn--ghost btn--full" onClick={() => setAddingExerciseTo(series.id)}>
                  <FontAwesomeIcon icon={faPlus} /> Exercicio
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "var(--space-xl)" }}>
        {addingSeriesForm ? (
          <div className="inline-form">
            <form onSubmit={handleAddSeries}>
              <div className="form-group">
                <input
                  className="form-input"
                  placeholder="Nome da serie (ex: Treino A)"
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  required
                />
              </div>
              <div className="form-actions">
                <button className="btn btn--primary" type="submit">Salvar</button>
                <button className="btn btn--secondary" type="button" onClick={() => setAddingSeriesForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button className="btn btn--secondary btn--full" onClick={() => setAddingSeriesForm(true)}>
            <FontAwesomeIcon icon={faPlus} /> Nova Serie
          </button>
        )}
      </div>
    </div>
  );
}

import { type FormEvent, type TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faStop,
  faDumbbell,
  faRobot,
  faPlus,
  faTimes,
  faClock,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import * as sessionService from "../services/sessionService";
import * as planService from "../services/planService";
import * as catalogService from "../services/catalogService";
import { useRestTimer } from "../hooks/useRestTimer";
import type {
  WorkoutSession,
  Exercise,
  PlanDetail,
  CreateWorkoutLogRequest,
  CatalogExercise,
} from "../types";

interface LocalLog {
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  logged_at: string;
}

interface ExerciseState {
  id: string;
  name: string;
  targetSets: number;
  repsTarget: string;
  restSeconds: number;
  sets: LocalLog[];
  done: boolean;
}

function exerciseToState(ex: Exercise): ExerciseState {
  return {
    id: ex.id,
    name: ex.name,
    targetSets: ex.sets,
    repsTarget: ex.reps_target,
    restSeconds: ex.rest_seconds,
    sets: [],
    done: false,
  };
}

function catalogToState(cat: CatalogExercise): ExerciseState {
  return {
    id: cat.id,
    name: cat.name,
    targetSets: 3,
    repsTarget: "8-12",
    restSeconds: 90,
    sets: [],
    done: false,
  };
}

export function ActiveSessionPage() {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const navigate = useNavigate();
  const timer = useRestTimer();

  const [showPicker, setShowPicker] = useState(false);
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [workoutDate, setWorkoutDate] = useState(() => new Date().toISOString().split("T")[0]);

  const exerciseStatesRef = useRef(exerciseStates);
  exerciseStatesRef.current = exerciseStates;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    sessionService
      .getActiveSession()
      .then(async (activeSession) => {
        if (!activeSession) {
          setIsLoading(false);
          return;
        }
        setSession(activeSession);

        if (activeSession.series_id) {
          const planDetail = await findPlanBySeries(activeSession.series_id);
          if (planDetail) {
            const series = planDetail.series.find((s) => s.id === activeSession.series_id);
            if (series) setExerciseStates(series.exercises.map(exerciseToState));
          }
        } else {
          setIsFreeMode(true);
          const items = await catalogService.getCatalog();
          setCatalog(items);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function findPlanBySeries(seriesId: string): Promise<PlanDetail | null> {
    const plans = await planService.getPlans();
    for (const plan of plans) {
      const detail = await planService.getPlanDetail(plan.id);
      if (detail.series.some((s) => s.id === seriesId)) return detail;
    }
    return null;
  }

  const current = exerciseStates[currentIndex];
  const currentSetNumber = current ? current.sets.length + 1 : 0;
  const doneCount = exerciseStates.filter((es) => es.done).length;
  const totalCount = exerciseStates.length;

  // When timer ends and there's a pending advance, move to next exercise
  useEffect(() => {
    if (!timer.isRunning && pendingAdvance) {
      setPendingAdvance(false);
      const states = exerciseStatesRef.current;
      const idx = currentIndexRef.current;
      const nextUndone = states.findIndex((es, i) => i > idx && !es.done);
      if (nextUndone !== -1) {
        setCurrentIndex(nextUndone);
      }
    }
  }, [timer.isRunning, pendingAdvance]);

  function handleLogSet(e: FormEvent) {
    e.preventDefault();
    if (!current) return;

    const log: LocalLog = {
      exercise_id: current.id,
      exercise_name: current.name,
      set_number: currentSetNumber,
      weight_kg: weight ? Number(weight) : null,
      reps: reps ? Number(reps) : null,
      logged_at: `${workoutDate}T${new Date().toTimeString().slice(0, 8)}Z`,
    };

    const newSetCount = current.sets.length + 1;
    const isLastSet = newSetCount >= current.targetSets;

    setExerciseStates((prev) =>
      prev.map((es, i) =>
        i === currentIndex
          ? { ...es, sets: [...es.sets, log], done: isLastSet ? true : es.done }
          : es
      )
    );

    timer.start(current.restSeconds);

    // If last set, queue advance for after rest ends (don't advance now)
    if (isLastSet) {
      setPendingAdvance(true);
    }
  }

  // Auto-fill weight/reps from last set
  useEffect(() => {
    if (!current || current.sets.length === 0) {
      setWeight("");
      setReps("");
      return;
    }
    const lastSet = current.sets[current.sets.length - 1];
    setWeight(lastSet.weight_kg !== null ? String(lastSet.weight_kg) : "");
    setReps(lastSet.reps !== null ? String(lastSet.reps) : "");
  }, [currentIndex, current?.sets.length]);

  function handleAddExtraSet() {
    if (!current) return;
    setPendingAdvance(false);
    setExerciseStates((prev) =>
      prev.map((es, i) => (i === currentIndex ? { ...es, done: false } : es))
    );
  }

  function handleSaveExercise() {
    if (!current) return;
    setExerciseStates((prev) =>
      prev.map((es, i) => (i === currentIndex ? { ...es, done: true } : es))
    );
    const nextUndone = exerciseStates.findIndex((es, i) => i > currentIndex && !es.done);
    if (nextUndone !== -1) setCurrentIndex(nextUndone);
  }

  // Navigation: only forward to undone exercises, or back to undone ones
  const canGoNext = exerciseStates.some((es, i) => i > currentIndex && !es.done);
  const canGoPrev = exerciseStates.some((es, i) => i < currentIndex && !es.done);

  function goNext() {
    if (timer.isRunning) return;
    const next = exerciseStates.findIndex((es, i) => i > currentIndex && !es.done);
    if (next !== -1) setCurrentIndex(next);
  }

  function goPrev() {
    if (timer.isRunning) return;
    // Find closest undone exercise before current
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!exerciseStates[i].done) {
        setCurrentIndex(i);
        return;
      }
    }
  }

  // Swipe handling
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe is dominant and > 60px
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();   // swipe left = next
      else goPrev();          // swipe right = prev
    }
  }, [currentIndex, exerciseStates, timer.isRunning]);

  function addFromCatalog(cat: CatalogExercise) {
    const state = catalogToState(cat);
    setExerciseStates((prev) => [...prev, state]);
    setCurrentIndex(exerciseStates.length);
    setShowPicker(false);
    setSearchQuery("");
  }

  async function handleFinish() {
    if (!session) return;
    setIsFinishing(true);

    const allLogs: CreateWorkoutLogRequest[] = exerciseStates.flatMap((es) =>
      es.sets.map((s) => ({
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        weight_kg: s.weight_kg ?? undefined,
        reps: s.reps ?? undefined,
      }))
    );

    try {
      const finished = await sessionService.finishSession(session.id, { logs: allLogs });
      setFeedback(finished.ai_feedback ?? "");
    } finally {
      setIsFinishing(false);
    }
  }

  async function handleCancel() {
    if (!session) return;
    await sessionService.finishSession(session.id, { notes: "Cancelado" });
    navigate("/");
  }

  if (isLoading) return <div className="loader">Carregando</div>;

  if (!session) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Treinar</h1>
        </div>
        <div className="empty">
          <div className="empty__icon"><FontAwesomeIcon icon={faDumbbell} /></div>
          <p className="empty__text">Nenhuma sessao ativa</p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "var(--space-sm)" }}>
            Inicie um treino a partir da aba Treinar.
          </p>
        </div>
      </div>
    );
  }

  if (feedback !== null) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Treino Finalizado!</h1>
        </div>
        <div className="card feedback-card" style={{ marginBottom: "var(--space-xl)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
            <FontAwesomeIcon icon={faRobot} className="feedback-card__icon" />
            <strong>Feedback do Treino</strong>
          </div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--color-text-muted)" }}>
            {feedback || "Nao foi possivel gerar feedback para esta sessao."}
          </p>
        </div>
        <button className="btn btn--primary btn--full" onClick={() => navigate("/history")}>
          Ver Historico
        </button>
      </div>
    );
  }

  const filteredCatalog = searchQuery
    ? catalog.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : catalog;

  const catalogByCategory = filteredCatalog.reduce<Record<string, CatalogExercise[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  const doneExercises = exerciseStates.filter((es, i) => es.done && i !== currentIndex);

  return (
    <div>
      {/* Sticky timer */}
      {timer.isRunning && (
        <div className="sticky-timer">
          <FontAwesomeIcon icon={faClock} className="rest-inline__icon" />
          <span className="sticky-timer__label">Descanso</span>
          <span className="sticky-timer__time">{timer.secondsLeft}s</span>
          <button className="sticky-timer__skip" onClick={timer.skip}>Pular</button>
        </div>
      )}

      {/* Header */}
      <div className="workout-header">
        <h1 className="page-title">{isFreeMode ? "Treino Livre" : "Treino"}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          {totalCount > 0 && (
            <span className="workout-progress">
              <span>{doneCount}</span>/{totalCount}
            </span>
          )}
          <button className="btn btn--ghost" onClick={handleCancel} title="Cancelar">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>

      {/* Date selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-lg)" }}>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          {new Date(workoutDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
        <input
          type="date"
          className="form-input"
          value={workoutDate}
          onChange={(e) => setWorkoutDate(e.target.value)}
          style={{ width: "auto", padding: "var(--space-xs) var(--space-sm)", fontSize: "var(--text-xs)", minHeight: "auto" }}
        />
      </div>

      {/* Done pills */}
      {doneExercises.length > 0 && (
        <div className="done-pills">
          {doneExercises.map((es, i) => (
            <span key={`done-${i}`} className="done-pill">
              <span className="done-pill__check">✓</span>
              {es.name}
              <span>{es.sets.length}x · {es.sets[0]?.weight_kg ?? 0}kg</span>
            </span>
          ))}
        </div>
      )}

      {/* Flashcard stack */}
      <div
        className="exercise-stack"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {exerciseStates.map((es, idx) => {
          const isActive = idx === currentIndex;
          const isDone = es.done && !isActive;
          const offset = idx - currentIndex;

          let blockClass = "exercise-block";
          if (isActive) {
            blockClass += " exercise-block--active";
          } else if (isDone) {
            blockClass += " exercise-block--done";
          } else if (offset === 1) {
            blockClass += " exercise-block--next-1";
          } else if (offset === 2) {
            blockClass += " exercise-block--next-2";
          } else if (offset >= 3) {
            blockClass += " exercise-block--next-3";
          }

          return (
            <div key={`${es.id}-${idx}`} className={blockClass}>
              <div className="exercise-block__header">
                <div className={`exercise-block__number${es.done ? " exercise-block__number--done" : ""}`}>
                  {es.done ? "✓" : idx + 1}
                </div>
                <div className="exercise-block__info">
                  <div className="exercise-block__name">{es.name}</div>
                  <div className="exercise-block__meta">
                    {es.targetSets} series · {es.repsTarget} reps · {es.restSeconds}s
                  </div>
                </div>
              </div>

              {isActive && (
                <div className="exercise-block__body">
                  {es.sets.map((s) => (
                    <div key={s.set_number} className="set-row">
                      <span className="set-row__number">{s.set_number}.</span>
                      <span className="set-row__detail">{s.weight_kg ?? 0}kg x {s.reps ?? 0}</span>
                      <span className="set-row__check">✓</span>
                    </div>
                  ))}

                  {timer.isRunning && (
                    <div className="rest-inline">
                      <FontAwesomeIcon icon={faClock} className="rest-inline__icon" />
                      <span className="rest-inline__text">Descansando...</span>
                      <button className="sticky-timer__skip" onClick={timer.skip}>Pular</button>
                    </div>
                  )}

                  {!timer.isRunning && !es.done && (
                    <>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", margin: "var(--space-md) 0 var(--space-sm)" }}>
                        Serie {currentSetNumber} de {es.targetSets}
                      </div>
                      <form onSubmit={handleLogSet}>
                        <div className="form-row">
                          <div className="form-group">
                            <input className="form-input" type="number" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} step="0.5" min="0" />
                          </div>
                          <div className="form-group">
                            <input className="form-input" type="number" placeholder="reps" value={reps} onChange={(e) => setReps(e.target.value)} min="0" />
                          </div>
                          <button className="btn btn--primary" type="submit">
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                        </div>
                      </form>
                    </>
                  )}

                  {!timer.isRunning && es.done && (
                    <div style={{ marginTop: "var(--space-md)" }}>
                      <button className="btn btn--ghost btn--full" onClick={handleAddExtraSet}>
                        <FontAwesomeIcon icon={faPlus} /> Serie extra
                      </button>
                    </div>
                  )}

                  {!timer.isRunning && es.sets.length >= es.targetSets && !es.done && (
                    <div className="form-actions">
                      <button className="btn btn--primary btn--full" onClick={handleSaveExercise}>
                        Salvar Exercicio
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {totalCount > 1 && (
        <div className="card-nav">
          <button
            className="card-nav__btn"
            onClick={goPrev}
            disabled={!canGoPrev || timer.isRunning}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="card-nav__indicator">
            {totalCount - doneCount} restantes
          </span>
          <button
            className="card-nav__btn"
            onClick={goNext}
            disabled={!canGoNext || timer.isRunning}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      )}

      {/* Add exercise (free mode) */}
      {isFreeMode && (
        <>
          {!showPicker ? (
            <button
              className="btn btn--secondary btn--full"
              onClick={() => setShowPicker(true)}
              style={{ marginTop: "var(--space-md)" }}
            >
              <FontAwesomeIcon icon={faPlus} /> Adicionar Exercicio
            </button>
          ) : (
            <div className="inline-form" style={{ marginTop: "var(--space-md)" }}>
              <div className="form-group" style={{ marginBottom: "var(--space-md)" }}>
                <input
                  className="form-input"
                  placeholder="Buscar exercicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {Object.entries(catalogByCategory).map(([category, items]) => (
                  <div key={category} style={{ marginBottom: "var(--space-md)" }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-xs)" }}>
                      {category}
                    </div>
                    {items.map((cat) => (
                      <button
                        key={cat.id}
                        className="btn btn--ghost btn--full"
                        style={{ justifyContent: "flex-start", minHeight: 36 }}
                        onClick={() => addFromCatalog(cat)}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                ))}
                {filteredCatalog.length === 0 && (
                  <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-lg)" }}>
                    Nenhum exercicio encontrado.
                  </p>
                )}
              </div>
              <button
                className="btn btn--ghost btn--full"
                onClick={() => { setShowPicker(false); setSearchQuery(""); }}
                style={{ marginTop: "var(--space-sm)" }}
              >
                Cancelar
              </button>
            </div>
          )}
        </>
      )}

      {/* Finish */}
      <button
        className="btn btn--danger btn--full btn--lg"
        onClick={handleFinish}
        disabled={isFinishing || exerciseStates.flatMap((es) => es.sets).length === 0}
        style={{ marginTop: "var(--space-xl)" }}
      >
        <FontAwesomeIcon icon={faStop} /> {isFinishing ? "Finalizando..." : "Finalizar Treino"}
      </button>
    </div>
  );
}

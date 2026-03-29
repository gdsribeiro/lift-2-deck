// ===== Auth =====
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
}

// ===== Training Plans =====
export interface TrainingPlan {
  id: string;
  name: string;
  created_at: string;
}

export interface CreateTrainingPlanRequest {
  name: string;
}

export interface UpdateTrainingPlanRequest {
  name?: string;
}

// ===== Exercises =====
export type ExerciseType = "strength" | "cardio";

export interface Exercise {
  id: string;
  plan_id: string;
  name: string;
  muscle_group: string;
  exercise_type: ExerciseType;
  sets: number;
  reps_target: string;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
}

export interface CreateExerciseRequest {
  name: string;
  muscle_group: string;
  exercise_type?: ExerciseType;
  sets: number;
  reps_target: string;
  rest_seconds: number;
  notes?: string;
  order_index: number;
}

// ===== Workout Sessions =====
export interface WorkoutSession {
  id: string;
  plan_id: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  ai_feedback: string | null;
}

export interface WorkoutLog {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  duration_min: number | null;
  distance_km: number | null;
  logged_at: string;
}

export interface CreateWorkoutLogRequest {
  exercise_id?: string;
  exercise_name: string;
  set_number: number;
  weight_kg?: number;
  reps?: number;
  duration_min?: number;
  distance_km?: number;
}

// ===== Plan Detail (eager load) =====
export interface PlanDetail extends TrainingPlan {
  exercises: Exercise[];
}

// ===== History =====
export interface WorkoutSessionDetail extends WorkoutSession {
  logs: WorkoutLog[];
  plan_name: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total: number;
}

// ===== Exercise Catalog =====
export interface CatalogExercise {
  id: string;
  name: string;
  category: string;
  exercise_type: ExerciseType;
}

// ===== Score =====
export type ScoreTier = "retomando" | "aquecendo" | "no-ritmo" | "forte" | "imparavel";

export interface DashboardStats {
  days_this_week: number;
  weekly_volume: number;
  streak: number;
}

// ===== Evolution =====
export interface EvolutionDataPoint {
  date: string;
  value: number;
}

export type EvolutionGroupBy = "volume" | "frequency" | "duration" | "distance";

export interface EvolutionResponse {
  data_points: EvolutionDataPoint[];
  group_by: EvolutionGroupBy;
}

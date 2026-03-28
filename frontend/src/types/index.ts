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
  description: string | null;
  created_at: string;
}

export interface CreateTrainingPlanRequest {
  name: string;
  description?: string;
}

export interface UpdateTrainingPlanRequest {
  name?: string;
  description?: string;
}

// ===== Series =====
export interface Series {
  id: string;
  plan_id: string;
  name: string;
  order_index: number;
}

export interface CreateSeriesRequest {
  name: string;
  order_index: number;
}

// ===== Exercises =====
export interface Exercise {
  id: string;
  series_id: string;
  name: string;
  muscle_group: string;
  sets: number;
  reps_target: string;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
}

export interface CreateExerciseRequest {
  name: string;
  muscle_group: string;
  sets: number;
  reps_target: string;
  rest_seconds: number;
  notes?: string;
  order_index: number;
}

// ===== Workout Sessions =====
export interface WorkoutSession {
  id: string;
  series_id: string | null;
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
  logged_at: string;
}

export interface CreateWorkoutLogRequest {
  exercise_id?: string;
  exercise_name: string;
  set_number: number;
  weight_kg?: number;
  reps?: number;
}

// ===== Cardio =====
export interface CardioLog {
  id: string;
  activity: string;
  duration_min: number;
  distance_km: number | null;
  pace_min_km: number | null;
  logged_at: string;
  notes: string | null;
}

export interface CreateCardioLogRequest {
  activity: string;
  duration_min: number;
  distance_km?: number;
  pace_min_km?: number;
  notes?: string;
}

// ===== Plan Detail (eager load) =====
export interface PlanDetail extends TrainingPlan {
  series: SeriesWithExercises[];
}

export interface SeriesWithExercises extends Series {
  exercises: Exercise[];
}

// ===== History =====
export interface WorkoutSessionDetail extends WorkoutSession {
  logs: WorkoutLog[];
  series_name: string | null;
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
}

// ===== Dashboard =====
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

export interface EvolutionResponse {
  data_points: EvolutionDataPoint[];
  group_by: "volume" | "frequency";
}

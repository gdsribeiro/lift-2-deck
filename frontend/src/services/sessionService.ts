import client from "../api/client";
import type { WorkoutSession, WorkoutLog, CreateWorkoutLogRequest } from "../types";

export async function startSession(seriesId?: string): Promise<WorkoutSession> {
  const response = await client.post<WorkoutSession>("/sessions", { series_id: seriesId });
  return response.data;
}

export async function getActiveSession(): Promise<WorkoutSession | null> {
  try {
    const response = await client.get<WorkoutSession>("/sessions/active");
    return response.data;
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function logSet(sessionId: string, data: CreateWorkoutLogRequest): Promise<WorkoutLog> {
  const response = await client.post<WorkoutLog>(`/sessions/${sessionId}/logs`, data);
  return response.data;
}

export async function deleteLog(sessionId: string, logId: string): Promise<void> {
  await client.delete(`/sessions/${sessionId}/logs/${logId}`);
}

export async function finishSession(
  sessionId: string,
  options?: { notes?: string; logs?: CreateWorkoutLogRequest[] }
): Promise<WorkoutSession> {
  const response = await client.patch<WorkoutSession>(`/sessions/${sessionId}/finish`, {
    notes: options?.notes,
    logs: options?.logs,
  });
  return response.data;
}

function isAxiosError(error: unknown): error is { response?: { status: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}

import client from "../api/client";
import type { WorkoutSession, WorkoutLog, CreateWorkoutLogRequest } from "../types";

export async function startSession(planId?: string): Promise<WorkoutSession> {
  const response = await client.post<WorkoutSession>("/sessions", { plan_id: planId });
  return response.data;
}

export async function getActiveSession(): Promise<WorkoutSession | null> {
  const response = await client.get<WorkoutSession | null>("/sessions/active");
  return response.data;
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

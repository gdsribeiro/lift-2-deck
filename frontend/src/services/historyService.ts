import client from "../api/client";
import type { PaginatedResponse, WorkoutSessionDetail } from "../types";

export async function getHistory(page = 1, limit = 20): Promise<PaginatedResponse<WorkoutSessionDetail>> {
  const response = await client.get<PaginatedResponse<WorkoutSessionDetail>>("/history", {
    params: { page, limit },
  });
  return response.data;
}

export async function getSessionDetail(sessionId: string): Promise<WorkoutSessionDetail> {
  const response = await client.get<WorkoutSessionDetail>(`/history/${sessionId}`);
  return response.data;
}

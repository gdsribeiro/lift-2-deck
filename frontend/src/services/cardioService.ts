import client from "../api/client";
import type { CardioLog, CreateCardioLogRequest } from "../types";

export async function getCardioLogs(params?: { from?: string; to?: string }): Promise<CardioLog[]> {
  const response = await client.get<CardioLog[]>("/cardio", { params });
  return response.data;
}

export async function createCardioLog(data: CreateCardioLogRequest): Promise<CardioLog> {
  const response = await client.post<CardioLog>("/cardio", data);
  return response.data;
}

export async function updateCardioLog(logId: string, data: Partial<CreateCardioLogRequest>): Promise<CardioLog> {
  const response = await client.put<CardioLog>(`/cardio/${logId}`, data);
  return response.data;
}

export async function deleteCardioLog(logId: string): Promise<void> {
  await client.delete(`/cardio/${logId}`);
}

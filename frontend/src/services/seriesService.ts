import client from "../api/client";
import type { Series, CreateSeriesRequest } from "../types";

export async function createSeries(planId: string, data: CreateSeriesRequest): Promise<Series> {
  const response = await client.post<Series>(`/plans/${planId}/series`, data);
  return response.data;
}

export async function updateSeries(seriesId: string, data: Partial<CreateSeriesRequest>): Promise<Series> {
  const response = await client.put<Series>(`/series/${seriesId}`, data);
  return response.data;
}

export async function deleteSeries(seriesId: string): Promise<void> {
  await client.delete(`/series/${seriesId}`);
}

export async function reorderSeries(items: Array<{ id: string; order_index: number }>): Promise<void> {
  await client.patch("/series/reorder", items);
}

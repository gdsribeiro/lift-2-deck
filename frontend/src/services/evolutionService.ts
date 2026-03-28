import client from "../api/client";
import type { EvolutionResponse } from "../types";

export async function getEvolution(params: {
  exercise_id?: string;
  from?: string;
  to?: string;
  group_by?: "volume" | "frequency";
  bucket?: "day" | "week" | "month";
}): Promise<EvolutionResponse> {
  const response = await client.get<EvolutionResponse>("/evolution", { params });
  return response.data;
}

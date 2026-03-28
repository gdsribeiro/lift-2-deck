import client from "../api/client";
import type { CatalogExercise } from "../types";

export async function getCatalog(params?: {
  category?: string;
  q?: string;
}): Promise<CatalogExercise[]> {
  const response = await client.get<CatalogExercise[]>("/catalog", { params });
  return response.data;
}

export async function addExercise(data: {
  name: string;
  category: string;
}): Promise<CatalogExercise> {
  const response = await client.post<CatalogExercise>("/catalog", data);
  return response.data;
}

export async function deleteExercise(id: string): Promise<void> {
  await client.delete(`/catalog/${id}`);
}

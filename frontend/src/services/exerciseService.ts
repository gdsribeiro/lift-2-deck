import client from "../api/client";
import type { Exercise, CreateExerciseRequest } from "../types";

export async function createExercise(seriesId: string, data: CreateExerciseRequest): Promise<Exercise> {
  const response = await client.post<Exercise>(`/series/${seriesId}/exercises`, data);
  return response.data;
}

export async function updateExercise(exerciseId: string, data: Partial<CreateExerciseRequest>): Promise<Exercise> {
  const response = await client.put<Exercise>(`/exercises/${exerciseId}`, data);
  return response.data;
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  await client.delete(`/exercises/${exerciseId}`);
}

export async function reorderExercises(items: Array<{ id: string; order_index: number }>): Promise<void> {
  await client.patch("/exercises/reorder", items);
}

import client from "../api/client";
import type {
  TrainingPlan,
  CreateTrainingPlanRequest,
  UpdateTrainingPlanRequest,
  PlanDetail,
} from "../types";

export async function getPlans(): Promise<TrainingPlan[]> {
  const response = await client.get<TrainingPlan[]>("/plans");
  return response.data;
}

export async function getPlanDetail(planId: string): Promise<PlanDetail> {
  const response = await client.get<PlanDetail>(`/plans/${planId}`);
  return response.data;
}

export async function createPlan(data: CreateTrainingPlanRequest): Promise<TrainingPlan> {
  const response = await client.post<TrainingPlan>("/plans", data);
  return response.data;
}

export async function updatePlan(planId: string, data: UpdateTrainingPlanRequest): Promise<TrainingPlan> {
  const response = await client.put<TrainingPlan>(`/plans/${planId}`, data);
  return response.data;
}

export async function deletePlan(planId: string): Promise<void> {
  await client.delete(`/plans/${planId}`);
}

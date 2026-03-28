import client from "../api/client";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "../types";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>("/auth/login", data);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>("/auth/register", data);
  return response.data;
}

export async function refresh(): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>("/auth/refresh");
  return response.data;
}

export async function me(): Promise<User> {
  const response = await client.get<User>("/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  await client.post("/auth/logout");
}

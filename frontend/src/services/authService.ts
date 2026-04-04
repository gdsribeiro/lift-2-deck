import axios from "axios";
import client from "../api/client";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>("/auth/login", data);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await client.post<AuthResponse>("/auth/register", data);
  return response.data;
}

export async function refresh(): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(
    `${API_BASE_URL}/api/v1/auth/refresh`,
    {},
    { withCredentials: true }
  );
  return response.data;
}

export async function me(): Promise<User> {
  const response = await client.get<User>("/auth/me");
  return response.data;
}

export async function logout(): Promise<void> {
  await client.post("/auth/logout");
}

export async function updateEmail(data: { email: string }): Promise<User> {
  const response = await client.put<User>("/auth/email", data);
  return response.data;
}

export async function deleteAccount(): Promise<void> {
  await client.delete("/auth/account");
}

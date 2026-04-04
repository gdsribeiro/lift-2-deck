import client from "../api/client";
import type { AvatarCrop, UpdateProfileRequest, User } from "../types";

export async function getProfile(): Promise<User> {
  const response = await client.get<User>("/profile");
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<User> {
  const response = await client.put<User>("/profile", data);
  return response.data;
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await client.post<User>("/profile/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateAvatarCrop(crop: AvatarCrop): Promise<User> {
  const response = await client.put<User>("/profile/crop", { crop });
  return response.data;
}

export async function suggestNickname(): Promise<string> {
  const response = await client.get<{ nickname: string }>("/profile/nickname/suggest");
  return response.data.nickname;
}

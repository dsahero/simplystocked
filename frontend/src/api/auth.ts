<<<<<<< HEAD
import { apiFetch, setToken } from './client';
=======
import { apiFetch } from './client';
>>>>>>> invoice

export interface ApiUser {
  UserId: number;
  Username: string;
<<<<<<< HEAD
  Email?: string;
  Role: string;
  access_token?: string;
}

export async function loginUser(username: string, password: string) {
  const user = await apiFetch<ApiUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (user.access_token) setToken(user.access_token);
  return user;
}

export async function loginWithGoogleApi(credential: string) {
  const user = await apiFetch<ApiUser>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  if (user.access_token) setToken(user.access_token);
  return user;
=======
  Role: string;
}

export function loginUser(username: string, password: string) {
  return apiFetch<ApiUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
>>>>>>> invoice
}

export function getAllUsers() {
  return apiFetch<ApiUser[]>('/auth/users');
}

<<<<<<< HEAD
export function createUser(username: string, password: string, email: string, role: string) {
  return apiFetch<ApiUser>('/auth/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, email, role }),
=======
export function createUser(username: string, password: string, role: string) {
  return apiFetch<ApiUser>('/auth/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
>>>>>>> invoice
  });
}

export function updateUserRole(userId: number, role: string) {
  return apiFetch<ApiUser>(`/auth/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export function updatePassword(userId: number, current_password: string, new_password: string) {
  return apiFetch<{ message: string }>(`/auth/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function deleteUser(userId: number) {
  return apiFetch<{ message: string }>(`/auth/users/${userId}`, { method: 'DELETE' });
}

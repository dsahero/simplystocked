import { apiFetch } from './client';

export interface ApiUser {
  UserId: number;
  Username: string;
  Role: string;
}

export function loginUser(username: string, password: string) {
  return apiFetch<ApiUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function getAllUsers() {
  return apiFetch<ApiUser[]>('/auth/users');
}

export function createUser(username: string, password: string, role: string) {
  return apiFetch<ApiUser>('/auth/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
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

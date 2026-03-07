import { apiFetch, setTokens, clearTokens } from './api';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface UserOut {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  theme: string;
  language: string;
  unit: string;
  timezone: string;
  created_at: string;
}

export async function login(email: string, password: string): Promise<UserOut> {
  const tokens = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(tokens.access_token, tokens.refresh_token);
  return getMe();
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<UserOut> {
  await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  });
  return login(email, password);
}

export async function getMe(): Promise<UserOut> {
  return apiFetch<UserOut>('/api/users/me');
}

export async function updateMe(data: Partial<{
  first_name: string;
  last_name: string;
  theme: string;
  language: string;
  unit: string;
}>): Promise<UserOut> {
  return apiFetch<UserOut>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch('/api/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export function logout() {
  clearTokens();
}

// import { BASE_URL } from "$lib/http";
export const BASE_URL = "https://test-exam-backend-5yh6.onrender.com";
export type BackendRole = 'student' | 'teacher' | 'admin' | 'institute';

export type LoginResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    users: Array<{
      _id: string;
      firstName?: string;
      lastName?: string;
      image?: string;
    }>;
    id: string;
    token?: string;
  };
};

export async function googleLogin(params: {
  idToken: string;
  role?: BackendRole;
}): Promise<LoginResponse> {
  const url = `${BASE_URL}/api/v1/users/google`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    // credentials: 'include',
    body: JSON.stringify(params)
  });

  const data: LoginResponse = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Google authentication failed');
  }

  return data;
}
import { apiRequest } from "../../http/api";
export type BackendRole = 'student' | 'teacher' | 'admin' | 'institute';
export type AccountType = 'student' | 'tutor' | 'institute';

export type LoginUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  image?: string;
};

export type LoginResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    users: LoginUser[];
    id: string;
    token?: string;
  };
};

export async function googleLogin(params: {
  idToken: string;
  role?: BackendRole;
}) {
  return apiRequest<LoginResponse>({
    endpoint: '/api/v1/users/google',
    method: 'POST',
    data: params
  });
}
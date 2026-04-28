import { apiRequest } from '../../http/api';

export type UserDashboardStats = {
  teachersCount: number;
  studentsCount: number;
  batchesCount: number;
  testsCount: number;
  inbatchCount: number;
  blockedTeachersCount: number;
  blockedStudentsCount: number;
};

export type UserDashboardData = {
  _id: string;
  firstName?: string;
  lastName?: string;
  subscription?: {
    isSubscribed: boolean;
    isTrial: boolean;
    planId: string | null;
    expiry: string | null;
    trialUsed: boolean;
  } | null;
  preferredExamIds?: string[];
  preferredSubjectIds?: string[];
  batchApproved?: boolean;
  stats?: UserDashboardStats;
  instituteId?: unknown;
  teacherId?: unknown;
};

export type UserDashboardApiBody = {
  success: boolean;
  statusCode: number;
  message: string;
  data: UserDashboardData;
};

export async function fetchUserDashboard(params: { token?: string | null; fetch?: typeof fetch }) {
  return apiRequest<UserDashboardApiBody>({
    endpoint: '/api/v1/users/dashboard',
    method: 'GET',
    token: params.token,
    fetch: params.fetch
  });
}


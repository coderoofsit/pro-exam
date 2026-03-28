import { BASE_URL } from '$lib/http';
import { apiRequest } from '../../http/api';

export type BackendRole = 'student' | 'teacher' | 'admin' | 'institute';
export type AccountType = 'student' | 'tutor' | 'institute';

export type LinkedProfile = {
  _id: string;
  firstName?: string;
  lastName?: string;
};

export type LoginUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  instituteId?: LinkedProfile | null;
  teacherId?: LinkedProfile | null;
  adminId?: LinkedProfile | null;
};

export type GoogleLoginData = {
  users: LoginUser[];
  id: string;
  token: string | null;
  role: BackendRole;
};

export type LoginResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: GoogleLoginData;
};

/** Per-profile subscription from GET /api/v1/users/membership */
export type MembershipSubscription = {
	isSubscribed: boolean;
	isTrial: boolean;
	planId: string | null;
	expiry: string | null;
	trialUsed: boolean;
};

export type MembershipUser = {
	/** Membership row id — use as `membershipId` for select-membership. */
	_id: string;
	/** Actual user profile id — use as `userProfiledId` when switching default profile. */
	userProfileId?: string;
	firstName?: string;
	lastName?: string;
	image?: string;
	/** When true, this profile is the account default — shown first in the topbar list. */
	defaultProfile?: boolean;
	subscription?: MembershipSubscription | null;
};

export type MembershipResponse = {
  ok: boolean;
  statusCode: number;
  message: string;
  data?: {
    users: MembershipUser[];
  };
};

export type CreateMembershipResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    token: string | null;
    users: LoginUser[];
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

export async function getMembershipUsers(token?: string | null) {
  return apiRequest<MembershipResponse>({
    endpoint: '/api/v1/users/membership',
    method: 'GET',
    token
  });
}

/** POST /api/v1/users/select-membership — set which profile is the account default. */
export async function selectMembershipProfile(params: {
  membershipId: string;
  /** Backend key name (typo preserved for API compatibility). */
  userProfiledId: string;
  token?: string | null;
}) {
  return apiRequest<{ ok?: boolean; message?: string; data?: unknown }>({
    endpoint: '/api/v1/users/select-membership',
    method: 'POST',
    data: {
      membershipId: params.membershipId,
      userProfiledId: params.userProfiledId
    },
    token: params.token
  });
}

export async function createMembershipProfile(params: {
  userId: string;
  role: 'student' | 'teacher' | 'institute';
  firstName: string;
  lastName: string;
  preferredExamIds: string[];
  imageFile?: File | null;
  token?: string | null;
}) {
  const formData = new FormData();
  formData.append('userId', params.userId);
  formData.append('role', params.role);
  formData.append('firstName', params.firstName);
  formData.append('lastName', params.lastName);

  params.preferredExamIds.forEach((id) => {
    formData.append('preferredExamIds[]', id);
  });

  if (params.imageFile) {
    formData.append('image', params.imageFile);
  }

  const headers: Record<string, string> = {};
  if (params.token) {
    headers['Authorization'] = `Bearer ${params.token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1/users/membership`, {
    method: 'POST',
    headers,
    body: formData
  });

  let result: CreateMembershipResponse | null = null;

  try {
    result = await res.json();
  } catch {
    result = null;
  }

  if (!res.ok) {
    return {
      success: false as const,
      message: result?.message || 'Failed to create profile',
      status: res.status,
      error: result
    };
  }

  return {
    success: true as const,
    data: result,
    message: result?.message,
    status: res.status
  };
}
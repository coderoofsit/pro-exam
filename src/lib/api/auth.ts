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

/** GET /membership may return a string id or a populated profile (same id + email/phone for all rows). */
export type MembershipUserProfileRef =
	| string
	| {
			_id: string;
			email?: string | null;
			phone?: string | null;
	  };

export type MembershipUser = {
	/** Membership row id — use as `membershipId` for select-membership. */
	_id: string;
	/** Profile id string or populated `{ _id, email, phone }`. */
	userProfileId?: MembershipUserProfileRef;
	firstName?: string;
	lastName?: string;
	image?: string;
	/** When true, this profile is the account default — shown first in the topbar list. */
	defaultProfile?: boolean;
	subscription?: MembershipSubscription | null;
};

/** Normalize membership `userProfileId` for API calls and UI (email/phone prefill, sidebar). */
export function normalizeMembershipProfileRef(
	ref: MembershipUserProfileRef | undefined | null
): {
	userProfileId: string | undefined;
	email: string | undefined;
	phone: string | undefined;
} {
	if (ref == null) {
		return { userProfileId: undefined, email: undefined, phone: undefined };
	}
	if (typeof ref === 'string') {
		const id = ref.trim();
		return { userProfileId: id || undefined, email: undefined, phone: undefined };
	}
	const id = ref._id?.trim();
	const email = ref.email?.trim() || undefined;
	const phone =
		ref.phone != null && String(ref.phone).trim() ? String(ref.phone).trim() : undefined;
	return { userProfileId: id || undefined, email, phone };
}

/** GET /api/v1/users/membership — backend may use `success` or legacy `ok`. */
export type MembershipResponse = {
  ok?: boolean;
  success?: boolean;
  statusCode: number;
  message: string;
  data?: {
    users: MembershipUser[];
  };
};

/** POST /api/v1/users/select-membership — new JWT + full users list. */
export type SelectMembershipApiBody = {
  success: boolean;
  statusCode?: number;
  message?: string;
  data: {
    token: string;
    users: MembershipUser[];
    fcmToken?: string | null;
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

export async function getMembershipUsers(fetchFn?: typeof fetch, token?: string | null) {
  return apiRequest<MembershipResponse>({
    endpoint: '/api/v1/users/membership',
    method: 'GET',
    fetch: fetchFn,
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
  return apiRequest<SelectMembershipApiBody>({
    endpoint: '/api/v1/users/select-membership',
    method: 'POST',
    data: {
      membershipId: params.membershipId,
      userProfiledId: params.userProfiledId
    },
    token: params.token
  });
}

export type GetMembershipsResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    image?: string | null;
    isActive?: boolean;
    defaultProfile?: boolean;
    preferredExams?: { _id: string; name?: { en?: string; hi?: string } | string; image?: string | null; slug?: string }[];
    userProfileDetails?: {
      _id: string;
      email: string;
      phone?: string | null;
      countryCode?: number;
      isVerified: boolean;
      isVerifiedPhone: boolean;
      authProvider?: string;
      role?: string;
      isActive?: boolean;
    };
    allProfiles?: {
      _id: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      defaultProfile?: boolean;
      isActive?: boolean;
      teacherId?: { _id: string; firstName?: string; lastName?: string; role?: string } | null;
      instituteId?: { _id: string; firstName?: string; lastName?: string; role?: string } | null;
      adminId?: { _id: string; firstName?: string; lastName?: string; role?: string } | null;
      preferredExams?: { _id: string; name?: { en?: string; hi?: string } | string; image?: string | null; slug?: string }[];
    }[];
  };
};

export async function getMembershipsDetail(params: {
  membershipId: string;
  userProfiledId: string;
  token?: string | null;
}) {
  return apiRequest<GetMembershipsResponse>({
    endpoint: `/api/v1/users/get-memberships?membershipId=${params.membershipId}&userProfiledId=${params.userProfiledId}`,
    method: 'GET',
    token: params.token
  });
}

export async function updatePhone(params: { email: string; phone: string; token?: string | null }) {
  return apiRequest<{ success: boolean; statusCode: number; message: string }>({
    endpoint: '/api/v1/users/phone',
    method: 'PATCH',
    data: { email: params.email, phone: params.phone },
    token: params.token
  });
}

export async function sendPhoneOtp(params: { phone: string; token?: string | null }) {
  return apiRequest<{ success: boolean; statusCode: number; message: string }>({
    endpoint: '/api/v1/users/otp/phone',
    method: 'POST',
    data: { phone: params.phone },
    token: params.token
  });
}

export async function verifyPhoneOtp(params: {
  phone: string;
  otp: number;
  token?: string | null;
}) {
  return apiRequest<{ success: boolean; statusCode: number; message: string }>({
    endpoint: '/api/v1/users/otp/phone/verify',
    method: 'POST',
    data: { phone: params.phone, otp: params.otp },
    token: params.token
  });
}

export async function updateFcmToken(params: {
  fcmToken: string;
  token?: string | null;
}) {
  return apiRequest<{ success: boolean; statusCode: number; message: string }>({
    endpoint: '/api/v1/users/update-fcm',
    method: 'PATCH',
    data: { fcmToken: params.fcmToken },
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
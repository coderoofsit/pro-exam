
import { writable, get } from "svelte/store";
import {
  deriveOwnedContext,
  normalizeOwnedId,
  type AccountType,
  type LoginResponse,
  type LoginUser,
  type LinkedProfile,
  type MembershipSubscription,
  type MembershipUser,
  normalizeMembershipProfileRef,
} from "$lib/api/auth";

export type AuthLinkedProfile = {
  _id: string;
  firstName?: string;
  lastName?: string;
};

export type AuthUser = {
  /** Membership row id from GET /membership (distinct per listed profile). */
  _id: string;
  /** When true, teacher may create batches (from GET /membership). */
  batchApproved?: boolean;
  /** Profile document id — required for select-membership when present on API. */
  userProfileId?: string;
  /** From populated GET /membership `userProfileId` (shared across profiles). */
  profileEmail?: string;
  profilePhone?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  instituteId?: AuthLinkedProfile | null;
  teacherId?: AuthLinkedProfile | null;
  adminId?: AuthLinkedProfile | null;
  defaultProfile?: boolean;
  subscription?: MembershipSubscription | null;
};

export type AuthState = {
  users: AuthUser[];
  token: string | null;
  role: AccountType | null;
  profileId: string | null;
  ownedBy: string | null;
  ownedRole: string | null;
  isAuthenticated: boolean;
};

/** Key used for JWT in `localStorage` (also read by API token resolution before store hydrates). */
export const AUTH_STORAGE_KEY = "auth_token";
/** Cookie key for selected account role used for server-side redirects. */
export const AUTH_ROLE_STORAGE_KEY = "auth_role";
/** Cookie key for FCM token mirrored by `/auth/session`. */
export const FCM_TOKEN_STORAGE_KEY = "fcm_token";
const AUTH_PROFILE_ID_KEY = "auth_profile_id";
/** HttpOnly cookies mirrored by `/auth/session` for SSR API calls. */
export const AUTH_OWNED_BY_KEY = "owned_by";
export const AUTH_OWNED_ROLE_KEY = "owned_role";
const OWNED_BY_KEY = AUTH_OWNED_BY_KEY;
const OWNED_ROLE_KEY = AUTH_OWNED_ROLE_KEY;

const initialState: AuthState = {
  users: [],
  token: null,
  role: null,
  profileId: null,
  ownedBy: null,
  ownedRole: null,
  isAuthenticated: false,
};

function persistOwned(ownedBy: string | null, ownedRole: string | null) {
  if (typeof localStorage === "undefined") return;
  if (ownedBy) localStorage.setItem(OWNED_BY_KEY, ownedBy);
  else localStorage.removeItem(OWNED_BY_KEY);
  if (ownedRole) localStorage.setItem(OWNED_ROLE_KEY, ownedRole);
  else localStorage.removeItem(OWNED_ROLE_KEY);
}

function readPersistedOwned(): { ownedBy: string | null; ownedRole: string | null } {
  if (typeof localStorage === "undefined") {
    return { ownedBy: null, ownedRole: null };
  }
  return {
    ownedBy: localStorage.getItem(OWNED_BY_KEY)?.trim() || null,
    ownedRole: localStorage.getItem(OWNED_ROLE_KEY)?.trim() || null,
  };
}

/** Browser-only fallback when auth store has not hydrated yet. */
export function getPersistedOwnedContext(): {
  ownedBy: string | null;
  ownedRole: string | null;
} {
  return readPersistedOwned();
}

function mapLinkedProfile(
  profile?: LinkedProfile | null,
): AuthLinkedProfile | null {
  if (!profile) return null;

  return {
    _id: profile._id,
    firstName: profile.firstName,
    lastName: profile.lastName,
  };
}

function mapLinkedProfileFromUnknown(value: unknown): AuthLinkedProfile | null {
  const id = normalizeOwnedId(value);
  if (!id) return null;
  if (value && typeof value === "object" && "firstName" in value) {
    const p = value as LinkedProfile;
    return {
      _id: id,
      firstName: p.firstName,
      lastName: p.lastName,
    };
  }
  return { _id: id };
}

export function mapMembershipUserToAuthUser(user: MembershipUser): AuthUser {
  const prof = normalizeMembershipProfileRef(user.userProfileId);

  return {
    _id: user._id,
    batchApproved: user.batchApproved,
    userProfileId: prof.userProfileId,
    profileEmail: prof.email,
    profilePhone: prof.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
    defaultProfile: user.defaultProfile,
    freeTrialNotification: !!user.freeTrialNotification,
    subscriptionGoingToEnd: !!user.subscriptionGoingToEnd,
    subscriptionExpired: !!user.subscriptionExpired,
    subscription: user.subscription
      ? {
          isSubscribed: !!user.subscription.isSubscribed,
          isTrial: !!user.subscription.isTrial,
          planId: user.subscription.planId ?? null,
          expiry: user.subscription.expiry ?? null,
          trialUsed: !!user.subscription.trialUsed,
        }
      : null,
    instituteId: mapLinkedProfileFromUnknown(user.instituteId),
    teacherId: mapLinkedProfileFromUnknown(user.teacherId),
    adminId: mapLinkedProfileFromUnknown(user.adminId),
  };
}

function mapBackendRoleToAccountType(
  backendRole?: "student" | "teacher" | "admin" | "institute" | null,
): AccountType | null {
  if (backendRole === "teacher") return "tutor";
  if (backendRole === "institute") return "institute";
  if (backendRole === "student") return "student";
  return null;
}

/**
 * JWT session cookie is managed by server endpoints (`/auth/session`, `/logout`).
 * Client store keeps token in memory only.
 */
function persistToken(token: string | null) {
  // no-op: token persistence is server-managed via httpOnly cookie
  void token;
}

function persistProfileId(profileId: string | null) {
  if (typeof localStorage === "undefined") return;

  if (profileId) {
    localStorage.setItem(AUTH_PROFILE_ID_KEY, profileId);
  } else {
    localStorage.removeItem(AUTH_PROFILE_ID_KEY);
  }
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    setAuth(data: {
      users: AuthUser[];
      token: string | null;
      role: AccountType | null;
      profileId: string | null;
      ownedBy?: string | null;
      ownedRole?: string | null;
    }) {
      const persisted = readPersistedOwned();
      const derived = deriveOwnedContext({ users: data.users });
      const ownedBy =
        data.ownedBy ?? persisted.ownedBy ?? derived.ownedBy;
      const ownedRole =
        data.ownedRole ?? persisted.ownedRole ?? derived.ownedRole;
      const authData: AuthState = {
        users: data.users,
        token: data.token,
        role: data.role,
        profileId: data.profileId,
        ownedBy,
        ownedRole,
        isAuthenticated: !!data.token,
      };
      persistOwned(ownedBy, ownedRole);

      persistToken(data.token);
      persistProfileId(data.profileId);
      set(authData);
    },

    setAuthAfterMembership(data: {
      token: string | null;
      users: AuthUser[];
      role: AccountType | null;
      ownedBy?: string | null;
      ownedRole?: string | null;
    }) {
      persistToken(data.token);
      const derived = deriveOwnedContext({ users: data.users });
      const prev = get({ subscribe });
      const ownedBy =
        data.ownedBy !== undefined
          ? data.ownedBy
          : (prev.ownedBy ?? derived.ownedBy);
      const ownedRole =
        data.ownedRole !== undefined
          ? data.ownedRole
          : (prev.ownedRole ?? derived.ownedRole);
      if (ownedBy || ownedRole) {
        persistOwned(ownedBy, ownedRole);
      }

      update((state) => ({
        ...state,
        token: data.token,
        users: data.users,
        role: data.role,
        ownedBy: data.ownedBy !== undefined ? (data.ownedBy ?? null) : state.ownedBy,
        ownedRole:
          data.ownedRole !== undefined ? (data.ownedRole ?? null) : state.ownedRole,
        isAuthenticated: !!data.token,
      }));
    },

    setAuthFromLoginResponse(
      response: LoginResponse,
      selectedRole?: AccountType | null,
    ) {
      const payload = response?.data;

      const usersFromApi = payload?.users ?? [];
      const token = payload?.token ?? null;
      const profileId = payload?.id ?? null;
      const backendRole = payload?.role ?? null;
      const { ownedBy, ownedRole } = deriveOwnedContext({
        ownedBy: payload?.ownedBy,
        ownedRole: payload?.ownedRole,
        users: usersFromApi,
      });

      const mappedUsers: AuthUser[] = usersFromApi.map((user: LoginUser) => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        instituteId: mapLinkedProfile(user.instituteId),
        teacherId: mapLinkedProfile(user.teacherId),
        adminId: mapLinkedProfile(user.adminId),
        defaultProfile: user.defaultProfile,
      }));

      const mappedRole: AccountType | null =
        selectedRole ?? mapBackendRoleToAccountType(backendRole);

      const authData: AuthState = {
        users: mappedUsers,
        token,
        role: mappedRole,
        profileId,
        ownedBy,
        ownedRole,
        isAuthenticated: !!token,
      };

      persistToken(token);
      persistProfileId(profileId);
      persistOwned(ownedBy, ownedRole);
      set(authData);
    },

    restore() {
      const token = null;
      const profileId = localStorage.getItem(AUTH_PROFILE_ID_KEY);
      const { ownedBy, ownedRole } = readPersistedOwned();

      update((state) => ({
        ...state,
        token,
        profileId,
        ownedBy,
        ownedRole,
        isAuthenticated: !!token,
      }));
    },

    restoreToken() {
      const token = null;
      const profileId = localStorage.getItem(AUTH_PROFILE_ID_KEY);
      const { ownedBy, ownedRole } = readPersistedOwned();

      update((state) => ({
        ...state,
        token,
        profileId,
        ownedBy,
        ownedRole,
        isAuthenticated: !!token,
      }));
    },

    setUsers(users: AuthUser[]) {
      const derived = deriveOwnedContext({ users });
      update((state) => {
        const ownedBy = state.ownedBy ?? derived.ownedBy;
        const ownedRole = state.ownedRole ?? derived.ownedRole;
        if (ownedBy || ownedRole) persistOwned(ownedBy, ownedRole);
        return {
          ...state,
          users,
          ownedBy,
          ownedRole,
        };
      });
    },

    setRole(role: AccountType | null) {
      update((state) => ({
        ...state,
        role,
      }));
    },

    setProfileId(profileId: string | null) {
      persistProfileId(profileId);

      update((state) => ({
        ...state,
        profileId,
      }));
    },

    updateUser(updatedUser: Partial<AuthUser> & { _id: string }) {
      update((state) => ({
        ...state,
        users: state.users.map((user) =>
          user._id === updatedUser._id ? { ...user, ...updatedUser } : user,
        ),
      }));
    },

    clearUserData() {
      persistProfileId(null);
      persistOwned(null, null);

      update((state) => ({
        ...state,
        users: [],
        role: null,
        profileId: null,
        ownedBy: null,
        ownedRole: null,
      }));
    },

    getToken() {
      return get({ subscribe }).token;
    },

    logout() {
      persistToken(null);
      persistProfileId(null);
      persistOwned(null, null);
      set(initialState);
    },

    clear() {
      persistToken(null);
      persistProfileId(null);
      persistOwned(null, null);
      set(initialState);
    },
  };
}

export const authStore = createAuthStore();

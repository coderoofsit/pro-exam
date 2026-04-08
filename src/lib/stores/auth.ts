
import { writable, get } from "svelte/store";
import type {
  AccountType,
  LoginResponse,
  LoginUser,
  LinkedProfile,
  MembershipSubscription,
} from "$lib/api/auth";

export type AuthLinkedProfile = {
  _id: string;
  firstName?: string;
  lastName?: string;
};

export type AuthUser = {
  /** Membership row id from GET /membership (distinct per listed profile). */
  _id: string;
  /** Profile document id — required for select-membership when present on API. */
  userProfileId?: string;
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
  isAuthenticated: boolean;
};

/** Key used for JWT in `localStorage` (also read by API token resolution before store hydrates). */
export const AUTH_STORAGE_KEY = "auth_token";
const AUTH_PROFILE_ID_KEY = "auth_profile_id";

const initialState: AuthState = {
  users: [],
  token: null,
  role: null,
  profileId: null,
  isAuthenticated: false,
};

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

function mapBackendRoleToAccountType(
  backendRole?: "student" | "teacher" | "admin" | "institute" | null,
): AccountType | null {
  if (backendRole === "teacher") return "tutor";
  if (backendRole === "institute") return "institute";
  if (backendRole === "student") return "student";
  return null;
}

/**
 * Mirror JWT to a cookie so SvelteKit `load` can send `Authorization` during SSR
 * (localStorage is not available on the server). Same name as localStorage: `auth_token`.
 */
function syncAuthTokenCookie(token: string | null) {
  if (typeof document === "undefined") return;
  const maxAgeSeconds = 60 * 60 * 24 * 30; // 30 days
  if (token) {
    const secure =
      typeof location !== "undefined" && location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${AUTH_STORAGE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${AUTH_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

function persistToken(token: string | null) {
  // Token is persisted only in cookie (plus in-memory store), not localStorage.
  syncAuthTokenCookie(token);
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
    }) {
      const authData: AuthState = {
        users: data.users,
        token: data.token,
        role: data.role,
        profileId: data.profileId,
        isAuthenticated: !!data.token,
      };

      persistToken(data.token);
      persistProfileId(data.profileId);
      set(authData);
    },

    setAuthAfterMembership(data: {
      token: string | null;
      users: AuthUser[];
      role: AccountType | null;
    }) {
      persistToken(data.token);

      update((state) => ({
        ...state,
        token: data.token,
        users: data.users,
        role: data.role,
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

      const mappedUsers: AuthUser[] = usersFromApi.map((user: LoginUser) => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        instituteId: mapLinkedProfile(user.instituteId),
        teacherId: mapLinkedProfile(user.teacherId),
        adminId: mapLinkedProfile(user.adminId),
      }));

      const mappedRole: AccountType | null =
        selectedRole ?? mapBackendRoleToAccountType(backendRole);

      const authData: AuthState = {
        users: mappedUsers,
        token,
        role: mappedRole,
        profileId,
        isAuthenticated: !!token,
      };

      persistToken(token);
      persistProfileId(profileId);
      set(authData);
    },

    restore() {
      if (typeof document === "undefined") return;
      const tokenMatch = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${AUTH_STORAGE_KEY.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}=([^;]*)`)
      );
      const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
      const profileId = localStorage.getItem(AUTH_PROFILE_ID_KEY);

      if (token) syncAuthTokenCookie(token);

      update((state) => ({
        ...state,
        token,
        profileId,
        isAuthenticated: !!token,
      }));
    },

    restoreToken() {
      if (typeof document === "undefined") return;
      const tokenMatch = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${AUTH_STORAGE_KEY.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}=([^;]*)`)
      );
      const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
      const profileId = localStorage.getItem(AUTH_PROFILE_ID_KEY);

      if (token) syncAuthTokenCookie(token);

      update((state) => ({
        ...state,
        token,
        profileId,
        isAuthenticated: !!token,
      }));
    },

    setUsers(users: AuthUser[]) {
      update((state) => ({
        ...state,
        users,
      }));
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

      update((state) => ({
        ...state,
        users: [],
        role: null,
        profileId: null,
      }));
    },

    getToken() {
      return get({ subscribe }).token;
    },

    logout() {
      persistToken(null);
      persistProfileId(null);
      set(initialState);
    },

    clear() {
      persistToken(null);
      persistProfileId(null);
      set(initialState);
    },
  };
}

export const authStore = createAuthStore();

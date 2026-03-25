
import { writable, get } from "svelte/store";
import type {
  AccountType,
  LoginResponse,
  LoginUser,
  LinkedProfile,
} from "$lib/api/auth";

export type AuthLinkedProfile = {
  _id: string;
  firstName?: string;
  lastName?: string;
};

export type AuthUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  instituteId?: AuthLinkedProfile | null;
  teacherId?: AuthLinkedProfile | null;
  adminId?: AuthLinkedProfile | null;
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

function persistToken(token: string | null) {
  if (typeof localStorage === "undefined") return;

  if (token) {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
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
      if (typeof localStorage === "undefined") return;

      const token = localStorage.getItem(AUTH_STORAGE_KEY);
      const profileId = localStorage.getItem(AUTH_PROFILE_ID_KEY);

      update((state) => ({
        ...state,
        token,
        profileId,
        isAuthenticated: !!token,
      }));
    },

    restoreToken() {
      if (typeof localStorage === "undefined") return;

      const token = localStorage.getItem(AUTH_STORAGE_KEY);
      const profileId = localStorage.getItem(AUTH_PROFILE_ID_KEY);

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

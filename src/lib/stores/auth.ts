import { writable } from 'svelte/store';
import type { AccountType, LoginResponse, LoginUser } from '$lib/api/auth';

export type AuthUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  image?: string;
};

export type AuthState = {
  users: AuthUser[];
  token: string | null;
  role: AccountType | null;
  isAuthenticated: boolean;
};

const initialState: AuthState = {
  users: [],
  token: null,
  role: null,
  isAuthenticated: false
};

const AUTH_STORAGE_KEY = 'auth';

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    setAuth(data: {
      users: AuthUser[];
      token: string | null;
      role: AccountType;
    }) {
      const authData: AuthState = {
        users: data.users,
        token: data.token,
        role: data.role,
        isAuthenticated: true
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      }

      set(authData);
    },

    setAuthFromLoginResponse(response: LoginResponse, role: AccountType) {
      const usersFromApi = response.data?.users ?? [];
      const token = response.data?.token ?? null;

      if (!usersFromApi.length) {
        throw new Error('Invalid login response');
      }

      const mappedUsers: AuthUser[] = usersFromApi.map((user: LoginUser) => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image
      }));

      const authData: AuthState = {
        users: mappedUsers,
        token,
        role,
        isAuthenticated: true
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      }

      set(authData);
    },

    restore() {
      if (typeof localStorage === 'undefined') return;

      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return;

      try {
        const parsed: AuthState = JSON.parse(raw);
        set({
          users: parsed.users ?? [],
          token: parsed.token ?? null,
          role: parsed.role ?? null,
          isAuthenticated: parsed.isAuthenticated ?? false
        });
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        set(initialState);
      }
    },

    logout() {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }

      set(initialState);
    },

    clear() {
      set(initialState);
    },

    updateUser(updatedUser: Partial<AuthUser> & { _id: string }) {
      update((state) => {
        const nextState: AuthState = {
          ...state,
          users: state.users.map((user) =>
            user._id === updatedUser._id
              ? { ...user, ...updatedUser }
              : user
          )
        };

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
        }

        return nextState;
      });
    }
  };
}

export const authStore = createAuthStore();
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import { http } from "../lib/http";

export type User = {
  id: number;
  email: string;
  name?: string;
  role?: string;
};

type AuthState = {
  // 상태
  isAuthed: boolean;
  user: User | null;
  accessToken: string | null;

  // UI
  isAuthOpen: boolean;

  // 액션
  openAuth: () => void;
  closeAuth: () => void;

  /** 로그인 */
  login: (email: string, password: string) => Promise<void>;

  /** 로그아웃 */
  logout: () => Promise<void>;

  /** 회원탈퇴 후 로그아웃 */
  deleteAccount: () => Promise<void>;

  /** /auth/me 로 내 정보 동기화 */
  fetchMe: () => Promise<void>;

  /** 미인증이면 말풍선 열고 false 반환 */
  requireAuth: () => boolean;

  /** 부팅 시 저장된 토큰을 axios 헤더에 반영 */
  initializeFromStorage: () => void;
};

const ME_ENDPOINT = "/be/auth/me";

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthed: false,
      user: null,
      accessToken: null,
      isAuthOpen: false,

      openAuth() {
        set({ isAuthOpen: true });
      },
      closeAuth() {
        set({ isAuthOpen: false });
      },

      async login(email, password) {
        const res = await http.post<{ access_token: string; token_type: "bearer" }>(
          "/be/auth/login",
          { email, password }
        );
        const token = res.data.access_token;

        // 공통 Authorization 헤더
        http.defaults.headers.common.Authorization = `Bearer ${token}`;

        set({ accessToken: token, isAuthed: true });

        await get().fetchMe();
      },

      async logout() {
        try {
          await http.post("/be/auth/logout");
        } catch {
          /* ignore */
        }
        delete http.defaults.headers.common.Authorization;
        set({
          isAuthed: false,
          user: null,
          accessToken: null,
          isAuthOpen: false,
        });
      },

      async deleteAccount() {
        try {
          await http.delete(ME_ENDPOINT);
        } catch {
          /* ignore */
        }
        await get().logout();
      },

      async fetchMe() {
        const token = get().accessToken;
        if (!token) return;

        try {
          const me = await http.get<User>(ME_ENDPOINT).then((r) => r.data);
          set({ user: me, isAuthed: true });
        } catch (e) {
          if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
            delete http.defaults.headers.common.Authorization;
            set({ isAuthed: false, user: null, accessToken: null });
            return;
          }
          // 개발 중 참고 로그
          console.debug?.("fetchMe failed:", e);
        }
      },

      requireAuth() {
        if (get().isAuthed) return true;
        get().openAuth();
        return false;
      },

      initializeFromStorage() {
        const token = get().accessToken;
        if (token) {
          http.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
          delete http.defaults.headers.common.Authorization;
        }
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => localStorage),
      // 새로고침 유지용
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        isAuthed: s.isAuthed,
      }),
    }
  )
);

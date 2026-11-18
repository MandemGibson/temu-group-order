import { create } from "zustand";

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role: "buyer" | "leader" | "admin" | "super_admin";
  avatarUrl?: string;
  leaderOnboardingStatus?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  creditBalancePesewas: number;
  setAuth: (token: string, user: User) => void;
  setCreditBalance: (pesewas: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("temu_auth_token"),
  user: localStorage.getItem("temu_user")
    ? JSON.parse(localStorage.getItem("temu_user")!)
    : null,
  creditBalancePesewas: 0,
  setAuth: (token, user) => {
    localStorage.setItem("temu_auth_token", token);
    localStorage.setItem("temu_user", JSON.stringify(user));
    set({ token, user });
  },
  setCreditBalance: (pesewas) => set({ creditBalancePesewas: pesewas }),
  logout: () => {
    localStorage.removeItem("temu_auth_token");
    localStorage.removeItem("temu_user");
    set({ token: null, user: null, creditBalancePesewas: 0 });
  },
}));

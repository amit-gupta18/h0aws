import { create } from 'zustand'
import type { Role } from '@/shared/types'

type AuthState = {
  userId: string | null
  businessId: string | null
  role: Role | null
  accessToken: string | null
  setAuth: (payload: { userId: string; businessId: string; role: Role; accessToken: string }) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  businessId: null,
  role: null,
  accessToken: null,
  setAuth: (payload) => set(payload),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ userId: null, businessId: null, role: null, accessToken: null }),
}))

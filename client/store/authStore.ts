import { create } from 'zustand'
import type { Role, Membership } from '@/shared/types'

type AuthState = {
  userId: string | null
  email: string | null
  accessToken: string | null
  memberships: Membership[]
  activeBusinessId: string | null

  /** Populate from a login/signup response. Auto-selects the active business when there's exactly one. */
  setSession: (p: { userId: string; email: string; accessToken: string; memberships: Membership[] }) => void
  /** Replace the access token after a silent refresh. */
  setAccessToken: (accessToken: string) => void
  /** Switch which business the user is acting as (sent as X-Business-Id on every request). */
  setActiveBusiness: (businessId: string) => void
  /** After creating a business via onboarding — append it and make it active. */
  addMembership: (m: Membership) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  accessToken: null,
  memberships: [],
  activeBusinessId: null,

  setSession: ({ userId, email, accessToken, memberships }) =>
    set({
      userId,
      email,
      accessToken,
      memberships,
      activeBusinessId: memberships.length > 0 ? memberships[0].businessId : null,
    }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setActiveBusiness: (businessId) => set({ activeBusinessId: businessId }),

  addMembership: (m) =>
    set((s) => ({
      memberships: [...s.memberships, m],
      activeBusinessId: m.businessId,
    })),

  clearAuth: () =>
    set({ userId: null, email: null, accessToken: null, memberships: [], activeBusinessId: null }),
}))

/** Role in the currently-active business, or null if none is selected. */
export const useActiveRole = (): Role | null =>
  useAuthStore((s) =>
    s.activeBusinessId
      ? s.memberships.find((m) => m.businessId === s.activeBusinessId)?.role ?? null
      : null
  )

import ky from 'ky'
import type { BeforeRequestState, AfterResponseState } from 'ky'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1'

export const api = ky.create({
  prefix: BASE_URL,
  hooks: {
    beforeRequest: [
      ({ request }: BeforeRequestState) => {
        const token = useAuthStore.getState().accessToken
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      },
    ],
    afterResponse: [
      async ({ request, response }: AfterResponseState) => {
        if (response.status === 401) {
          try {
            const data = await ky
              .post(`${BASE_URL}/auth/refresh`, { credentials: 'include' })
              .json<{ accessToken: string }>()

            useAuthStore.getState().setAccessToken(data.accessToken)

            return ky(request)
          } catch {
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          }
        }
      },
    ],
  },
})

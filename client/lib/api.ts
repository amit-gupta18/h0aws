import ky from 'ky'
import type { BeforeRequestState, AfterResponseState } from 'ky'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

export const api = ky.create({
  prefix: BASE_URL,
  hooks: {
    beforeRequest: [
      ({ request }: BeforeRequestState) => {
        const { accessToken, activeBusinessId } = useAuthStore.getState()
        if (accessToken) {
          request.headers.set('Authorization', `Bearer ${accessToken}`)
        }
        // Tells the server which tenant this request acts on; role is resolved server-side.
        if (activeBusinessId) {
          request.headers.set('X-Business-Id', activeBusinessId)
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

            const retryHeaders = new Headers(request.headers)
            retryHeaders.set('Authorization', `Bearer ${data.accessToken}`)
            return fetch(new Request(request.url, {
              method: request.method,
              headers: retryHeaders,
              body: request.bodyUsed ? null : request.body,
              credentials: request.credentials,
            }))
          } catch {
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          }
        }
      },
    ],
  },
})

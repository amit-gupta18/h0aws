import ky from 'ky'
import type { BeforeRequestState, AfterResponseState } from 'ky'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

function log(message: string, data?: unknown) {
  console.log(`[api] ${message}`, data ?? '')
}

export const api = ky.create({
  prefix: BASE_URL,
  hooks: {
    beforeRequest: [
      ({ request }: BeforeRequestState) => {
        const { accessToken, activeBusinessId } = useAuthStore.getState()
        log('beforeRequest', { url: request.url, hasToken: !!accessToken, businessId: activeBusinessId })
        if (accessToken) {
          request.headers.set('Authorization', `Bearer ${accessToken}`)
        }
        if (activeBusinessId) {
          request.headers.set('X-Business-Id', activeBusinessId)
        }
      },
    ],
    afterResponse: [
      async ({ request, response }: AfterResponseState) => {
        log('afterResponse', { url: request.url, status: response.status })
        if (response.status === 401) {
          log('Got 401, attempting token refresh...')
          try {
            const data = await ky
              .post(`${BASE_URL}/auth/refresh`, { credentials: 'include' })
              .json<{ accessToken: string }>()

            log('Token refresh successful, retrying original request')
            useAuthStore.getState().setAccessToken(data.accessToken)

            const retryHeaders = new Headers(request.headers)
            retryHeaders.set('Authorization', `Bearer ${data.accessToken}`)
            return fetch(new Request(request.url, {
              method: request.method,
              headers: retryHeaders,
              body: request.bodyUsed ? null : request.body,
              credentials: request.credentials,
            }))
          } catch (err) {
            log('Token refresh failed, redirecting to login', { error: err instanceof Error ? err.message : String(err) })
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          }
        }
      },
    ],
  },
})

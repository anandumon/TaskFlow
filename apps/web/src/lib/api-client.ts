const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL !== undefined
  ? process.env.NEXT_PUBLIC_API_URL
  : (typeof window !== 'undefined' ? '' : 'http://localhost:8080')

interface ApiError {
  status: number
  code: string
  message: string
  details?: Array<{ field: string; message: string }>
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: ApiError
  meta?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  timestamp: string
}

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  getAccessToken(): string | null {
    return this.accessToken
  }

  private refreshPromise: Promise<boolean> | null = null

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    }

    const token = this.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null)
    if (token) {
      this.accessToken = token
      headers['Authorization'] = `Bearer ${token}`
    }

    // Fast 15s abort timeout to guarantee requests never hang indefinitely
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal || controller.signal,
        ...options,
      })

      clearTimeout(timeoutId)

      let data: ApiResponse<T>
      try {
        data = await res.json()
      } catch {
        if (!res.ok) {
          throw { status: res.status, code: 'HTTP_ERROR', message: `Request failed (${res.status})` }
        }
        data = { success: true, data: {} as T, timestamp: new Date().toISOString() }
      }

      if (!data.success && data.error) {
        // Try to refresh token on 401
        if (data.error.status === 401 && this.accessToken) {
          const refreshed = await this.tryRefreshToken()
          if (refreshed) {
            // Retry the original request
            headers['Authorization'] = `Bearer ${this.accessToken}`
            const retryRes = await fetch(`${this.baseUrl}${path}`, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            })
            return retryRes.json()
          }
        }
        throw data.error
      }

      return data
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err?.name === 'AbortError') {
        throw { status: 408, code: 'TIMEOUT', message: 'Request timed out. Please check your connection.' }
      }
      throw err
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refreshToken')
      : null

    if (!refreshToken) return false

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        const data = await res.json()
        if (data.success && data.data) {
          this.accessToken = data.data.accessToken
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', data.data.accessToken)
            localStorage.setItem('refreshToken', data.data.refreshToken)
          }
          return true
        }
      } catch {
        // Refresh failed
      } finally {
        this.refreshPromise = null
      }

      // Clear tokens
      this.accessToken = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
      return false
    })()

    return this.refreshPromise
  }

  get<T>(path: string) {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body)
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body)
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export type { ApiResponse, ApiError }

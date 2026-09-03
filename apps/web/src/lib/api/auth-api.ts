import { apiClient } from '@/lib/api-client'

export interface UserDTO {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string
  avatarUrl?: string
  emailVerified: boolean
}

export interface AuthResponseDTO {
  accessToken?: string
  refreshToken?: string
  requiresVerification?: boolean
  verificationMessage?: string
  devCode?: string
  user: UserDTO
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponseDTO>('/api/v1/auth/login', { email, password }),

  register: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    apiClient.post<AuthResponseDTO>('/api/v1/auth/register', data),

  verifyEmail: (email: string, code: string) =>
    apiClient.post<string>('/api/v1/auth/verify-email', { email, code }),

  resendCode: (email: string) =>
    apiClient.post<string>(`/api/v1/auth/resend-code?email=${encodeURIComponent(email)}`),

  socialLogin: (provider: string, email?: string, name?: string) =>
    apiClient.post<AuthResponseDTO>('/api/v1/auth/oauth', { provider, email, name }),

  refreshToken: (refreshToken: string) =>
    apiClient.post<AuthResponseDTO>('/api/v1/auth/refresh', { refreshToken }),

  logout: (refreshToken?: string | null) =>
    apiClient.post('/api/v1/auth/logout', { refreshToken }),

  getCurrentUser: () =>
    apiClient.get<UserDTO>('/api/v1/auth/me'),
}

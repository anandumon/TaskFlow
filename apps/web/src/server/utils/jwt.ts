import crypto from 'crypto'

const DEFAULT_JWT_SECRET =
  process.env.JWT_SECRET ||
  'taskflow-dev-secret-key-must-be-at-least-256-bits-long-for-hs256-security'

export interface JwtPayload {
  sub: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  iat?: number
  exp?: number
  iss?: string
  type?: 'access' | 'refresh'
}

/**
 * Encodes an object to a URL-safe Base64 string.
 */
function toBase64Url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64url')
}

/**
 * Decodes a URL-safe Base64 string to utf8 string.
 */
function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

/**
 * Creates a standard HS256 JWT for TaskFlow.
 */
export function createTaskFlowJwt(
  user: {
    id: string
    email: string
    fullName?: string
    firstName?: string
    lastName?: string
  },
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days default
): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const fullName =
    user.fullName ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.email.split('@')[0]

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email.toLowerCase().trim(),
    name: fullName,
    firstName: user.firstName || fullName.split(' ')[0] || '',
    lastName: user.lastName || fullName.split(' ').slice(1).join(' ') || '',
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'taskflow',
    type: 'access',
  }

  const headerB64 = toBase64Url(JSON.stringify(header))
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${headerB64}.${payloadB64}`

  const signature = crypto
    .createHmac('sha256', DEFAULT_JWT_SECRET)
    .update(unsignedToken)
    .digest('base64url')

  return `${unsignedToken}.${signature}`
}

/**
 * Creates a refresh token (30 days validity).
 */
export function createRefreshToken(userId: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: userId,
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30 days
    iss: 'taskflow',
    type: 'refresh',
  }

  const headerB64 = toBase64Url(JSON.stringify(header))
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${headerB64}.${payloadB64}`

  const signature = crypto
    .createHmac('sha256', DEFAULT_JWT_SECRET)
    .update(unsignedToken)
    .digest('base64url')

  return `${unsignedToken}.${signature}`
}

/**
 * Verifies and decodes a TaskFlow HS256 JWT.
 */
export function verifyTaskFlowJwt(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== 'string') return null

    const parts = token.trim().split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signature] = parts

    // 1. Verify Signature
    const unsignedToken = `${headerB64}.${payloadB64}`
    const expectedSignature = crypto
      .createHmac('sha256', DEFAULT_JWT_SECRET)
      .update(unsignedToken)
      .digest('base64url')

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSignature)

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null
    }

    // 2. Parse Payload
    const payloadJson = fromBase64Url(payloadB64)
    const payload: JwtPayload = JSON.parse(payloadJson)

    // 3. Check Expiry
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null
    }

    return payload
  } catch (err) {
    return null
  }
}

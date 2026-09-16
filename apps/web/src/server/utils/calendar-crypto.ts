import crypto from 'crypto'

const CALENDAR_ENCRYPTION_SECRET =
  process.env.CALENDAR_ENCRYPTION_SECRET ||
  'taskflow-production-calendar-key-32b-length!'
const ENCRYPTION_KEY = crypto.createHash('sha256').update(CALENDAR_ENCRYPTION_SECRET, 'utf-8').digest()

/**
 * Decrypts a calendar token stored in PostgreSQL bytea.
 * Supports:
 * - Legacy Spring Boot AES-256-GCM encrypted tokens: [12-byte IV][ciphertext][16-byte GCM tag]
 * - Plain string tokens (e.g. ya29.... or 1//...)
 * - Hex-encoded strings or raw UTF-8 buffers
 * Always returns a clean, safe ASCII string suitable for HTTP Authorization headers.
 */
export function decryptCalendarToken(token: any): string {
  if (!token) return ''

  let buf: Buffer | null = null
  if (Buffer.isBuffer(token)) {
    buf = token
  } else if (typeof token === 'string') {
    if (token.startsWith('\\x')) {
      buf = Buffer.from(token.slice(2), 'hex')
    } else if (/^[0-9a-fA-F]+$/.test(token) && token.length > 56) {
      buf = Buffer.from(token, 'hex')
    } else if (token.startsWith('ya29.') || token.startsWith('1//') || token.startsWith('gh') || token.startsWith('eyJ')) {
      return token
    } else {
      buf = Buffer.from(token, 'binary')
    }
  }

  if (!buf || buf.length === 0) return ''

  // Check if buffer is already a plain ASCII token
  const asAscii = buf.toString('utf-8')
  if (asAscii.startsWith('ya29.') || asAscii.startsWith('1//') || (asAscii.length > 10 && /^[\x20-\x7E]+$/.test(asAscii))) {
    return asAscii
  }

  // Attempt AES-256-GCM decryption
  if (buf.length >= 28) {
    try {
      const iv = buf.subarray(0, 12)
      const tag = buf.subarray(buf.length - 16)
      const data = buf.subarray(12, buf.length - 16)
      const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
      decipher.setAuthTag(tag)
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8')
      if (decrypted && /^[\x20-\x7E]+$/.test(decrypted)) {
        return decrypted
      }
    } catch {
      // Fallback
    }
  }

  // Only return asAscii if safe ByteString characters to prevent fetch Header crash
  return /^[\x20-\x7E]+$/.test(asAscii) ? asAscii : ''
}

/**
 * Encrypts a calendar token with AES-256-GCM for storage in PostgreSQL bytea,
 * matching the legacy Spring Boot backend format: [12-byte IV][ciphertext][16-byte GCM tag].
 */
export function encryptCalendarToken(plaintext?: string | null): Buffer | null {
  if (!plaintext) return null
  try {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, encrypted, tag])
  } catch (err) {
    console.warn('[calendar-crypto] Encryption failed, falling back to raw buffer:', err)
    return Buffer.from(plaintext, 'utf-8')
  }
}

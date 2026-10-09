/**
 * WebRTC Configuration & ICE Server Provider
 * Provides STUN and TURN configurations for robust NAT traversal across corporate firewalls and cellular networks.
 */

export function getIceServers(): RTCIceServer[] {
  const customTurnUrl = process.env.NEXT_PUBLIC_TURN_URL
  const customTurnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME
  const customTurnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL

  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]

  if (customTurnUrl) {
    servers.push({
      urls: customTurnUrl,
      username: customTurnUsername,
      credential: customTurnCredential,
    })
  } else {
    // OpenRelay (Metered) free public TURN relay fallback for symmetric NAT & restricted firewalls
    servers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    )
  }

  return servers
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
}

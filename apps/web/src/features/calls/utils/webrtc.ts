/**
 * WebRTC Configuration & ICE Server Provider
 * Provides STUN and TURN configurations for robust NAT traversal across corporate firewalls and cellular networks.
 */

export function getIceServers(): RTCIceServer[] {
  const customTurnUrl = process.env.NEXT_PUBLIC_TURN_URL
  const customTurnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME
  const customTurnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL

  // Rock-solid multi-region STUN servers covering standard UDP and firewall-friendly port 443
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.nextcloud.com:443' },
    { urls: 'stun:stun.nextcloud.com:3478' },
  ]

  if (customTurnUrl) {
    servers.push({
      urls: customTurnUrl,
      username: customTurnUsername,
      credential: customTurnCredential,
    })
  }

  return servers
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
}

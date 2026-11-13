// Production build configuration (ng build).
// Points to the Kino backend deployed on Render.
export const environment = {
  production: true,
  apiBaseUrl: 'https://kino-backend-alq2.onrender.com/api',
  // WebRTC servers used by camera broadcasts. Public STUN servers work for most networks; add a TURN
  // server here ({ urls: 'turn:...', username, credential }) for viewers behind very restrictive networks.
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ] as RTCIceServer[]
};

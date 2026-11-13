export const environment = {
  production: true,
  apiBaseUrl: 'https://kino-backend-alq2.onrender.com/api',
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ] as RTCIceServer[]
};

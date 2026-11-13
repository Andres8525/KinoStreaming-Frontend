// Development configuration (ng serve). Replaces environment.ts through angular.json fileReplacements.
// The frontend only talks to the Kino backend; the backend is the one connected to Supabase.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8081/api',
  // WebRTC servers used by camera broadcasts. Public STUN servers work for most networks; add a TURN
  // server here ({ urls: 'turn:...', username, credential }) for viewers behind very restrictive networks.
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ] as RTCIceServer[]
};

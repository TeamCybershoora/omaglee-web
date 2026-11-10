/**
 * Omaglee Web Client - Configuration
 */

export const PROD_API_URL = 'https://omaglee-backend-1.onrender.com/api';

export const API_URL = 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '8000')
    ? 'http://localhost:8000/api'
    : PROD_API_URL;

export const GOOGLE_CLIENT_ID = '860788640625-qjs1imss7vs50i9on8rgs0hq0on5vohh.apps.googleusercontent.com';

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

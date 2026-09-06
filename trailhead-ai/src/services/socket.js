import { io } from 'socket.io-client';

// Single shared socket instance for the whole app.
// Swap this URL via VITE_BACKEND_URL when deploying (e.g. to your real
// hosted backend) — nothing else in the app needs to change.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
});

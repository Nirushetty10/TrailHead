import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const BUSINESS_ID = import.meta.env.VITE_BUSINESS_ID || 'trailhead';

console.log(BUSINESS_ID)
const CLIENT_ID_KEY = 'trailhead-client-id';

// A stable identity that survives page refreshes and reconnects — unlike
// socket.io's own socket.id, which is reassigned every time. This is what
// lets the backend restore your cart, conversation history, and verified
// orders after a refresh instead of silently starting over.
function getOrCreateClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage disabled — fall back to a per-tab id.
    // Sessions won't survive a refresh in this case, but everything else
    // still works.
    return crypto.randomUUID();
  }
}

export const clientId = getOrCreateClientId();
export const businessId = BUSINESS_ID;
export const backendUrl = BACKEND_URL;

export const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
  auth: { clientId, businessId: BUSINESS_ID },
});

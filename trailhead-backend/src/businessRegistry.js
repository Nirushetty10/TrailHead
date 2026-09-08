import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const registryFile = path.join(__dirname, '..', 'data', 'businesses.json');
const businessesDir = path.join(__dirname, '..', 'data', 'businesses');

let registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));

const DEFAULT_BUSINESS_ID = 'trailhead';

export function getBusiness(businessId) {
  return (
    registry.find((b) => b.id === businessId) ||
    registry.find((b) => b.id === DEFAULT_BUSINESS_ID)
  );
}

export function listBusinesses() {
  return registry;
}

// Resolves to the actual business id being used — falls back to the
// default if an unknown/missing id was requested, so a typo'd businessId
// degrades gracefully instead of erroring.
export function resolveBusinessId(requestedId) {
  return registry.some((b) => b.id === requestedId) ? requestedId : DEFAULT_BUSINESS_ID;
}

// Every per-business data file (products, orders, sessions, usage, etc)
// lives under data/businesses/{id}/{filename} — this is the ONLY function
// that knows that path structure.
export function businessDataPath(businessId, filename) {
  return path.join(businessesDir, businessId, filename);
}

export function reloadRegistry() {
  registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
}

import { createSign } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';

const FB_PROJECT = 'diary-daniel-rinat';
const FB_DB_URL = `https://${FB_PROJECT}-default-rtdb.firebaseio.com`;
const FB_PATH_PREFIX = 'diary';
const KEYS = ['appts','tasks','goals','bgoals','clients','cancellations','packages','expenses','website'];

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!saRaw) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT env var');
  process.exit(1);
}
let sa;
try {
  sa = JSON.parse(saRaw);
} catch (e) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON:', e.message);
  process.exit(1);
}

function b64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const sig = b64url(signer.sign(sa.private_key));
  const jwt = `${signingInput}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth2 token request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function fetchKey(accessToken, key) {
  const url = `${FB_DB_URL}/${FB_PATH_PREFIX}/${key}.json`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Firebase fetch ${key} failed: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

console.log('Authenticating with Google...');
const accessToken = await getAccessToken();

console.log('Fetching data from Firebase...');
const data = {};
for (const key of KEYS) {
  data[key] = await fetchKey(accessToken, key);
  const size = JSON.stringify(data[key] || {}).length;
  console.log(`  ${key}: ${size} chars`);
}

const dateKey = new Date().toISOString().slice(0, 10);
const body = {
  version: 1,
  app: 'rinat-diary',
  createdAt: new Date().toISOString(),
  createdBy: 'github-actions',
  data,
};

mkdirSync('backups', { recursive: true });
const outPath = `backups/${dateKey}.json`;
writeFileSync(outPath, JSON.stringify(body, null, 2));
console.log(`Wrote ${outPath}`);

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_pms_key_change_me_123456';

const encoder = new TextEncoder();

// Helper to encode to base64url
function base64url(arr) {
  const bin = String.fromCharCode(...new Uint8Array(arr));
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Helper to decode from base64url
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

async function getSecretKey() {
  const keyData = encoder.encode(JWT_SECRET);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(payload, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const payloadB64 = base64url(encoder.encode(JSON.stringify(fullPayload)));
  
  const tokenInput = `${headerB64}.${payloadB64}`;
  const key = await getSecretKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(tokenInput));
  const signatureB64 = base64url(signature);
  
  return `${tokenInput}.${signatureB64}`;
}

export async function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    
    const tokenInput = `${headerB64}.${payloadB64}`;
    const key = await getSecretKey();
    const signature = base64urlDecode(signatureB64);
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(tokenInput)
    );
    if (!isValid) return null;
    
    const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    
    return payload;
  } catch (e) {
    console.error('JWT Verification failed:', e);
    return null;
  }
}

// Password hashing helper (SHA-256)
export async function hashPassword(password) {
  const msgUint8 = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

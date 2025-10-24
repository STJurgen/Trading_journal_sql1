import crypto from 'crypto';

const ITERATIONS = 120000;
const DIGEST = 'sha256';

function pbkdf2(password, salt, iterations, keylen) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keylen, DIGEST, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, 32);
  return `${ITERATIONS}:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length !== 3) {
    return false;
  }

  const [iterationsPart, salt, keyHex] = parts;
  const iterations = Number.parseInt(iterationsPart, 10);
  if (!Number.isFinite(iterations) || !salt || !keyHex) {
    return false;
  }

  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedKey = await pbkdf2(password, salt, iterations, keyBuffer.length);

  if (derivedKey.length !== keyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

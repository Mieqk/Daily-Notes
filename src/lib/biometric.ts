// Биометрический вход через WebAuthn (платформенный аутентификатор: Face ID, отпечаток, Windows Hello).
// Это удобство поверх PIN, а не замена: ключ остаётся на устройстве, сервера нет, PIN всегда работает.

const RP_NAME = "Daily Notes";

function toB64(buf: ArrayBuffer): string {
  let s = "";
  new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export async function biometricSupported(): Promise<boolean> {
  try {
    if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Создаёт ключ на устройстве. Возвращает id ключа для сохранения, либо null, если пользователь отказался. */
export async function registerBiometric(): Promise<string | null> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: RP_NAME },
        user: { id: randomBytes(16), name: "daily-notes", displayName: RP_NAME },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    return cred ? toB64(cred.rawId) : null;
  } catch {
    return null;
  }
}

/** Просит устройство подтвердить личность. Любая ошибка или отмена = false, дальше работает PIN. */
export async function verifyBiometric(credId: string): Promise<boolean> {
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: "public-key", id: fromB64(credId) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return Boolean(res);
  } catch {
    return false;
  }
}

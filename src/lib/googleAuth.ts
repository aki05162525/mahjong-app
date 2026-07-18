export async function generateGoogleNonce(): Promise<{
  nonce: string;
  hashedNonce: string;
}> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...randomBytes));
  const encodedNonce = new TextEncoder().encode(nonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return { nonce, hashedNonce };
}

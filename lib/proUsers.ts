// In-memory store of active Pro subscribers keyed by email
// For scale: replace with a database (Vercel KV, PlanetScale, etc.)
const proEmails = new Set<string>();
const proTokens = new Map<string, string>(); // token → email

export function activatePro(email: string): string {
  const token = Buffer.from(`${email}:${Date.now()}:pro`).toString("base64url");
  proEmails.add(email.toLowerCase());
  proTokens.set(token, email.toLowerCase());
  return token;
}

export function deactivatePro(email: string) {
  proEmails.delete(email.toLowerCase());
  // Remove tokens for this email
  for (const [token, e] of proTokens.entries()) {
    if (e === email.toLowerCase()) proTokens.delete(token);
  }
}

export function isProToken(token: string): boolean {
  return proTokens.has(token);
}

export function isProEmail(email: string): boolean {
  return proEmails.has(email.toLowerCase());
}

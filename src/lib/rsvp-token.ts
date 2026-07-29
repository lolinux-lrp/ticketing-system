import crypto from "crypto";

export interface RsvpPayload {
  email: string;
  meetingId: string;
  role?: string;
  exp?: number;
}

/**
 * Generates an HMAC-signed RSVP token for a meeting attendee.
 * Returns undefined if no secret is configured or payload is invalid.
 */
export function generateRsvpToken(payload: RsvpPayload): string | undefined {
  const secret = process.env.RSVP_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || !payload.email || !payload.meetingId) return undefined;

  const fullPayload: RsvpPayload = {
    ...payload,
    exp: payload.exp || Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const payloadStr = JSON.stringify(fullPayload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const hmac = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  
  return `${payloadB64}.${hmac}`;
}

/**
 * Verifies an HMAC-signed RSVP token and returns the payload if valid.
 * Uses crypto.timingSafeEqual to mitigate timing attacks.
 * Returns null if the token is invalid, tampered with, or expired/missing.
 */
export function verifyRsvpToken(token: string): RsvpPayload | null {
  const secret = process.env.RSVP_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, providedHmac] = parts;
  
  // Re-compute HMAC
  const computedHmac = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");

  // Prevent timing attacks using timingSafeEqual
  const computedBuffer = Buffer.from(computedHmac, "utf-8");
  const providedBuffer = Buffer.from(providedHmac, "utf-8");

  // Buffer lengths must match exactly for timingSafeEqual
  if (computedBuffer.length !== providedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(computedBuffer, providedBuffer)) {
    return null;
  }

  try {
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr) as RsvpPayload;
    
    if (!payload.email || !payload.meetingId) return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    
    return payload;
  } catch {
    return null;
  }
}

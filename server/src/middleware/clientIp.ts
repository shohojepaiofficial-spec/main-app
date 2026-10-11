import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Request } from "express";
import { ipKeyGenerator } from "express-rate-limit";

// The browser's IP as signed by the Next.js proxy, falling back to the
// socket address when the signature is missing or stale.
export function clientIp(req: Request) {
  const ip = req.get("X-Client-IP"), timestamp = req.get("X-Client-IP-Time"), signature = req.get("X-Client-IP-Signature");
  const secret = process.env.INTERNAL_API_SECRET;
  if (secret && ip && isIP(ip) && timestamp && /^\d+$/.test(timestamp) && Math.abs(Date.now() - Number(timestamp)) < 60_000 && signature && /^[a-f0-9]{64}$/.test(signature)) {
    const expected = createHmac("sha256", secret).update(`client-ip:${timestamp}:${ip}`).digest();
    if (timingSafeEqual(expected, Buffer.from(signature, "hex"))) return ip;
  }
  return req.ip ?? "";
}

export function clientIpKey(req: Request) {
  return ipKeyGenerator(clientIp(req));
}

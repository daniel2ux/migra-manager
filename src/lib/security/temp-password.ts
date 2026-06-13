import { randomInt } from 'node:crypto';

/** Senha temporária (≥10 chars, sem caracteres ambíguos). */
export function generateTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[randomInt(0, chars.length)];
  }
  return out;
}

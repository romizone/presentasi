export function hexToPptx(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

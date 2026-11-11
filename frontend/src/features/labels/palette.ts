/** Colores derivados de la marca primero; el resto contrasta sobre #0b1020. */
export const PALETTE = ["#006cfc", "#8b2cf5", "#4d9bff", "#22d3ee", "#4ade80", "#fbbf24", "#f472b6", "#fb923c"];

/** Color estable para una etiqueta sin definición. */
export function fallbackColor(label: string): string {
  let h = 0;
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export const UNLABELED = "#94a3b8";

/**
 * Price-display helpers. Cards from the Pokémon TCG API can have market
 * prices well under a dollar (commons run $0.05–$0.50), so plain
 * Math.round / toFixed(0) collapses them to "$0". These keep cents
 * visible for sub-dollar values and switch to comma-grouped integers
 * once we're past $100, matching the Holo Arena display style.
 */

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Compact USD: cents for sub-dollar, integer for $1–$999, grouped for $1k+.
 *   0     → "0"
 *   0.17  → "0.17"
 *   0.99  → "0.99"
 *   1     → "1"
 *   16.08 → "16"
 *   1234  → "1,234"
 *   null/NaN → "—"
 */
export const formatPriceCompact = (n: number | null | undefined): string => {
  if (n == null || !isNum(n)) return '—';
  if (n < 0) return '0';
  if (n < 1) return n.toFixed(2);
  if (n < 1000) return Math.round(n).toString();
  return Math.round(n).toLocaleString('en-US');
};

/**
 * Total/portfolio rendering: returns { whole, cents } so the UI can
 * style cents subtly (e.g. <Text style={cents}>.42</Text>).
 *   0     → { whole: "0",   cents: ".00" }
 *   0.28  → { whole: "0",   cents: ".28" }
 *   16.08 → { whole: "16",  cents: ".08" }
 *   1234  → { whole: "1,234", cents: ".00" }
 */
export const formatPriceParts = (
  n: number | null | undefined
): { whole: string; cents: string } => {
  if (n == null || !isNum(n) || n < 0) return { whole: '0', cents: '.00' };
  const whole = Math.floor(n);
  const cents = Math.round((n - whole) * 100);
  const wholeStr = whole >= 1000 ? whole.toLocaleString('en-US') : whole.toString();
  return { whole: wholeStr, cents: '.' + cents.toString().padStart(2, '0') };
};

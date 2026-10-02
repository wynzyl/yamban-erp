// Contrast gate: reads the light and dark token blocks from globals.css and checks
// every pair the guideline measures. Must end in ALL PASS.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf('}', start);
  const vars = {};
  for (const m of css.slice(start, end).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) vars[m[1]] = m[2];
  return vars;
}

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const pairs = [
  ['foreground', 'background', 7, 'body text'],
  ['foreground', 'card', 7, 'body text on card'],
  ['muted-foreground', 'background', 4.5, 'secondary text'],
  ['muted-foreground', 'card', 4.5, 'secondary text on card'],
  ['muted-foreground', 'muted', 4.5, 'secondary text on muted'],
  ['primary-foreground', 'primary', 4.5, 'primary fill'],
  ['primary', 'background', 4.5, 'primary as text'],
  ['primary', 'card', 4.5, 'primary as text on card'],
  ['partial-foreground', 'partial', 4.5, 'partial fill'],
  ['partial-text', 'background', 4.5, 'partial as text'],
  ['partial-text', 'card', 4.5, 'partial as text on card'],
  ['success-foreground', 'success', 4.5, 'success fill'],
  ['success', 'background', 4.5, 'success as text'],
  ['success', 'card', 4.5, 'success as text on card'],
  ['destructive-foreground', 'destructive', 4.5, 'destructive fill'],
  ['destructive', 'background', 4.5, 'destructive as text'],
  ['destructive', 'card', 4.5, 'destructive as text on card'],
  ['ring', 'background', 3, 'focus ring (non-text)'],
  ['brand-magenta', 'background', 3, 'logo mark (non-text)'],
];

const light = block(':root');
const themes = { light, dark: { ...light, ...block("[data-theme='dark']") } };
let ok = true;
for (const [name, vars] of Object.entries(themes)) {
  console.log(`[${name}]`);
  for (const [fg, bg, need, what] of pairs) {
    const r = ratio(vars[fg], vars[bg]);
    const pass = r >= need;
    ok &&= pass;
    console.log(` ${pass ? 'PASS' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 need ${need}  ${fg} on ${bg}  ${what}`);
  }
}
console.log(ok ? 'ALL PASS' : 'FAILED');
process.exit(ok ? 0 : 1);

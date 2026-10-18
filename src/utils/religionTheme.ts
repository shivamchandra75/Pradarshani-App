/**
 * How a religion's SVG is painted:
 * - mask: the icon's alpha shape is filled with `fg` (all icons are transparent-background)
 * - cutout: like mask, plus the icon's white parts are cut out in the card color (Arya Samaj Om inside the sun)
 * - original: icon is shown in its own colors (multicolor Kabir Panthi illustration)
 */
export type IconMode = 'mask' | 'cutout' | 'original';

export interface ReligionTheme {
  /** Icon / folder-glyph color; the only color configured per religion */
  fg: string;
  /** Lighter shade of fg, used as the card background (nested folders inherit it) */
  bg: string;
  border: string;
  /** Darker shade of fg, readable on bg */
  text: string;
  /** Path under /public */
  icon: string;
  mode: IconMode;
}

const SOURCES: Record<string, { fg: string; icon: string; mode?: IconMode }> = {
  aryasamaj: { fg: '#E8532B', icon: '/arya%20samaj.svg', mode: 'cutout' },
  christianity: { fg: '#111111', icon: '/Christianity.svg' },
  islam: { fg: '#15803D', icon: '/Islam.svg' },
  hinduism: { fg: '#F97316', icon: '/Hinduism.svg' },
  buddhism: { fg: '#F6B21A', icon: '/Buddhism.svg' },
  jainism: { fg: '#6B7280', icon: '/Jainism.svg' },
  // Off-white would vanish on its own lighter tint, so this is a darker off-white (khaki)
  kabirpanthi: { fg: '#A8996B', icon: '/Kabir%20Panthi.svg', mode: 'original' },
  radhaswami: { fg: '#800000', icon: '/radha%20swami.svg' },
  santmat: { fg: '#EC4899', icon: '/Sant%20mat.svg' },
  sikhism: { fg: '#1E3A8A', icon: '/Sikhism.svg' },
};

// Spellings that differ from the keys above once normalized
const ALIASES: Record<string, string> = {
  ariasamaj: 'aryasamaj',
  arisamaj: 'aryasamaj',
  janism: 'jainism',
  kabirpanth: 'kabirpanthi',
  radhasoami: 'radhaswami',
  radhaswamy: 'radhaswami',
};

/** Mixes `hex` toward `target` (0 = black, 255 = white) by `amount` (0..1) */
const mix = (hex: string, target: number, amount: number) => {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((n >> shift) & 255) * (1 - amount) + target * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
};

const THEMES: Record<string, ReligionTheme> = Object.fromEntries(
  Object.entries(SOURCES).map(([key, s]) => [
    key,
    {
      fg: s.fg,
      bg: mix(s.fg, 255, 0.86),
      border: mix(s.fg, 255, 0.7),
      text: mix(s.fg, 0, 0.5),
      icon: s.icon,
      mode: s.mode ?? 'mask',
    },
  ]),
);

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Returns undefined for religions without a configured theme (caller falls back to the default look). */
export function getReligionTheme(name?: string | null): ReligionTheme | undefined {
  if (!name) return undefined;
  const key = normalize(name);
  return THEMES[ALIASES[key] ?? key];
}

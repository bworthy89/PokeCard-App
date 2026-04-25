export const colors = {
  bg0: '#07071A',
  bg1: '#0E0E26',
  bg2: '#16163A',
  bg3: '#1F1F4E',

  ink0: '#FFFFFF',
  ink1: '#E8E8FF',
  ink2: '#A6A6D6',
  ink3: '#6E6EA0',
  ink4: '#3F3F6B',

  line: 'rgba(255, 255, 255, 0.08)',
  lineStrong: 'rgba(255, 255, 255, 0.18)',
} as const;

export const energy = {
  fire:     { color: '#FF5A36', soft: '#FF8A6A', glyph: '🔥', name: 'Fire' },
  water:    { color: '#3DA5FF', soft: '#7BC4FF', glyph: '💧', name: 'Water' },
  grass:    { color: '#3DD68C', soft: '#7BE5B0', glyph: '🌿', name: 'Grass' },
  electric: { color: '#FFD23D', soft: '#FFE27A', glyph: '⚡', name: 'Electric' },
  psychic:  { color: '#C24DFF', soft: '#D680FF', glyph: '✦', name: 'Psychic' },
  fighting: { color: '#FF8A3D', soft: '#FF8A3D', glyph: '✊', name: 'Fighting' },
  dark:     { color: '#5C5470', soft: '#5C5470', glyph: '◑', name: 'Dark' },
  fairy:    { color: '#FF7AB6', soft: '#FF7AB6', glyph: '✿', name: 'Fairy' },
  steel:    { color: '#9AA8C7', soft: '#9AA8C7', glyph: '◆', name: 'Steel' },
  dragon:   { color: '#6B6BFF', soft: '#6B6BFF', glyph: '◈', name: 'Dragon' },
} as const;

export type EnergyType = keyof typeof energy;

export const tiers = {
  'Gem Mint':          { color: '#C24DFF', rank: 5, label: 'GEM', holo: true },
  'Near Mint':         { color: '#3DD68C', rank: 4, label: 'NM',  holo: false },
  'Lightly Played':    { color: '#FFD23D', rank: 3, label: 'LP',  holo: false },
  'Moderately Played': { color: '#FF8A3D', rank: 2, label: 'MP',  holo: false },
  'Heavily Played':    { color: '#FF5A36', rank: 1, label: 'HP',  holo: false },
} as const;

export type Tier = keyof typeof tiers;

export const HOLO_FOIL_COLORS = ['#FF5A8A', '#FFD23D', '#3DD68C', '#3DA5FF', '#C24DFF', '#FF5A8A'];

export const TIER_ORDER: Tier[] = [
  'Heavily Played',
  'Moderately Played',
  'Lightly Played',
  'Near Mint',
  'Gem Mint',
];

export const inferEnergyType = (cardName: string): EnergyType => {
  const n = cardName.toLowerCase();
  if (/char|fire|flame|magma|volc|burn|infern/.test(n)) return 'fire';
  if (/water|aqua|hydro|tidal|squirt|blast|sea|ocean/.test(n)) return 'water';
  if (/grass|leaf|bloom|bulba|chiku|venus|sprout|seed/.test(n)) return 'grass';
  if (/electr|volt|pika|rai|spark|thunder|shock/.test(n)) return 'electric';
  if (/psy|alak|gengar|mew|astral|myth|aura|dream/.test(n)) return 'psychic';
  if (/fight|punch|hit|kick|machamp/.test(n)) return 'fighting';
  if (/dark|umbre|absol|gloom|shadow/.test(n)) return 'dark';
  if (/fairy|clef|jiggly|pix|glim/.test(n)) return 'fairy';
  if (/steel|iron|metal|ferra|aegis/.test(n)) return 'steel';
  if (/drag|dragon|drake|ryu|salam/.test(n)) return 'dragon';
  return 'psychic';
};

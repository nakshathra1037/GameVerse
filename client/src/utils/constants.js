/**
 * GameVerse Global Client Constants
 */

export const AVATAR_OPTIONS = [
  { id: 'cyber-ninja', label: 'Cyber Ninja', icon: '🥷', color: 'from-cyan-500 to-blue-600', description: 'Swift & Stealthy' },
  { id: 'neon-phoenix', label: 'Neon Phoenix', icon: '🔥', color: 'from-amber-500 to-red-600', description: 'Fiery & Resilient' },
  { id: 'astro-knight', label: 'Astro Knight', icon: '🛡️', color: 'from-indigo-500 to-purple-600', description: 'Stalwart Defender' },
  { id: 'shadow-rogue', label: 'Shadow Rogue', icon: '⚡', color: 'from-violet-500 to-fuchsia-600', description: 'Lightning Reflexes' },
  { id: 'pixel-mage', label: 'Pixel Mage', icon: '🔮', color: 'from-emerald-500 to-teal-600', description: 'Master of Arcane Logic' },
  { id: 'mecha-titan', label: 'Mecha Titan', icon: '🤖', color: 'from-blue-600 to-cyan-400', description: 'Unstoppable Iron Will' },
];

export const AVATAR_MAP = Object.fromEntries(
  AVATAR_OPTIONS.map((item) => [item.id, item])
);

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gv_access_token',
  REFRESH_TOKEN: 'gv_refresh_token',
  USER: 'gv_user',
};

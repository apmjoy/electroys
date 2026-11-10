import type { IconName } from './taxonomy';

// 24×24 stroke icons drawn for Electroys. Rendered with stroke="currentColor".
export const ICONS: Record<IconName | 'caret' | 'cart' | 'compare' | 'home' | 'whatsapp' | 'link', string> = {
  robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="13.5" r="1.3"/><circle cx="15" cy="13.5" r="1.3"/><path d="M9.5 17h5M2 13v3M22 13v3"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  bolt: '<path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12z"/>',
  flask: '<path d="M9 3h6M10 3v6.5L4.6 18.2A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.8L14 9.5V3"/><path d="M7 15h10"/>',
  gear: '<path d="M10.3 3h3.4l.5 2.4 1.7.7 2-1.4 2.4 2.4-1.4 2 .7 1.7 2.4.5v3.4l-2.4.5-.7 1.7 1.4 2-2.4 2.4-2-1.4-1.7.7-.5 2.4h-3.4l-.5-2.4-1.7-.7-2 1.4-2.4-2.4 1.4-2-.7-1.7L3 13.7v-3.4l2.4-.5.7-1.7-1.4-2 2.4-2.4 2 1.4 1.7-.7z"/><circle cx="12" cy="12" r="3"/>',
  planet: '<circle cx="12" cy="12" r="6"/><path d="M3.5 15.5C1.6 18 2 19.7 4.3 19.9c3 .3 8.4-1.8 12.3-4.9 3.9-3.1 5.9-6.2 4.5-7.6-.7-.7-2-.6-3.6.1"/>',
  puzzle: '<path d="M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4H6v-4h2a2 2 0 1 0 0-4H6V6h4z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.5-1.9-.4-1.4.6-2.6 2-2.6H18a3 3 0 0 0 3-3C21 7 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10.5 3 7.5 3.5C5 4 6 8 12 8zM12 8s1.5-5 4.5-4.5C19 4 18 8 12 8z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  heart: '<path d="M12 20.5s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 6.3-8 11-8 11z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.3 8.3-8 9-4.7-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 2h13v-4"/><path d="M8 7h7"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  blocks: '<rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/><rect x="8" y="5" width="8" height="7" rx="1.5"/><path d="M6 13v-1.5M8 13v-1.5M16 13v-1.5M18 13v-1.5M11 5V3.5M13 5V3.5"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.3"/><circle cx="16" cy="8" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="8" cy="16" r="1.3"/><circle cx="16" cy="16" r="1.3"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-15-.5 10-6.5 15-14 15z"/><path d="M5 19c3-4 6-7 10-9"/>',
  telescope: '<path d="M3.5 11.5l13-6 2 4.5-13 6zM16.5 5.5l2.5-1 2 4.5-2.5 1"/><path d="M10 14l-3 7M12 13.5l3 7.5"/>',
  compare: '<rect x="3" y="4" width="7.5" height="16" rx="2"/><rect x="13.5" y="4" width="7.5" height="16" rx="2"/><path d="M5.5 9h2.5M5.5 12.5h2.5M16 9h2.5M16 12.5h2.5"/>',
  home: '<path d="M3.5 10.5L12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z"/>',
  whatsapp: '<path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.1z"/><path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .5-.1.6l-.5.6c.4.9 1.2 1.7 2.2 2.2l.6-.5c.2-.2.4-.2.6-.1l1.5.6c.3.1.4.3.4.5v.5c0 .4-.2.7-.6.8-.9.4-2.3.1-3.9-1.2-1.6-1.4-2.6-3-2.6-4.1 0-.4.1-.8.4-1.2z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  caret: '<path d="M2 4l4 4 4-4"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a1.5 1.5 0 0 0 1.5 1.1h9.2a1.5 1.5 0 0 0 1.5-1.1L22 8H6"/>',
};

export function iconSvg(name: keyof typeof ICONS, cls = 'icon', size = 24): string {
  const vb = name === 'caret' ? '0 0 12 12' : '0 0 24 24';
  return `<svg class="${cls} icon-${name}" viewBox="${vb}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${name === 'caret' ? 1.8 : 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

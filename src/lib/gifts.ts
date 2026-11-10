import type { Product } from './products';
import type { IconName } from './taxonomy';

export interface GiftGuide {
  slug: string;
  title: string;
  short: string;
  description: string;
  intro: string;
  icon: IconName;
  tone: string;
  filter: (p: Product) => boolean;
  /** Optional ordering override: lower scores first. */
  sort?: (a: Product, b: Product) => number;
  /** Keep broad guides curated by capping them to the strongest picks. */
  limit?: number;
}

const byPick = (a: Product, b: Product) => Number(b.editorPick) - Number(a.editorPick);
const cheapFirst = (a: Product, b: Product) => a.priceBand.length - b.priceBand.length || byPick(a, b);

export const GIFT_GUIDES: GiftGuide[] = [
  {
    slug: 'holiday-gift-guide',
    title: 'The Electroys Holiday Gift Guide',
    short: 'Holiday gift guide',
    description: 'Our favorite STEM kits, building sets and brain-building toys to give this holiday season, for every age from preschool to young adult.',
    intro:
      'These are the gifts we would wrap for our own families: toys that get played with long after the paper is cleared away, and that quietly teach something real. Use the age filters to narrow it down, and save favorites to a shareable list for the relatives who always ask what to get.',
    icon: 'gift', tone: 'flame',
    filter: (p) => p.occasions.includes('Holiday'),
    sort: byPick,
    limit: 36,
  },
  {
    slug: 'stocking-stuffers',
    title: 'Clever Stocking Stuffers Under $25',
    short: 'Stocking stuffers',
    description: 'Small, affordable puzzles, science kits and brain teasers that fit in a stocking and get played with all winter.',
    intro:
      'The best stocking stuffers are small enough to fit and interesting enough to outlast the candy. These puzzles, mini kits and pocket-size challenges are all typically under $25.',
    icon: 'star', tone: 'sun',
    filter: (p) => p.priceBand === '$' || p.occasions.includes('Stocking Stuffer'),
    sort: cheapFirst,
  },
  {
    slug: 'gifts-under-25',
    title: 'Best STEM Gifts Under $25',
    short: 'Under $25',
    description: 'Great-value STEM toys, logic games and science kits that typically cost less than $25.',
    intro: 'A great STEM gift does not need to be expensive. Every pick here typically sells for under $25 and still delivers hours of real learning.',
    icon: 'tag', tone: 'leaf',
    filter: (p) => p.priceBand === '$',
    sort: byPick,
  },
  {
    slug: 'gifts-under-50',
    title: 'Best STEM Gifts Under $50',
    short: 'Under $50',
    description: 'The sweet spot for birthday and holiday gifts: robots, circuits, building sets and science kits typically under $50.',
    intro: 'Most of the best first robots, circuit kits and science sets sit in the $25–$50 range. This is the sweet spot for birthday parties, holiday gifts and grandparents.',
    icon: 'tag', tone: 'sky',
    filter: (p) => p.priceBand === '$' || p.priceBand === '$$',
    sort: byPick,
  },
  {
    slug: 'screen-free-gifts',
    title: 'Screen-Free STEM Gifts',
    short: 'Screen-free gifts',
    description: 'Coding, engineering and science toys that teach real skills without a tablet, phone or computer.',
    intro: 'Coding and engineering do not require a screen. Every toy here works on its own, with no app, tablet or computer, so the learning happens with hands, eyes and conversation.',
    icon: 'shield', tone: 'leaf',
    filter: (p) => p.screenFree,
    sort: byPick,
  },
  {
    slug: 'gifts-for-teens',
    title: 'STEM Gifts for Teens & Young Adults',
    short: 'Gifts for teens',
    description: 'Arduino, Raspberry Pi, soldering kits and advanced builds that teenagers and young adults actually want.',
    intro: 'Teens can tell a toy from a tool, and they want tools. These picks are the same platforms real engineers and makers use, chosen to lead somewhere: a portfolio project, a science fair win or a future major.',
    icon: 'bolt', tone: 'grape',
    filter: (p) => p.ageMin >= 12 || (p.ageMin >= 10 && p.ageMax == null && (p.categories.includes('Electronics') || p.categories.includes('Coding'))),
    sort: byPick,
  },
  {
    slug: 'classroom-favorites',
    title: 'Classroom & Homeschool Favorites',
    short: 'Classroom picks',
    description: 'STEM kits that work well for groups, classrooms and homeschool lessons, with reusable parts and guided activities.',
    intro: 'For teachers and homeschool families, a good STEM kit is reusable, durable and comes with structured activities. These are the picks that hold up to many hands.',
    icon: 'book', tone: 'night',
    filter: (p) => p.occasions.includes('Classroom'),
    sort: byPick,
  },
];

export function guideProducts(g: GiftGuide, all: Product[]): Product[] {
  const list = all.filter(g.filter);
  const sorted = g.sort ? [...list].sort(g.sort) : list;
  return g.limit ? sorted.slice(0, g.limit) : sorted;
}

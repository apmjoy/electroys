// Shared taxonomy: age bands, interests, budgets and occasions.
// Every shop page, filter and gift guide derives from these lists.

export interface AgeBand {
  slug: string;
  label: string;
  name: string;
  min: number;
  max: number;
  blurb: string;
  intro: string;
  color: string;
}

export const AGE_BANDS: AgeBand[] = [
  {
    slug: 'ages-3-5',
    label: 'Ages 3–5',
    name: 'Little Builders',
    min: 3,
    max: 5,
    color: 'sun',
    blurb: 'Screen-free coding, magnetic builds and first experiments.',
    intro:
      'At this age the best STEM toys feel like play first. Look for chunky pieces, quick wins and toys that invite counting, sorting, sequencing and cause-and-effect without a screen. Every pick here is sized for small hands and short attention spans.',
  },
  {
    slug: 'ages-6-8',
    label: 'Ages 6–8',
    name: 'Young Explorers',
    min: 6,
    max: 8,
    color: 'leaf',
    blurb: 'First circuits, beginner robots and science they can see.',
    intro:
      'Six to eight is when kids start following instructions on their own and want results they can show off. These kits build reading-the-manual confidence, early engineering and the “what happens if…” habit that scientists run on.',
  },
  {
    slug: 'ages-9-12',
    label: 'Ages 9–12',
    name: 'Young Engineers',
    min: 9,
    max: 12,
    color: 'sky',
    blurb: 'Programmable robots, real circuits and bigger builds.',
    intro:
      'Tweens are ready for real tools: programmable robots, multi-step circuits, chemistry sets and builds that take a weekend. These picks reward patience and grow with them, from block coding toward text-based languages.',
  },
  {
    slug: 'teens',
    label: 'Ages 13+',
    name: 'Teens & Young Adults',
    min: 13,
    max: 99,
    color: 'grape',
    blurb: 'Arduino, Raspberry Pi, soldering and serious builds.',
    intro:
      'For teens and young adults, the best gifts are the same tools engineers use: microcontrollers, single-board computers, soldering kits and advanced builds. Each pick leads to real projects, portfolio pieces and skills that carry into school and careers.',
  },
];

export interface Interest {
  slug: string;
  name: string;
  short: string;
  icon: IconName;
  color: string;
  /** Research categories that map into this interest. */
  sources: string[];
  intro: string;
}

export type IconName =
  | 'robot' | 'code' | 'bolt' | 'flask' | 'gear' | 'planet' | 'puzzle' | 'palette'
  | 'gift' | 'star' | 'heart' | 'search' | 'menu' | 'close' | 'arrow' | 'check'
  | 'filter' | 'sparkle' | 'shield' | 'book' | 'share' | 'external' | 'clock' | 'tag'
  | 'blocks' | 'dice' | 'leaf' | 'telescope';

export const INTERESTS: Interest[] = [
  {
    slug: 'robotics', name: 'Robotics', short: 'Robots that move, sense and react.', icon: 'robot', color: 'sky',
    sources: ['Robotics'],
    intro: 'Robots are the most motivating way to learn engineering: kids build something, tell it what to do and watch it happen. These picks range from button-coded floor robots to programmable, sensor-packed rovers.',
  },
  {
    slug: 'coding', name: 'Coding', short: 'From screen-free sequencing to Python.', icon: 'code', color: 'grape',
    sources: ['Coding'],
    intro: 'Coding is really about logical thinking: breaking a problem into steps, testing and fixing. These toys teach that thinking at every level, from screen-free sequencing for preschoolers to real text-based programming for teens.',
  },
  {
    slug: 'electronics', name: 'Electronics', short: 'Circuits, sensors and soldering.', icon: 'bolt', color: 'flame',
    sources: ['Electronics'],
    intro: 'Electronics kits turn invisible ideas such as current, resistance and switches into things kids can see light up, buzz and spin. Start with snap-together circuits and work up to breadboards, microcontrollers and soldering.',
  },
  {
    slug: 'science', name: 'Science', short: 'Chemistry, physics and real experiments.', icon: 'flask', color: 'leaf',
    sources: ['Science'],
    intro: 'Good science kits are about asking questions and testing them. These sets cover chemistry, physics, biology and geology with real experiments that go beyond a single “wow” moment.',
  },
  {
    slug: 'engineering', name: 'Engineering & Building', short: 'Structures, machines and mechanisms.', icon: 'gear', color: 'sun',
    sources: ['Engineering', 'Building'],
    intro: 'Building sets teach spatial reasoning, planning and persistence. From magnetic tiles to working gearboxes and hydraulic arms, these picks let kids design, test and rebuild.',
  },
  {
    slug: 'space-nature', name: 'Space & Nature', short: 'Telescopes, microscopes and the outdoors.', icon: 'planet', color: 'night',
    sources: ['Space', 'Nature'],
    intro: 'Telescopes, microscopes and nature kits widen a kid’s sense of scale, from the moons of Jupiter to the cells in an onion skin. These picks are easy to set up and built to be used again and again.',
  },
  {
    slug: 'puzzles-logic', name: 'Puzzles & Logic', short: 'Brain teasers, strategy and math.', icon: 'puzzle', color: 'coral',
    sources: ['Math & Logic', 'Games & Puzzles'],
    intro: 'Logic games build the same reasoning as coding and math, disguised as play. These puzzles and strategy games are great for solo challenges, family game night and travel.',
  },
  {
    slug: 'art-design', name: 'Art & Design', short: 'Creative tech, 3D pens and making.', icon: 'palette', color: 'rose',
    sources: ['Art & Design'],
    intro: 'STEAM includes the A for art. These kits blend creativity with technology: design, 3D drawing, photography and crafts that make kids think like inventors.',
  },
];

export interface Budget {
  slug: string;
  band: string;
  label: string;
  short: string;
}

export const BUDGETS: Budget[] = [
  { slug: 'under-25', band: '$', label: 'Under $25', short: '$' },
  { slug: '25-50', band: '$$', label: '$25 – $50', short: '$$' },
  { slug: '50-100', band: '$$$', label: '$50 – $100', short: '$$$' },
  { slug: '100-plus', band: '$$$$', label: '$100+', short: '$$$$' },
];

export const OCCASIONS = ['Holiday', 'Birthday', 'Stocking Stuffer', 'Classroom', 'Rainy Day'] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const AFFILIATE_TAG = 'myelectroys-20';

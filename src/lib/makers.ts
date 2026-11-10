import type { IconName } from './taxonomy';

// "What kind of maker is your kid?" Five playful maker types, each mapped to
// the interests whose products suit them. Shareable results live at /quiz/<slug>/.

export interface MakerType {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  strengths: string[];
  /** Interest slugs (see taxonomy.ts) whose products fit this maker. */
  interests: string[];
  icon: IconName;
  tone: string;
  /** Two-stop gradient for cards and share images. */
  colors: [string, string];
}

export const MAKER_TYPES: MakerType[] = [
  {
    slug: 'tinkerer', name: 'The Tinkerer', icon: 'gear', tone: 'sun', colors: ['#ffb915', '#f26a1b'],
    tagline: 'Takes it apart to see how it works.',
    description: 'Tinkerers learn with their hands. Screws, gears, wheels and switches are endlessly fascinating, and the best afternoon is one spent building something that moves. They do best with kits that reward patience and end in a working machine.',
    strengths: ['Mechanical thinking', 'Patience with big builds', 'Learning by trying'],
    interests: ['engineering', 'robotics'],
  },
  {
    slug: 'inventor', name: 'The Inventor', icon: 'bolt', tone: 'flame', colors: ['#f26a1b', '#e2508c'],
    tagline: 'Always asking “what if I made…?”',
    description: 'Inventors want to make things that didn’t exist before: a gadget, a game, a robot that does their bidding. Circuits and code are their superpowers, because they turn ideas into things that actually work.',
    strengths: ['Creative problem solving', 'Logical thinking', 'Turning ideas into projects'],
    interests: ['coding', 'electronics', 'robotics'],
  },
  {
    slug: 'explorer', name: 'The Explorer', icon: 'flask', tone: 'leaf', colors: ['#2fae5a', '#2e8bff'],
    tagline: 'Wants to know why the sky is blue.',
    description: 'Explorers are natural scientists. They collect rocks, watch bugs, ask a hundred questions a day and light up at experiments that fizz, grow or glow. Give them tools to observe and test the world.',
    strengths: ['Curiosity', 'Careful observation', 'Asking great questions'],
    interests: ['science', 'space-nature'],
  },
  {
    slug: 'artist-engineer', name: 'The Artist-Engineer', icon: 'palette', tone: 'rose', colors: ['#e2508c', '#7558f0'],
    tagline: 'Builds things that are beautiful, too.',
    description: 'Artist-Engineers design first. They want their creations to look amazing as well as work: colorful builds, light-up art, 3D drawings and stop-motion stories. STEAM is their happy place.',
    strengths: ['Design sense', 'Imagination', 'Storytelling through making'],
    interests: ['art-design', 'engineering'],
  },
  {
    slug: 'puzzle-master', name: 'The Puzzle Master', icon: 'puzzle', tone: 'grape', colors: ['#7558f0', '#1d5be0'],
    tagline: 'Can’t walk past a brain teaser.',
    description: 'Puzzle Masters love a challenge with a clear goal. Logic games, mazes, strategy and patterns are pure fun to them, and that same thinking is the foundation of math and coding.',
    strengths: ['Logical reasoning', 'Persistence', 'Spotting patterns'],
    interests: ['puzzles-logic', 'coding'],
  },
];

export interface QuizOption { label: string; emoji: string; weights: Partial<Record<string, number>> }
export interface QuizQuestion { q: string; options: QuizOption[] }

// Every answer nudges one or two maker types. Ties break toward the earliest type.
export const QUIZ: QuizQuestion[] = [
  {
    q: 'A rainy Saturday. Where do you find them?',
    options: [
      { emoji: '🔧', label: 'Taking apart an old toy', weights: { tinkerer: 3 } },
      { emoji: '💡', label: 'Inventing a “machine” from boxes', weights: { inventor: 2, 'artist-engineer': 1 } },
      { emoji: '🔍', label: 'Watching the rain with a magnifier', weights: { explorer: 3 } },
      { emoji: '🧩', label: 'Deep in a puzzle or board game', weights: { 'puzzle-master': 3 } },
    ],
  },
  {
    q: 'Their favorite question is…',
    options: [
      { emoji: '⚙️', label: '“How does it work?”', weights: { tinkerer: 2, inventor: 1 } },
      { emoji: '🚀', label: '“Can I make one?”', weights: { inventor: 3 } },
      { emoji: '🌍', label: '“Why?”', weights: { explorer: 3 } },
      { emoji: '🎨', label: '“Can we make it prettier?”', weights: { 'artist-engineer': 3 } },
    ],
  },
  {
    q: 'Pick a superpower for them:',
    options: [
      { emoji: '🛠️', label: 'Fix anything', weights: { tinkerer: 3 } },
      { emoji: '🤖', label: 'Build a robot sidekick', weights: { inventor: 2, tinkerer: 1 } },
      { emoji: '🔭', label: 'See across the galaxy', weights: { explorer: 3 } },
      { emoji: '🧠', label: 'Solve any riddle', weights: { 'puzzle-master': 3 } },
    ],
  },
  {
    q: 'What’s on their bedroom floor right now?',
    options: [
      { emoji: '🧱', label: 'A half-built tower', weights: { tinkerer: 2, 'artist-engineer': 1 } },
      { emoji: '🔌', label: 'Batteries, wires, gadgets', weights: { inventor: 3 } },
      { emoji: '🪨', label: 'Rocks, shells, a bug jar', weights: { explorer: 3 } },
      { emoji: '🖍️', label: 'Drawings and craft projects', weights: { 'artist-engineer': 3 } },
    ],
  },
  {
    q: 'When something goes wrong, they…',
    options: [
      { emoji: '🔁', label: 'Try again a different way', weights: { tinkerer: 1, inventor: 2 } },
      { emoji: '📝', label: 'Make a careful plan first', weights: { 'puzzle-master': 2, explorer: 1 } },
      { emoji: '🧪', label: 'Turn it into an experiment', weights: { explorer: 2, inventor: 1 } },
      { emoji: '✨', label: 'Make it into something new', weights: { 'artist-engineer': 3 } },
    ],
  },
];

export function makerBySlug(slug: string) {
  return MAKER_TYPES.find((m) => m.slug === slug);
}

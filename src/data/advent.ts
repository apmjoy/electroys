// Electroys Advent Calendar: 24 ten-minute STEM activities with household
// supplies, one per day from December 1. Each pairs with a catalog pick.
// `adult` flags steps that need a grown-up (sharp, hot, or small batteries).

export interface AdventDay {
  day: number;
  title: string;
  emoji: string;
  minutes: number;
  supplies: string[];
  steps: string[];
  science: string;
  adult?: string;
  productId: string;
}

export const ADVENT: AdventDay[] = [
  {
    day: 1, emoji: '🍋', title: 'Make a lemon battery', minutes: 15,
    supplies: ['3–4 lemons', '3–4 copper coins or copper strips', '3–4 galvanized (zinc) nails', 'Alligator-clip wires', '1 small LED'],
    steps: ['Roll each lemon on the table to get the juice flowing.', 'Push one nail and one coin into each lemon, a few centimeters apart.', 'Clip the coin of one lemon to the nail of the next, making a chain.', 'Clip the free coin and the free nail to the two LED legs. No glow? Flip the LED around.'],
    science: 'The acid in the lemon lets the zinc and copper trade electrons. Each lemon makes a tiny voltage, and chaining them adds it up until there’s enough to light an LED.',
    adult: 'Help push the nails in, and don’t eat the lemons afterwards.',
    productId: 'snap-circuits-jr-sc-100',
  },
  {
    day: 2, emoji: '🚁', title: 'Paper helicopters', minutes: 10,
    supplies: ['A sheet of paper', 'Scissors', 'A paper clip'],
    steps: ['Cut a strip about 4 cm × 20 cm.', 'Cut down the middle of the top third, and fold the two flaps in opposite directions to make blades.', 'Fold the bottom up and add a paper clip for weight.', 'Drop it from up high and watch it spin. Try longer blades or two clips!'],
    science: 'As it falls, air pushes up on the angled blades, which turns the helicopter. The spin slows the fall, the same reason maple seeds twirl.',
    productId: 'crunchlabs-the-crunchinator',
  },
  {
    day: 3, emoji: '🚀', title: 'Straw rockets', minutes: 10,
    supplies: ['2 straws (one slightly thinner)', 'Paper', 'Tape'],
    steps: ['Wrap a small strip of paper around the thicker straw to make a tube, and tape it.', 'Slide it off, fold and tape one end shut: that’s your rocket.', 'Add paper fins at the open end.', 'Slip it onto the thinner straw and blow hard. Measure who goes farthest!'],
    science: 'Your breath pushes air into the rocket faster than it can escape, which launches it forward. Fins keep it flying straight.',
    productId: 'lego-creator-3in1-space-shuttle-31134',
  },
  {
    day: 4, emoji: '🌈', title: 'Walking water rainbow', minutes: 10,
    supplies: ['6 clear cups', 'Paper towels', 'Water', 'Red, yellow and blue food coloring'],
    steps: ['Line up 6 cups and fill every other one with water.', 'Color the full cups red, yellow and blue.', 'Fold paper towels into strips and bridge each cup to the next.', 'Check back in an hour: the water “walks” and mixes new colors in the empty cups.'],
    science: 'Water climbs the tiny gaps in the paper fibers. This is called capillary action, and it’s the same way plants drink from their roots.',
    productId: 'national-geographic-science-magic-kit',
  },
  {
    day: 5, emoji: '🤖', title: 'Program a grown-up robot', minutes: 10,
    supplies: ['Paper', 'A marker', 'A grown-up “robot”'],
    steps: ['Draw arrow cards: forward, turn left, turn right, and a “pick up” card.', 'Place a treat somewhere across the room.', 'Lay out a sequence of cards to guide the robot to the treat.', 'Run the program! The robot follows the cards exactly. Found a bug? Fix the code and run it again.'],
    science: 'This is exactly how coding works: a computer follows instructions in order, and debugging means finding and fixing the step that went wrong.',
    productId: 'learning-resources-code-and-go-robot-mouse',
  },
  {
    day: 6, emoji: '🎈', title: 'Balloon rocket racer', minutes: 10,
    supplies: ['A balloon', 'A long piece of string', 'A straw', 'Tape'],
    steps: ['Thread the string through the straw and tie it between two chairs, pulled tight.', 'Blow up the balloon and pinch the end (don’t tie it).', 'Tape the balloon to the straw.', 'Let go! Try a bigger breath, or a string that slopes uphill.'],
    science: 'Air rushing out the back pushes the balloon forward. That’s Newton’s third law: every action has an equal and opposite reaction.',
    productId: 'thames-kosmos-remote-control-machines',
  },
  {
    day: 7, emoji: '⚡', title: 'Bend water with static', minutes: 10,
    supplies: ['A balloon', 'Hair (or a wool sweater)', 'A kitchen tap'],
    steps: ['Turn on the tap to a very thin, steady stream.', 'Rub the balloon on your hair for 10 seconds.', 'Slowly bring the balloon close to the stream without touching it.', 'Watch the water bend toward the balloon!'],
    science: 'Rubbing moves electrons onto the balloon, giving it a static charge. That charge attracts the water molecules and pulls the stream sideways.',
    productId: 'thames-kosmos-electricity-magnetism',
  },
  {
    day: 8, emoji: '🧭', title: 'Make a compass', minutes: 15,
    supplies: ['A sewing needle', 'A fridge magnet', 'A small piece of cork or a leaf', 'A bowl of water'],
    steps: ['Stroke the needle with the magnet 30 times, always in the same direction.', 'Lay the needle on the cork or leaf.', 'Float it gently in the middle of the bowl.', 'Wait for it to settle. It points north–south! Check with a phone compass.'],
    science: 'Stroking lines up tiny magnetic regions in the steel, turning the needle into a weak magnet that lines up with Earth’s magnetic field.',
    adult: 'Handle the needle for younger kids.',
    productId: 'national-geographic-earth-science-kit',
  },
  {
    day: 9, emoji: '🗼', title: 'Marshmallow tower challenge', minutes: 15,
    supplies: ['Mini marshmallows', 'Toothpicks', 'A timer'],
    steps: ['Set a 10-minute timer.', 'Build the tallest tower you can, using marshmallows as joints.', 'Hint: try triangles instead of squares.', 'Test it: will it hold a coin on top?'],
    science: 'Triangles can’t change shape without bending a side, which makes them the strongest shape in building. That’s why bridges and cranes are full of them.',
    productId: 'magna-tiles-classic-100-piece',
  },
  {
    day: 10, emoji: '🔢', title: 'Binary bead bracelet', minutes: 15,
    supplies: ['Beads in two colors (plus a third for spacers)', 'String or elastic'],
    steps: ['Pick a color for 0 and one for 1.', 'Look up your initials in binary (A = 01000001, B = 01000010…).', 'String the beads for each letter, with a spacer bead in between.', 'Wear your secret code!'],
    science: 'Computers store everything (letters, photos, games) as patterns of 0s and 1s. Eight of them in a row make one letter.',
    productId: 'makeblock-mbot2',
  },
  {
    day: 11, emoji: '🎸', title: 'Rubber-band guitar', minutes: 10,
    supplies: ['A shoebox or plastic tub', 'Rubber bands of different thickness', 'A pencil'],
    steps: ['Stretch the rubber bands around the open box.', 'Slide a pencil under them near one end as a bridge.', 'Pluck each band and listen.', 'Which sounds higher: thin or thick? Tight or loose?'],
    science: 'Sound is vibration. Thin, tight bands vibrate faster and make higher notes; thick, loose bands vibrate slower and sound lower.',
    productId: 'snap-circuits-classic-sc-300',
  },
  {
    day: 12, emoji: '🥤', title: 'Rainbow density tower', minutes: 15,
    supplies: ['A tall clear glass', 'Honey', 'Dish soap', 'Water (with food coloring)', 'Cooking oil'],
    steps: ['Pour in the honey first.', 'Slowly pour dish soap down the side of the glass.', 'Add the colored water, then the oil, each slowly down the side.', 'Drop in small objects (a grape, a coin, a bead) and see where they stop.'],
    science: 'Each liquid has a different density, or how much stuff is packed in. Heavier liquids sink and lighter ones float on top, making layers.',
    productId: 'learning-resources-primary-science-lab-set',
  },
  {
    day: 13, emoji: '🥚', title: 'Egg drop challenge', minutes: 20,
    supplies: ['An egg (or a water balloon)', 'Straws, paper, tape, cotton balls, a small bag'],
    steps: ['Design a contraption to protect the egg from a fall.', 'Build it in 15 minutes.', 'Drop it from waist height, then from higher.', 'Did it survive? Improve the design and try again.'],
    science: 'Padding spreads the impact over more time, and parachutes slow the fall. Engineers call this design, test, improve, and they repeat it many times.',
    productId: 'lego-technic-aston-martin-valkyrie',
  },
  {
    day: 14, emoji: '☀️', title: 'Shadow clock', minutes: 10,
    supplies: ['A stick or pencil', 'Modeling clay', 'Paper', 'A sunny window or spot outside'],
    steps: ['Stand the stick upright in clay on the paper.', 'Trace the shadow and write the time.', 'Come back every hour and trace again.', 'By the evening you’ve made a sundial!'],
    science: 'The Sun seems to move across the sky because Earth is spinning. As it moves, shadows shift and stretch, which is how people told time for thousands of years.',
    productId: 'geosafari-omega-refractor-telescope',
  },
  {
    day: 15, emoji: '💡', title: 'Light-up greeting card', minutes: 20,
    supplies: ['Card stock', 'Copper tape', 'A CR2032 coin battery', 'An LED', 'Clear tape'],
    steps: ['Draw a picture with a spot where a light should glow.', 'Lay two lines of copper tape from the light spot to a corner of the card.', 'Tape the LED legs onto the two lines (long leg on one, short leg on the other).', 'Place the battery on the corner and fold the card over it to press. It glows!'],
    science: 'The copper tape makes a circuit: a loop that electricity flows around. Pressing the fold closes the loop like a switch.',
    adult: 'Coin batteries are dangerous if swallowed. Keep them away from little kids and supervise.',
    productId: 'electronics-for-kids-2nd-edition',
  },
  {
    day: 16, emoji: '💎', title: 'Grow overnight crystals', minutes: 10,
    supplies: ['Epsom salt', 'Hot tap water', 'A small bowl or jar', 'Food coloring (optional)'],
    steps: ['Stir ½ cup Epsom salt into ½ cup hot water until most of it dissolves.', 'Add a drop of food coloring.', 'Put it in the fridge overnight.', 'In the morning: spiky crystals!'],
    science: 'Hot water holds more dissolved salt than cold. As it cools, the extra salt comes out of the water and stacks into crystals.',
    adult: 'A grown-up should handle the hot water.',
    productId: 'national-geographic-mega-crystal-growing-kit',
  },
  {
    day: 17, emoji: '🎯', title: 'Craft-stick catapult', minutes: 15,
    supplies: ['7 craft sticks', 'Rubber bands', 'A bottle cap', 'Glue or tape', 'Pom-poms'],
    steps: ['Stack 5 sticks and band both ends tightly.', 'Band the other 2 sticks together at one end only.', 'Wedge the stack between the 2 sticks, then band it in a cross.', 'Glue a cap to the top stick, load a pom-pom, press and launch!'],
    science: 'The catapult is a lever. Pushing down stores energy in the bending stick, and releasing it turns that energy into motion.',
    productId: 'thames-kosmos-mega-cyborg-hand',
  },
  {
    day: 18, emoji: '🧩', title: 'Make your own tangram', minutes: 15,
    supplies: ['A square of paper or card', 'A ruler', 'Scissors'],
    steps: ['Search “tangram cutting guide” and draw the 7 pieces on your square.', 'Cut them out carefully.', 'Make a cat, a boat, a person, or invent your own shape.', 'Challenge: put the square back together!'],
    science: 'Tangrams train spatial reasoning: imagining how shapes rotate and fit. It’s the same thinking used in geometry, engineering and coding.',
    productId: 'smartgames-iq-puzzler-pro',
  },
  {
    day: 19, emoji: '❄️', title: 'Perfect snowflakes', minutes: 10,
    supplies: ['Paper (square)', 'Scissors'],
    steps: ['Fold the square in half to make a triangle, then in half again.', 'Fold it into thirds (like a fan) to get six sections.', 'Cut shapes along the edges.', 'Unfold! Every real snowflake has six sides too.'],
    science: 'Water molecules freeze into a hexagonal (six-sided) pattern, so every snowflake has six-fold symmetry, just like your paper one.',
    productId: 'educational-insights-kanoodle',
  },
  {
    day: 20, emoji: '🔐', title: 'Secret cipher wheel', minutes: 15,
    supplies: ['2 paper plates (one smaller, or trim one)', 'A pencil', 'A paper fastener'],
    steps: ['Write the alphabet around the edge of both plates.', 'Stack them and pin through the middle so they spin.', 'Turn the inner wheel 3 letters: A now lines up with D.', 'Write a secret message and swap with someone who knows the key!'],
    science: 'This is a Caesar cipher, one of the oldest codes. Modern encryption keeps your messages safe online using the same idea, with much bigger math.',
    productId: 'python-for-kids-2nd-edition',
  },
  {
    day: 21, emoji: '🧊', title: 'The great ice melt race', minutes: 15,
    supplies: ['4 ice cubes on plates', 'Salt', 'Sugar', 'Sand or soil', 'A timer'],
    steps: ['Sprinkle salt on one cube, sugar on another, sand on a third, and leave one plain.', 'Predict which melts fastest.', 'Check every 5 minutes.', 'Which won? Why do you think roads get salted in winter?'],
    science: 'Salt lowers the temperature at which water freezes, so salted ice melts even when it’s cold. That’s why roads get salted in winter.',
    productId: 'thames-kosmos-chem-c1000',
  },
  {
    day: 22, emoji: '🎳', title: 'Cardboard marble run', minutes: 20,
    supplies: ['Toilet-paper and paper-towel tubes', 'Tape', 'A marble', 'A wall or a big box'],
    steps: ['Cut tubes in half lengthwise to make ramps.', 'Tape them to a wall or box in a zig-zag.', 'Drop a marble at the top.', 'Add a jump, a tunnel or a cup to catch it at the end!'],
    science: 'The marble trades height (potential energy) for speed (kinetic energy). Steeper ramps make it faster; gentle ones give more control.',
    productId: 'ravensburger-gravitrax-starter-set',
  },
  {
    day: 23, emoji: '🔭', title: 'Winter stargazing hunt', minutes: 20,
    supplies: ['A clear evening', 'Warm clothes', 'A star chart (a free app works)'],
    steps: ['Go somewhere dark and let your eyes adjust for 10 minutes.', 'Find the Moon, then look for Orion’s Belt: three bright stars in a row.', 'Spot a “star” that doesn’t twinkle. It’s probably a planet!', 'Draw what you saw.'],
    science: 'Stars twinkle because their light is bent by moving air. Planets are closer, so they look like tiny discs and shine more steadily.',
    productId: 'celestron-starsense-explorer-lt-80az',
  },
  {
    day: 24, emoji: '📞', title: 'Cup-and-string telephone', minutes: 10,
    supplies: ['2 paper cups', 'A long piece of string', 'A pencil', '2 paper clips'],
    steps: ['Poke a small hole in the bottom of each cup.', 'Thread the string through and tie each end to a paper clip inside the cup.', 'Walk apart until the string is tight.', 'One person talks into a cup while the other listens. Merry Christmas Eve!'],
    science: 'Your voice makes the cup vibrate, the tight string carries the vibration, and the other cup turns it back into sound. Sound needs something to travel through.',
    productId: 'snap-circuits-pro-sc-500',
  },
];

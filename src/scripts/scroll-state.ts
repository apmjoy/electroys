// "Is the visitor scrolling right now?" Decorative WebGL scenes and the card
// tilt check this and skip their work mid-scroll, so scrolling always gets the
// full frame budget. (Deliberately no class toggles on <html>: restyling the
// whole page on every scroll start/stop cost more than it saved.)
let scrolling = false;
let timer = 0;
addEventListener('scroll', () => {
  scrolling = true;
  clearTimeout(timer);
  timer = window.setTimeout(() => { scrolling = false; }, 160);
}, { passive: true });

export const isScrolling = () => scrolling;

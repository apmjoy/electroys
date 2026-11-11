// Decides whether (and how) to offer "Get the app" on this device:
//  - Chrome / Edge / Android: real install prompt (beforeinstallprompt)
//  - iPhone / iPad: a 3-step "Add to Home Screen" guide
//  - Facebook / Instagram / WhatsApp in-app browsers: "open in your browser" hint
//  - Already installed, or dismissed in the last 14 days: nothing
import { buzz, toast, track } from './site';

const KEY = 'electroys.getapp.dismissed';
const ua = navigator.userAgent;
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const inApp = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\//i.test(ua);
const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const dismissed = (() => { try { return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < 14 * 864e5; } catch { return false; } })();

let deferred: any = null;
const boxes = () => Array.from(document.querySelectorAll<HTMLElement>('[data-getapp]'));

function show(mode: 'install' | 'ios' | 'inapp') {
  if (standalone || dismissed) return;
  for (const box of boxes()) {
    const action = box.querySelector<HTMLButtonElement>('[data-ga-action]')!;
    const sub = box.querySelector<HTMLElement>('[data-ga-sub]')!;
    box.dataset.mode = mode;
    if (mode === 'install') { action.textContent = 'Install'; sub.textContent = sub.dataset.pitch ?? ''; }
    if (mode === 'ios') { action.textContent = 'Show me'; sub.textContent = sub.dataset.pitch ?? ''; }
    if (mode === 'inapp') { action.textContent = 'Copy link'; sub.textContent = `Open this page in ${ios ? 'Safari' : 'Chrome'} to add Electroys to your home screen.`; }
    box.hidden = false;
  }
  track('app_install_offer', { mode });
}

if (standalone) document.documentElement.classList.add('is-app');

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // we show our own, better-placed button
  deferred = e;
  show('install');
});
addEventListener('appinstalled', () => {
  boxes().forEach((b) => (b.hidden = true));
  toast('Installed! Find Electroys on your home screen.');
  buzz([15, 40, 25]);
  track('app_installed', {});
});

if (!standalone) {
  if (inApp) show('inapp');
  else if (ios) show('ios');
}

document.addEventListener('click', async (e) => {
  const t = e.target as Element;
  const box = t.closest<HTMLElement>('[data-getapp]');
  if (!box) return;
  if (t.closest('[data-ga-dismiss]')) {
    boxes().forEach((b) => (b.hidden = true));
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ }
    return;
  }
  if (!t.closest('[data-ga-action]')) return;
  buzz(10);
  if (box.dataset.mode === 'install' && deferred) {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    track('app_install_choice', { outcome });
    deferred = null;
    if (outcome === 'accepted') boxes().forEach((b) => (b.hidden = true));
  } else if (box.dataset.mode === 'ios') {
    document.querySelector<HTMLDialogElement>('[data-ios-sheet]')?.showModal();
  } else if (box.dataset.mode === 'inapp') {
    try { await navigator.clipboard.writeText(location.href); toast('Link copied. Paste it into your browser.'); } catch { toast('Use the ⋯ menu and choose “Open in browser”.'); }
  }
});

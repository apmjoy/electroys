// The homepage reads like a magazine issue. Its name follows the season and its
// number counts months since the relaunch, so the daily rebuild keeps it current.

const LAUNCH = { year: 2026, month: 10 }; // November 2026 = No. 01 (0-based month)

export function currentIssue(now = new Date()) {
  const m = now.getMonth();
  const name =
    m >= 9 ? 'The Holiday Issue'
    : m <= 1 ? 'The Winter Build Issue'
    : m <= 4 ? 'The Spring Discovery Issue'
    : m <= 7 ? 'The Summer Maker Issue'
    : 'The Back-to-School Issue';
  const months = (now.getFullYear() - LAUNCH.year) * 12 + (m - LAUNCH.month);
  const number = String(Math.max(1, months + 1)).padStart(2, '0');
  const season = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { name, number, season };
}

export type Theme = 'dark' | 'light';
export const THEME_KEY = 'glucotwin.theme';
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme works when storage is unavailable. */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#151718' : '#f6f7f9');
}

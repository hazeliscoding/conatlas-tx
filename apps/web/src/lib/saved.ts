// The saved list: edition ids kept in this browser's localStorage. No account, nothing uploaded.
// Browser-only; pages import it from their <script> tags.
const KEY = 'conatlas-saved';
// Set when storage refuses a write (private browsing, full quota), so saving still works until
// the page is left.
let fallback: string[] | undefined;

export function getSaved(): string[] {
  if (fallback) return fallback;
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function setSaved(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    fallback = undefined;
  } catch {
    fallback = ids;
  }
  document.dispatchEvent(new Event('saved-change'));
}

/** Runs `render` now and whenever the list changes, in this tab or another one. */
export function onSavedChange(render: () => void) {
  document.addEventListener('saved-change', render);
  addEventListener('storage', (event) => {
    if (event.key === KEY) render();
  });
  render();
}

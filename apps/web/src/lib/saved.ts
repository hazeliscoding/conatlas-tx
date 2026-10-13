// The saved list: edition ids kept in this browser's localStorage. No account, nothing uploaded.
// Browser-only; pages import it from their <script> tags.
const KEY = 'conatlas-saved';
// Used when storage is blocked, so saving still works until the page is left.
let fallback: string[] = [];

export function getSaved(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return fallback;
  }
}

export function setSaved(ids: string[]) {
  fallback = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private browsing or full storage: keep the in-page copy.
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

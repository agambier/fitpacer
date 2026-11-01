// localStorage wrapper: preferences only (last pasted text, HR cap, voice on/off, theme, welcome seen).
export const store = {
  get(k: string, d: string): string {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : v;
    } catch {
      return d;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: ignore */
    }
  },
};

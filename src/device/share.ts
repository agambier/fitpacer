// Copy / share / download text, with fallbacks.

export async function copyText(text: string, fallbackEl?: HTMLTextAreaElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackEl) {
      fallbackEl.focus();
      fallbackEl.select();
    }
    return false;
  }
}

function makeFile(name: string, text: string, type: string) {
  return new File([text], name, { type });
}

/** True when the browser can share a file (Web Share API level 2). */
export function canShareFiles(): boolean {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [makeFile("a.txt", "a", "text/plain")] });
  } catch {
    return false;
  }
}

/**
 * Shares the text as a .txt file (WhatsApp, Gmail, Drive…). Android refuses .md files, and a page gets a
 * single share() per tap, so there is exactly one attempt, with the plain-text type every target accepts.
 */
export async function shareText(name: string, text: string, title: string): Promise<"ok" | "cancel" | "unsupported"> {
  const f = makeFile(name.replace(/\.md$/, ".txt"), text, "text/plain");
  try {
    if (!navigator.canShare?.({ files: [f] })) return "unsupported";
    await navigator.share({ files: [f], title });
    return "ok";
  } catch (e) {
    return (e as Error).name === "AbortError" ? "cancel" : "unsupported";
  }
}

export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

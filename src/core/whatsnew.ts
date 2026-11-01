// "Quoi de neuf ?" popup: what changed, written for everyday users (not developers).
// Add an entry for each version (newest first) before it is released; see CLAUDE.md.

export interface ReleaseNotes {
  version: string; // "vYY.MM.XX", without "-dev"
  items: string[];
}

export const RELEASES: ReleaseNotes[] = [
  {
    version: "v26.11.01",
    items: [
      "Nouvelle icône : un cœur qui bat, traversé par un tracé de rythme cardiaque.",
      "Les répétitions s’écrivent plus simplement : « x10 » suffit (au lieu de « 10 rép »). Vos anciennes séances fonctionnent toujours.",
      "Vous pouvez ouvrir une séance enregistrée dans un fichier sur le téléphone : reçue par e-mail, téléchargée ou dans votre cloud.",
      "Des boutons plus simples, avec des icônes : ouvrir un fichier, coller, effacer ; et à la fin de la séance : copier, partager, télécharger.",
      "Progressions plus souples : vous pouvez choisir l’écart entre les paliers (« 3 → 5 km/h par 1 ») et monter en moins de temps que l’étape (« 3 → 5 km/h en 3:00 », puis 5 km/h jusqu’à la fin).",
      "Avant chaque palier, le compte à rebours passe en orange à 10 secondes et bipe à 5 secondes, comme le chrono principal. Celui-ci bipe désormais à partir de 5 secondes (au lieu de 3).",
      "Pendant les repos, la voix lit aussi les consignes du programme (par exemple « allongé sur le dos »).",
      "Pendant un repos, le bouton Pause est désactivé : le repos est déjà une pause.",
      "En pause, un grand compteur indique depuis combien de temps vous êtes arrêté.",
      "Les pauses de plus de 10 secondes que vous prenez avec le bouton Pause sont notées dans le rapport de fin de séance (où et combien de temps), pour que Claude en tienne compte. Si la montre est connectée, la fréquence cardiaque au début et à la fin de la pause est notée aussi.",
      "Le bouton Partager propose bien vos applications (WhatsApp, Gmail…) pour envoyer le rapport de séance.",
      "Une fenêtre de bienvenue pour découvrir l’app, et cette fenêtre « Quoi de neuf ? » à chaque nouvelle version.",
    ],
  },
];

/** "v26.11.01-dev" -> 261101 (NaN if unreadable). */
export function versionNumber(v: string): number {
  const m = v.match(/^v(\d{2})\.(\d{2})\.(\d{2})/);
  return m ? +(m[1] + m[2] + m[3]) : NaN;
}

/** Releases newer than `seen` and up to `current` (newest first). */
export function notesSince(seen: string, current: string): ReleaseNotes[] {
  const from = versionNumber(seen);
  const to = versionNumber(current);
  return RELEASES.filter((r) => {
    const n = versionNumber(r.version);
    return n <= to && !(n <= from);
  });
}

/**
 * What to show at launch. `seen` = version recorded on this phone ("" if none), `welcomed` = the welcome popup
 * was already shown. A fresh install gets the welcome popup only; an update gets the notes of the new versions.
 */
export function launchPopup(seen: string, welcomed: boolean, current: string): "welcome" | "whatsnew" | "none" {
  if (!welcomed) return "welcome";
  if (seen && versionNumber(seen) >= versionNumber(current)) return "none";
  return notesSince(seen, current).length ? "whatsnew" : "none";
}

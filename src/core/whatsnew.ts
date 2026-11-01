// "Quoi de neuf ?" popup: what changed, written for everyday users (not developers).
// Add an entry for each version (newest first) before it is released; see CLAUDE.md.

export interface ReleaseNotes {
  version: string; // "vYY.MM.XX", without "-dev"
  items: string[];
}

export const RELEASES: ReleaseNotes[] = [
  {
    version: "v26.11.03",
    items: [
      "Pour les exercices en répétitions (pompes, abdos…), la voix annonce simplement l’exercice, sans répéter à chaque fois « Touchez Fait quand c’est terminé ».",
    ],
  },
  {
    version: "v26.11.02",
    items: [
      "Les « Consignes pour l’IA » (le menu s’appelait « Consignes pour Claude ») montrent maintenant des exemples de ce que l’app lui renvoie : la ligne du journal, et le fichier téléchargé en fin de séance avec le détail de chaque exercice. L’IA comprend ainsi mieux comment s’est passée votre séance.",
      "Pendant la séance, « Terminer la séance » est maintenant un vrai bouton, toujours visible en bas de l’écran.",
      "La FC max est maintenant écrite dans la séance (ligne « fc max: … ») et ne se règle plus dans l’app. Au-dessus, un bandeau rouge s’affiche, en plus des bips et de la voix.",
      "L’IA peut donner une plage de fréquence cardiaque pour un exercice (par exemple entre 120 et 145). Pendant l’exercice, une jauge montre si vous êtes dedans, et une voix vous dit d’accélérer ou de ralentir si vous en sortez plus de 15 secondes.",
      "Le rapport de fin de séance indique le temps passé dans chaque plage de fréquence cardiaque.",
    ],
  },
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
      "Les pauses de plus de 10 secondes que vous prenez avec le bouton Pause sont notées dans le rapport de fin de séance (où et combien de temps), pour que l’IA en tienne compte. Si la montre est connectée, la fréquence cardiaque au début et à la fin de la pause est notée aussi.",
      "Les questions comme « Terminer la séance ? » s’affichent dans une fenêtre de l’app, plus lisible.",
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

# FitPacer — consignes pour Claude

PWA compagnon d'entraînement : l'utilisateur colle une séance (texte généré par Claude dans une conversation),
l'app le **cadence** (minuteur, répétitions, vitesse/pente/charge, bips, vibrations), affiche la **FC** reçue
de la montre en Bluetooth, puis produit une **ligne de journal** à recoller dans la conversation.

Vision produit, format de séance et backlog : voir `NOTES.md`.
Prototype fonctionnel de référence (un seul fichier HTML) : `reference/prototype-workout.html`.
Le comportement du prototype fait foi tant que `NOTES.md` ne dit pas autre chose.

## Principes non négociables (MVP)

- **Aucun backend, aucun compte, aucun appel réseau** pour les données. Tout tourne dans le navigateur.
- **Pas de stockage de séances/historique.** Seules exceptions tolérées en `localStorage` : dernier texte collé
  et plafond FC (confort). Toujours dans un `try/catch`.
- **Fonctionne hors ligne** une fois installée (service worker, assets précachés, polices auto-hébergées —
  pas de Google Fonts en CDN).
- **Mobile d'abord** : Android + Chrome/Brave, usage sur tapis ou au sol, écran vu de loin.
  Gros chiffres, grosses zones tactiles, lisible en plein effort.
- **Interface 100 % en français.** Code, noms de variables et commentaires : en anglais. Commits : en français ou anglais, au présent, concis.
- Le **format de séance** (DSL) est un contrat avec Claude-conversation : toute évolution doit rester
  rétrocompatible et être documentée dans `NOTES.md` (section « Format de séance »).
- Idem pour le **format de la ligne de journal**.

## Stack

- Vite + TypeScript (strict), **sans framework UI** (DOM natif, comme le prototype). Ne pas ajouter React/Vue
  etc. sans demander.
- `vite-plugin-pwa` (manifest + service worker, stratégie precache).
- Tests : Vitest (priorité au parseur de séance et à la génération de la ligne de journal).
- Déploiement : GitHub Pages (HTTPS obligatoire pour Web Bluetooth et le service worker).

## Commandes

```
npm install
npm run dev       # serveur de dev (--host ; le Bluetooth exige HTTPS)
npm run build     # tsc + build de prod (dist/) ; BASE=/fitpacer/ pour GitHub Pages
npm run preview   # tester le build + service worker
npm test          # Vitest (tests/)
```

Déploiement : `.github/workflows/deploy.yml`, sur push vers `main` ou une branche `ccr-*`
(l'environnement GitHub `github-pages` autorise ce motif). Un seul site : le dernier push déployé gagne.

## Architecture

```
index.html           # les 3 écrans (programme, séance, bilan)
src/
  main.ts            # câblage UI <-> cœur
  styles.css
  core/              # logique pure, sans DOM, testée
    program.ts       # texte -> Program (format v1)
    ramp.ts          # progressions A → B en paliers
    session.ts       # moteur de séance (temps injecté), statuts fait/écourté/sauté/arrêt
    journal.ts       # ligne de journal, analyses FC, export Markdown
    speech.ts        # textes des annonces vocales
    instructions.ts  # consignes pour Claude (source unique du format)
    format.ts        # formats FR (nombres, durées, dates)
  device/            # navigateur : Bluetooth FC, bips/vibration/wake lock, voix, partage, stockage
tests/               # Vitest
public/              # icônes
examples/            # séances réelles (fixtures)
reference/           # prototype HTML d'origine (ne pas modifier)
```

Garder la logique (parseur, moteur, journal) **séparée du DOM** pour pouvoir la tester.

## Points techniques à connaître

- Web Bluetooth : uniquement contexte sécurisé, Chrome/Edge Android et desktop ; Brave nécessite
  `brave://flags` → Web Bluetooth. **Pas d'iOS/Safari.** Toujours dégrader proprement (message clair).
- `requestDevice` doit être appelé dans un geste utilisateur. Filtre `heart_rate`, puis repli
  `acceptAllDevices` si rien n'est trouvé (cf. prototype).
- Le timer se base sur `performance.now()` (pas sur un compteur incrémenté) pour rester juste malgré
  la mise en veille des onglets.
- AudioContext créé/repris au clic « Démarrer » (politique autoplay).
- Wake Lock réacquis au retour de visibilité.
- Thème sombre par défaut (cf. captures), thème clair via `prefers-color-scheme`.

## Façon de travailler

- Petits incréments, une fonctionnalité à la fois ; vérifier sur mobile réel quand c'est pertinent.
- Ajouter/mettre à jour les tests du parseur à chaque changement du format.
- Ne pas modifier `reference/`.
- Mettre à jour `NOTES.md` (backlog, décisions) quand une décision est prise.

# FitPacer — consignes pour Claude

PWA compagnon d'entraînement : l'utilisateur colle une séance (texte généré par Claude dans une conversation),
l'app le **cadence** (minuteur, répétitions, vitesse/pente/charge, bips, vibrations), affiche la **FC** reçue
de la montre en Bluetooth, puis produit une **ligne de journal** à recoller dans la conversation.

Vision produit, format de séance et backlog : voir `NOTES.md`.
Prototype fonctionnel de référence (un seul fichier HTML) : `reference/prototype-workout.html`.
Le comportement du prototype fait foi tant que `NOTES.md` ne dit pas autre chose.

## Principes non négociables (MVP)

- **Aucun backend, aucun compte, aucun appel réseau** pour les données. Tout tourne dans le navigateur.
- **Pas de stockage de séances/historique.** Seules exceptions tolérées en `localStorage` (confort) :
  dernier texte collé, voix on/off, thème sombre/clair, fenêtre de bienvenue déjà vue, dernière version vue (« Quoi de neuf ? »). Toujours via
  `device/store.ts`. Toute nouvelle donnée stockée doit être ajoutée à la section « Vie privée » de l'aide.
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
(l'environnement GitHub `github-pages` autorise ce motif). Un seul site Pages, deux apps, reconstruites
toutes les deux à chaque déploiement :

- **stable** : `https://agambier.github.io/fitpacer/` = `main` (build `CHANNEL=stable`) ;
- **développement** : `https://agambier.github.io/fitpacer/dev/` = la branche `ccr-*` poussée
  (sur un push vers `main` : la branche `ccr-*` non fusionnée la plus récente, sinon `main`), build `CHANNEL=dev`,
  nom d'app « FitPacer DEV ».

Le service worker stable exclut `/dev/` de son repli de navigation (`vite.config.ts`) ; chaque app a
son propre service worker. Le `localStorage` est partagé (même origine).

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
    whatsnew.ts      # textes de « Quoi de neuf ? » par version, choix bienvenue / nouveautés au lancement
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
- Thème sombre par défaut (cf. captures), thème clair (gris clairs) au choix dans le menu (`device/theme.ts`) ; sans choix enregistré, `prefers-color-scheme` s'applique.

## Version de l'app

Format **`vAA.MM.XX`** (année et mois sur deux chiffres, XX = numéro de version dans le mois, repart à
01 chaque mois). Source unique : `src/version.ts` (affichée dans le menu et dans le fichier exporté).

- Seule une version **confirmée stable par l'utilisateur** s'écrit sans suffixe (ex. `v26.10.02`).
- Toute modification non encore confirmée porte le suffixe **`-dev`** :
  - après la stable `v26.10.02`, la première modification passe en `v26.10.03-dev` (mois suivant :
    `v26.11.01-dev`) ; les modifications suivantes gardent ce même numéro ;
  - quand l'utilisateur confirme que c'est stable, on retire `-dev` (→ `v26.10.03`).
- Ne jamais retirer `-dev` ni changer de numéro sans que l'utilisateur l'ait dit.
- Pendant le développement : on ne pousse **que** sur la branche `ccr-*` de la session → déployé sur la
  page de développement (`/fitpacer/dev/`). La page stable n'est jamais touchée.
- **« Quoi de neuf ? »** : dès la première modification d'une version, ajouter/compléter son entrée en tête de
  `src/core/whatsnew.ts` (numéro sans `-dev`), en langage simple pour un utilisateur lambda (pas de jargon,
  pas de détails techniques). La fenêtre s'affiche une fois après chaque mise à jour (un test vérifie
  que l'entrée de la version courante existe).
- Quand l'utilisateur dit que la version est stable (cela vaut autorisation de pousser sur `main`) :
  retirer `-dev`, vérifier l'entrée de `src/core/whatsnew.ts`, ajouter sa section dans `CHANGELOG.md`, committer sur la branche `ccr-*`, puis
  fusionner dans `main` et pousser `main`. Le push sur `main` déploie automatiquement la page stable,
  et `.github/workflows/release.yml` crée le tag `vAA.MM.XX` et la release GitHub (l'environnement de
  Claude ne peut pas pousser de tag lui-même).
- **Toujours vérifier** après chaque push (outils GitHub `actions_list` / `get_workflow_run`, `get_release_by_tag`) :
  le workflow de déploiement se termine en succès ; sur `main`, le workflow Release aussi et la release
  `vAA.MM.XX` existe avec le bon texte. Ne pas annoncer « déployé » avant. (Un run `ccr-*` « cancelled »
  remplacé par le run `main` du même commit est normal.) Le site github.io n'est pas joignable depuis
  l'environnement de Claude : le dire plutôt que de prétendre l'avoir vu.
- Dernière version stable confirmée : `v26.11.03` (01/11/2026). La prochaine modification passe en `v26.11.04-dev` (ou `v26.12.01-dev` si elle est faite en décembre).

## Façon de travailler

- Petits incréments, une fonctionnalité à la fois ; vérifier sur mobile réel quand c'est pertinent.
- Ajouter/mettre à jour les tests du parseur à chaque changement du format.
- Ne pas modifier `reference/`.
- Mettre à jour `NOTES.md` (backlog, décisions) quand une décision est prise.

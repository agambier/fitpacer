# FitPacer — notes produit

## Le principe

**C'est Claude qui propose la séance**, pas moi : dans la conversation, Claude (qui connaît mon journal)
me propose une séance adaptée et en génère la description au format FitPacer. Je ne fais que copier /
coller. L'app ne crée ni ne modifie jamais de séance.

1. Dans une conversation, Claude génère une séance (maison, salle) au **format FitPacer** (ci-dessous).
2. Je copie le texte et je le colle dans l'app (bouton « Coller »).
3. L'app affiche le programme, je règle mon plafond de FC, je connecte ma montre (Suunto, partage FC
   en Bluetooth), je démarre.
4. L'app me cadence : étape en cours, vitesse / pente / charge, compte à rebours ou nombre de
   répétitions (« Fait ✓ »), étape suivante, bips + vibrations, alerte si la FC dépasse le plafond.
5. À la fin : bilan (durée, FC min/moy/max, courbe, FC par étape), je note mon **ressenti (RPE 1–10)**
   et un **commentaire**.
6. L'app génère une **ligne de journal** que je copie et redonne à Claude pour qu'il suive mon évolution.

Les séances en extérieur restent sur la montre Suunto : hors périmètre.

## Périmètre du MVP

Reproduire le prototype (`reference/prototype-workout.html`) sous forme de PWA installable :

- [x] Écran **Programme** : zone de texte, Coller / Effacer, aide sur le format, erreurs de lecture
      ligne par ligne, plafond FC, aperçu des étapes, durée estimée, « Démarrer ».
- [x] Écran **Séance** : nom + n° de répétition (2/5), paramètres (vitesse, pente…), note, gros chrono
      (orange sur les 10 dernières s), mode répétitions avec bouton « Fait ✓ », visuel de pente,
      « Ensuite », barre de segments, temps écoulé / restant, courbe FC, Préc. / Pause / Suiv.,
      « Terminer la séance ».
- [x] Écran **Bilan** : stats, courbe, tableau FC par étape, RPE, commentaire, ligne de journal, « Copier ».
- [x] **Reprise après pause** : si la voix est active, « Reprendre » répète les consignes de l'étape
      en cours (temps restant, palier actuel des progressions, note ; pour un repos : l'exercice suivant).
- [x] **Barre de menu** (en haut, toujours visible) : icône de l'app et version `vAA.MM.XX` à gauche,
      bouton ☰ à droite (décision du 31/10).
      Le menu ouvre trois fenêtres : **Aide sur le format**, **Consignes pour Claude**
      (Copier / Partager / Télécharger), **À propos** (auteur — Alexandre Gambier, avec l'aide de l'IA —, version, version du format, lien vers le code).
      La version figure aussi dans le fichier exporté.
      Sur la page de développement (`/dev/`, build `CHANNEL=dev`), un badge orange « Développement »
      s'affiche au milieu de la barre (décision du 31/10).
      Le menu propose aussi un sous-menu **Thème** : **Sombre** (par défaut) / **Clair** (gris clairs) ; le choix est
      gardé sur le téléphone, sinon le réglage du système s'applique (décision du 31/10).
- [x] **Aide** (menu ☰) en trois parties : Format de séance, Connexion de la montre (dépannage),
      Vie privée (ce qui est gardé sur le téléphone : dernière séance collée, plafond FC, choix de la
      voix, thème ; rien n'est envoyé).
- [x] **Navigateurs sans Bluetooth web** : « Connecter la montre » explique pourquoi et quoi faire
      (iPhone / iPad, Brave sans le flag, Firefox, Samsung Internet, navigateur intégré à une app,
      page non sécurisée, autre navigateur). Dans ces cas « Démarrer » ne propose pas la montre et
      la séance démarre directement, avec un rappel « séance sans FC ».
      Navigateur compatible mais Bluetooth du téléphone coupé, ou Bluetooth bloqué pour le site :
      message dédié au moment de la connexion.
- [x] **Question au démarrage** : si la montre n'est pas connectée (et que le Bluetooth web existe),
      « Démarrer » demande « Voulez-vous la connecter ? ». Oui → sélecteur Bluetooth, puis la séance
      démarre (avec ou sans FC selon le résultat) ; Non → la séance démarre tout de suite sans montre.
- [x] **FC Bluetooth** : connexion, affichage couleur (calme / proche du plafond / au-dessus / périmée),
      reconnexion automatique.
- [x] **Retours** : bips (3-2-1, changement d'étape, fin, alerte FC), vibrations, écran maintenu allumé.
- [x] **Annonce vocale** de chaque nouvelle étape (`speechSynthesis`, voix française), activable /
      désactivable (bouton dans l'en-tête, choix mémorisé). L'annonce dépend du type d'étape :
  - **Étape chronométrée** (`4:00`, `45s`…) : nom + durée + infos.
    Ex. « Montée, 1 minute, 5,5 kilomètres heure, pente 9 pour cent. »
    Le chrono passe tout seul à l'étape suivante, avec les bips 3-2-1.
  - **Étape en répétitions** (`10 rép`, `max`…) : nom + nombre + rappel du bouton.
    Ex. « Pompes, 10 répétitions. Touchez Fait quand c'est terminé. »
    Pas de compte à rebours : l'étape attend que je touche **« Fait ✓ »** (gros bouton vert) avant de
    passer à la suite (le temps passé est affiché, « En cours depuis 0:35 »).
  - Annoncer aussi la note de l'étape si elle existe (« monter progressivement »).
  - **Étape de repos** (`Repos…`, `Récup…`) : annoncer la durée **et l'exercice suivant** pour
    se préparer. Ex. « Repos, 1 minute 30. Ensuite : planche, 30 secondes. »
    Repos de moins de 15 s : version courte, « Repos. Ensuite : planche latérale droite. »
  - Une annonce ne doit jamais chevaucher les bips 3-2-1 : si elle est trop longue pour l'étape,
    on raccourcit (nom seul) et on n'annonce pas la note.
  - Annonce de fin de séance ; alerte FC parlée (« Fréquence cardiaque au-dessus de 150 ») en plus du bip.
  - Les bips restent : la voix vient après le bip de changement d'étape, sans le remplacer.
  - Lecture des unités en toutes lettres (`km/h` → « kilomètres heure », `%` → « pour cent »,
    `→` → « à », `4:00` → « 4 minutes », `45s` → « 45 secondes »).
- [x] **Progressions guidées** (étapes chronométrées uniquement) : une info de la forme
      `A → B unité` (ou `A -> B unité`) est une progression linéaire sur la durée de l'étape.
  - Unités gérées et pas des paliers : `km/h` → 0,5 ; `%` → 0,5 ; `niv` / niveau → 1 ; `W` → 10 ;
    `rpm` → 5. Autre unité : affichée telle quelle, sans guidage.
  - Nombre de paliers = |B − A| / pas + 1, chacun de même durée. Ex. `4 → 5,5 km/h` sur 5:00 →
    4 / 4,5 / 5 / 5,5, un palier toutes les 1:15 ; `5,5 → 3 km/h` sur 5:00 → 6 paliers de 0:50.
  - Écran : la valeur **à régler maintenant** en gros (« 4,5 km/h »), et en petit la cible
    (« → 5,5 ») + « prochain palier dans 0:12 ».
  - À chaque palier : double bip court + vibration + voix « Passez à 5 kilomètres heure »
    (ou « Pente 8 pour cent »). Pas de bips 3-2-1 avant un palier (seulement avant un changement d'étape).
  - Deux progressions dans la même étape (vitesse et pente) : chacune a ses paliers, annonces
    regroupées si elles tombent à la même seconde.
  - Étape en répétitions : pas de guidage, texte affiché tel quel.
  - Ligne de journal : la progression est recopiée telle quelle (`Chauffe 5 min (4 → 5,5 km/h, 0 %)`).
- [x] **Poids et tour de taille** : deux champs optionnels sur l'écran Bilan (`kg`, `cm`, clavier
      numérique, virgule acceptée). Remplissent les colonnes 7 et 8 de la ligne de journal
      (`82,4 kg`, `94 cm`), sinon `–`. Rien n'est mémorisé d'une séance à l'autre.
- [x] **FC manquante signalée** : si la montre n'était pas connectée (aucune FC), ou s'il manque plus
      de 10 % de la FC (déconnexion), la remarque du journal le dit (« montre non connectée : … » /
      « FC partielle : reçue 23 min sur 35 … ») et le fichier exporté l'indique en tête.
- [x] **Analyses FC automatiques**, ajoutées en fin de colonne remarque (après mon commentaire,
      séparées par ` ; `), uniquement si les données FC le permettent :
  - **Dérive cardiaque** : pour chaque étape chronométrée (même nom + mêmes infos, hors repos) dont
    chaque passage dure au moins 2 min et qui est répétée au moins 2 fois, ou d'au moins 8 min d'un seul
    tenant (les efforts courts — corde 30 s, planche — ne donnent pas de dérive exploitable), comparer la FC moyenne du premier passage à celle du dernier
    (en ignorant les 60 premières secondes de chaque passage, temps de montée de la FC).
    Ne l'écrire que si l'écart est d'au moins 5 bpm. Ex. « dérive FC Marche ~128→142 ».
  - **Récupération** : FC à la fin de la dernière étape d'effort, en sautant les repos (moyenne des 10 dernières s avant
    l'étape de retour au calme ou la fin de séance), puis FC 1 min après et FC en fin de séance.
    Ex. « récup FC 144→121 en 1 min, 112 en 5 min ».
    Étape « retour au calme » reconnue par son nom (`Retour au calme`, `Récup…`, `Étirements`…) ;
    à défaut, la dernière étape.
  - Seuils et règles regroupés dans un module pur et testé (`journal/`).
- [x] **Consignes pour Claude** : dans le menu ☰, une fenêtre « Consignes pour Claude »
      avec trois boutons **Copier**, **Partager**, **Télécharger** (fichier
      `fitpacer-consignes-claude.md`, repli `.txt`). Contenu = texte prêt à coller dans les
      instructions du projet Claude : rôle (Claude propose la séance), format de séance complet
      (en-tête, étapes, chrono vs répétitions, repos, progressions `A → B`, blocs `xN { }`, règles :
      toujours finir par un retour au calme, pas de ``` ni de `---`), puis le bloc « journal ».
      Version du format indiquée en tête (`Format FitPacer v1`) ; le texte est généré depuis une
      source unique dans le code, la même que l'aide affichée et les tests.
- [x] **Partage de fichiers** (commun au bilan et aux consignes) : Copier / Partager (Web Share API
      niveau 2 avec fichier) / Télécharger (Blob + lien `download`) ; boutons masqués si non supportés.
- [x] **PWA** : manifest, icônes, installable, hors ligne, polices locales.
- [x] **Icône** (v26.11.01) : cœur rouge traversé par un tracé de rythme cardiaque, ondes de battement
      de part et d'autre ; fond sombre `#101C26`. Source : `public/favicon.svg` (PNG dérivés).

Explicitement **hors MVP** : comptes, sync, historique, envoi automatique à Claude, GPS, iOS.

## Format de séance (contrat avec Claude)

```
titre: Tapis incliné 35 min
type: salle
# commentaire ignoré
Chauffe | 5:00 | 4 → 5,5 km/h | 0 % | monter progressivement
x5 {
  Marche | 4:00 | 5,5 km/h | 7 %
  Montée | 1:00 | 5,5 km/h | 9 %
}
Retour au calme | 5:00 | -0,5 km/h / 30 s | 0 % | finir à 3 km/h environ
```

- En-tête optionnel : `titre: …` (défaut « Séance »), `type: salle | maison` (défaut `salle`).
- Une étape par ligne : `Nom | quantité | info 1 | info 2 | note` (seuls nom et quantité obligatoires).
- **Quantité chronométrée** : `4:00`, `45s`, `5` ou `5 min` (minutes). Virgule décimale acceptée.
- **Quantité en répétitions** : `10 rép`, `12 rép par bras`, `max`. Forme courte `10x` (ou `10 x`,
  `10X`, `12x par bras`), équivalente à `10 rép` ; affichée et recopiée dans le journal en `10 rép`.
  L'étape attend « Fait ✓ » (durée estimée 40 s pour les calculs).
- **Infos** : texte libre, libellé déduit : `km/h` → Vitesse, `%` → Pente (+ visuel de rampe),
  `kg` → Charge, `rpm` / `tr/min` → Cadence, `W` → Puissance, `niv…` → Niveau, sinon Consigne.
- **Progression** : `A → B unité` dans une info = l'app guide palier par palier (voir MVP).
  C'est la seule forme à utiliser pour une montée ou une descente de vitesse / pente ; une consigne
  du type `−0,5 km/h / 30 s` reste acceptée mais n'est qu'affichée.
- **Répétition de bloc** : `x3 {` (ou `3x {`) … `}` ; imbrication possible.
- Aucun caractère spécial pour les répétitions : la lettre `x` uniquement (pas de `×`, décision du 01/11).
- Lignes vides et lignes commençant par `#` ignorées.
- Les étapes nommées `Repos…` / `Récup…` sont exclues du contenu de la ligne de journal.

### Robustesse du collage (à gérer par le parseur)

Le texte vient d'un copier-coller depuis l'app Claude, il faut tolérer :
- les lignes de séparation `---` et les clôtures de bloc de code ` ``` ` (ignorées) ;
- le signe moins Unicode `−` (U+2212), le tiret `–`, les espaces insécables, `→` ou `->` ;
- l'indentation (espaces, tabulations) dans les blocs `x5 { … }`.

Exemples réels de séances : dossier `examples/` (utilisés comme fixtures de tests).

### Ligne de journal produite

```
31/10/2026 | salle | 35 min | Tapis incliné 35 min : Chauffe 5 min (4 → 5,5 km/h, 0 %) ; Marche 5x4 min (5,5 km/h, 7 %) ; … | 72/118/134 | ressenti 6/10 | – | – | salle chaude
```

Format du journal tenu par Claude (en-tête du journal) :
`jj/mm/aaaa | type | durée | contenu et perfs | FC min/moy/max | ressenti x/10 | poids | tour de taille | remarque`

Donc côté app : `date | type | durée réelle | titre [(arrêtée avant la fin)] : contenu réalisé | FC min/moy/max
(ou « FC non reçue ») | ressenti N/10 | poids | tour de taille | commentaire`.
**Poids** et **tour de taille** valent `–` si non saisis (le journal en contient presque toujours `–`).
Le nombre et l'ordre des 9 colonnes ne doivent jamais changer.

Observations sur le journal réel (Claude enrichit la ligne a posteriori) :
- La colonne remarque contient aussi des données de la montre (distance, kcal, effet d'entraînement),
  l'hydratation, la température de la salle…
- Claude y note des analyses FC : **dérive cardiaque** à charge constante (« ~128→142 ») et
  **récupération** (« 144→112 en 5 min, 90 peu après »). L'app peut les calculer elle-même.
- Le journal contient aussi des séances hors app (marche, extérieur) : la ligne de l'app n'est qu'un
  type d'entrée parmi d'autres.

Contenu réalisé, regroupé (repos exclus). Pour l'exemple maison :
`Échauffement 3 min ; Corde douce 1 min (rythme facile) ; Pompes 3x10 rép ; Planche 3x30 s ;
Planche latérale gauche 3x20 s ; Planche latérale droite 3x20 s ; Dead bug 3x8 rép par côté ;
Corde 6x30 s ; Étirements 4 min`
- Pas de caractère spécial `×` : nombre de passages écrit avec la lettre `x` (`3x10 rép`, `Corde x2`)
  (décision du 01/11 ; avant v26.11.01, l'app écrivait `3×10 rép`).
- Étapes en répétitions : l'objectif est recopié (`3x8 rép par côté`). Si je n'ai pas fait toutes
  les répétitions, je le dis dans le commentaire.
- Le contenu ne compte que ce qui a été **réellement fait**. Les écarts au programme sont ajoutés
  à la fin du contenu, en segments fixes (dans cet ordre, seulement s'ils existent) :
  - `sauté : …` — étape quittée avec « Suiv. » sans l'avoir faite : étape chronométrée quittée avant
    20 % de sa durée, ou étape en répétitions passée par « Suiv. » au lieu de « Fait ».
  - `écourté : …` — étape chronométrée quittée avec « Suiv. » entre 20 % et 90 % de sa durée ;
    on indique le temps fait sur le temps prévu.
  - `non fait (arrêt) : …` — étapes jamais atteintes parce que j'ai touché « Terminer la séance ».
  - Les repos sautés ou écourtés ne sont pas signalés (sans intérêt pour l'analyse).
  - Chaque étape est repérée par son tour quand elle est dans un bloc répété.
  Ex. : `… ; Corde 5x30 s ; Étirements 4 min ; sauté : Corde (tour 3, 2e) ; écourté : Planche (tour 3)
  0:18/0:30 ; non fait (arrêt) : –`

### Consignes « journal » à donner à Claude

L'app **n'ajoute aucune colonne** : les 9 colonnes du journal restent identiques. Toute nouvelle donnée
calculée par l'app va dans la colonne `remarque`, sous forme de segments fixes séparés par ` ; `.
Si le format évolue, ce bloc doit être mis à jour **et** redonné à Claude.

```
Journal d'entraînement — format (9 colonnes, séparateur « | », ne jamais changer l'ordre) :
jj/mm/aaaa | type | durée | contenu et perfs | FC min/moy/max | ressenti x/10 | poids | tour de taille | remarque

Lignes venant de l'app FitPacer :
- type : salle ou maison
- contenu : « titre : étapes réalisées », suivi de « (arrêtée avant la fin) » si la séance a été interrompue,
  puis éventuellement les écarts au programme : « sauté : … », « écourté : … (fait/prévu) »,
  « non fait (arrêt) : … » (étapes repérées par leur tour, ex. « Corde (tour 3, 2e) »)
- FC : min/moy/max en bpm, ou « FC non reçue »
- poids : « 82,4 kg » ou « – » ; tour de taille : « 94 cm » ou « – »
- remarque : mon commentaire libre, puis éventuellement ces segments calculés par l'app, dans cet ordre :
    « montre non connectée : pas de FC (ni dérive ni récupération) »  ou
    « FC partielle : reçue <durée> sur <durée> (montre déconnectée) »  — la FC est alors absente ou incomplète
    « dérive FC <étape> ~<FC début>→<FC fin> »   (une par étape concernée)
    « récup FC <FC fin d'effort>→<FC à 1 min> en 1 min, <FC finale> en <n> min »
  Les segments sont séparés par « ; ». « – » si rien.
Conserve ces lignes telles quelles ; tu peux compléter la remarque avec les données de la montre
(distance, kcal, effet d'entraînement…) en les ajoutant à la fin, après « ; ».
```

## Export du résultat (MVP)

Je lance **toujours** un exercice sur ma Suunto pendant la séance : la montre produit son propre
`.fit` (FC, calories, effet d'entraînement…). L'app **ne génère donc pas de .fit** ; elle produit un
fichier texte que je donne à Claude avec le `.fit` Suunto, pour qu'il fasse la correspondance.

Écran Bilan, trois actions :
- **Copier la ligne** (existant) : la ligne de journal seule.
- **Partager** : Web Share API avec fichier (→ directement l'app Claude sur Android).
- **Télécharger** : repli si le partage de fichier n'est pas disponible.

Fichier Markdown `fitpacer-AAAA-MM-JJ-HHMM-<titre-court>.md` (si le partage refuse `text/markdown`,
même contenu en `.txt` / `text/plain`). Contenu :

```
# FitPacer — <titre> — 31/10/2026 11:02

## Ligne de journal
<la ligne de journal, identique au bouton Copier>

## Séance
- Début : 2026-10-31 11:02:14 (heure locale, UTC+1) — Fin : 11:37:40 — Durée : 35:26
- Type : salle — Plafond FC : 150 — Montre : Suunto Watch HR 1211 (ou « FC non reçue »)
- Ressenti : 8/10 — Poids : – — Tour de taille : –
- Commentaire : …

## Étapes
| # | Tour | Étape | Prévu | Consignes | Début | Fin | Durée | Statut | FC moy | FC max |
|---|------|-------|-------|-----------|-------|-----|-------|--------|--------|--------|
| 1 | | Chauffe | 5:00 | 4 → 5,5 km/h, 0 % | 11:02:14 | 11:07:14 | 5:00 | fait | 92 | 104 |
| … |
Statut : fait / sauté / écourté / non fait (arrêt) ; pauses indiquées en ligne « pause » avec début/fin.

## Fréquence cardiaque (toutes les 5 s)
heure,fc,etape
11:02:15,79,1
…

## Programme collé
<le texte d'origine, tel quel>
```

- Les **heures absolues** (début/fin de chaque étape et des pauses) sont la clé pour aligner avec
  le `.fit` Suunto.
- Rien n'est stocké : le fichier est construit à la volée au moment du partage/téléchargement.

## Questions ouvertes

- Garder le dernier texte collé et le plafond FC en `localStorage` (comme le prototype) : oui par défaut.
- ~~URL de déploiement~~ : décidé le 31/10 — stable `agambier.github.io/fitpacer/` (`main`),
  développement `agambier.github.io/fitpacer/dev/` (branche de travail `ccr-*`).

## Idées pour plus tard

- Montre mémorisée (liste Bluetooth filtrée sur la dernière montre) : essayée puis retirée le 31/10,
  le gain était nul (il fallait quand même la resélectionner dans la liste).

- Boutons − / + pour saisir les répétitions réellement faites (reporté, décision du 31/10).
- Export JSON du résultat : non retenu pour l'instant (31/10) — le Markdown est le plus pratique pour
  Claude (tableaux + bloc CSV de FC). À reconsidérer si un programme doit relire les séances.
- Export `.fit` par l'app (inutile tant que la Suunto enregistre chaque séance).

- Historique local des séances et export.
- Bibliothèque de séances favorites.
- Zones FC personnalisées au lieu d'un simple plafond.
- Partage direct vers l'app Claude (Web Share API).

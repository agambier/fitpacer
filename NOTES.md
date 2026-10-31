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

- [ ] Écran **Programme** : zone de texte, Coller / Effacer, aide sur le format, erreurs de lecture
      ligne par ligne, plafond FC, aperçu des étapes, durée estimée, « Démarrer ».
- [ ] Écran **Séance** : nom + n° de répétition (2/5), paramètres (vitesse, pente…), note, gros chrono
      (orange sur les 10 dernières s), mode répétitions avec bouton « Fait ✓ », visuel de pente,
      « Ensuite », barre de segments, temps écoulé / restant, courbe FC, Préc. / Pause / Suiv.,
      « Terminer la séance ».
- [ ] Écran **Bilan** : stats, courbe, tableau FC par étape, RPE, commentaire, ligne de journal, « Copier ».
- [ ] **FC Bluetooth** : connexion, affichage couleur (calme / proche du plafond / au-dessus / périmée),
      reconnexion automatique.
- [ ] **Retours** : bips (3-2-1, changement d'étape, fin, alerte FC), vibrations, écran maintenu allumé.
- [ ] **Annonce vocale** de chaque nouvelle étape (`speechSynthesis`, voix française), activable /
      désactivable (bouton dans l'en-tête, choix mémorisé). L'annonce dépend du type d'étape :
  - **Étape chronométrée** (`4:00`, `45s`…) : nom + durée + infos.
    Ex. « Montée, 1 minute, 5,5 kilomètres heure, pente 9 pour cent. »
    Le chrono passe tout seul à l'étape suivante, avec les bips 3-2-1.
  - **Étape en répétitions** (`10 rép`, `max`…) : nom + nombre + rappel du bouton.
    Ex. « Pompes, 10 répétitions. Touchez Fait quand c'est terminé. »
    Pas de compte à rebours : l'étape attend que je touche **« Fait ✓ »** (gros bouton vert) avant de
    passer à la suite (le temps passé est affiché, « En cours depuis 0:35 »).
  - Annoncer aussi la note de l'étape si elle existe (« monter progressivement »).
  - Annonce de fin de séance ; alerte FC parlée (« Fréquence cardiaque au-dessus de 150 ») en plus du bip.
  - Les bips restent : la voix vient après le bip de changement d'étape, sans le remplacer.
  - Lecture des unités en toutes lettres (`km/h` → « kilomètres heure », `%` → « pour cent »,
    `→` → « à », `4:00` → « 4 minutes », `45s` → « 45 secondes »).
- [ ] **Progressions guidées** (étapes chronométrées uniquement) : une info de la forme
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
- [ ] **Poids et tour de taille** : deux champs optionnels sur l'écran Bilan (`kg`, `cm`, clavier
      numérique, virgule acceptée). Remplissent les colonnes 7 et 8 de la ligne de journal
      (`82,4 kg`, `94 cm`), sinon `–`. Rien n'est mémorisé d'une séance à l'autre.
- [ ] **Analyses FC automatiques**, ajoutées en fin de colonne remarque (après mon commentaire,
      séparées par ` ; `), uniquement si les données FC le permettent :
  - **Dérive cardiaque** : pour chaque étape (même nom + mêmes infos) répétée au moins 2 fois, ou
    chronométrée d'au moins 8 min, comparer la FC moyenne du premier passage à celle du dernier
    (en ignorant les 60 premières secondes de chaque passage, temps de montée de la FC).
    Ne l'écrire que si l'écart est d'au moins 5 bpm. Ex. « dérive FC Marche ~128→142 ».
  - **Récupération** : FC à la fin de la dernière étape d'effort (moyenne des 10 dernières s avant
    l'étape de retour au calme ou la fin de séance), puis FC 1 min après et FC en fin de séance.
    Ex. « récup FC 144→121 en 1 min, 112 en 5 min ».
    Étape « retour au calme » reconnue par son nom (`Retour au calme`, `Récup…`, `Étirements`…) ;
    à défaut, la dernière étape.
  - Seuils et règles regroupés dans un module pur et testé (`journal/`).
- [ ] **PWA** : manifest, icônes, installable, hors ligne, polices locales.

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
- **Quantité en répétitions** : `10 rép`, `12 rép par bras`, `max`. L'étape attend « Fait ✓ »
  (durée estimée 40 s pour les calculs).
- **Infos** : texte libre, libellé déduit : `km/h` → Vitesse, `%` → Pente (+ visuel de rampe),
  `kg` → Charge, `rpm` / `tr/min` → Cadence, `W` → Puissance, `niv…` → Niveau, sinon Consigne.
- **Progression** : `A → B unité` dans une info = l'app guide palier par palier (voir MVP).
  C'est la seule forme à utiliser pour une montée ou une descente de vitesse / pente ; une consigne
  du type `−0,5 km/h / 30 s` reste acceptée mais n'est qu'affichée.
- **Répétition de bloc** : `x3 {` (ou `3x {`) … `}` ; imbrication possible.
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
31/10/2026 | salle | 35 min | Tapis incliné 35 min : Chauffe 5 min (4 → 5,5 km/h, 0 %) ; Marche 5×4 min (5,5 km/h, 7 %) ; … | 72/118/134 | ressenti 6/10 | – | – | salle chaude
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

### Consignes « journal » à donner à Claude

L'app **n'ajoute aucune colonne** : les 9 colonnes du journal restent identiques. Toute nouvelle donnée
calculée par l'app va dans la colonne `remarque`, sous forme de segments fixes séparés par ` ; `.
Si le format évolue, ce bloc doit être mis à jour **et** redonné à Claude.

```
Journal d'entraînement — format (9 colonnes, séparateur « | », ne jamais changer l'ordre) :
jj/mm/aaaa | type | durée | contenu et perfs | FC min/moy/max | ressenti x/10 | poids | tour de taille | remarque

Lignes venant de l'app FitPacer :
- type : salle ou maison
- contenu : « titre : étapes réalisées », suivi de « (arrêtée avant la fin) » si la séance a été interrompue
- FC : min/moy/max en bpm, ou « FC non reçue »
- poids : « 82,4 kg » ou « – » ; tour de taille : « 94 cm » ou « – »
- remarque : mon commentaire libre, puis éventuellement ces segments calculés par l'app, dans cet ordre :
    « dérive FC <étape> ~<FC début>→<FC fin> »   (une par étape concernée)
    « récup FC <FC fin d'effort>→<FC à 1 min> en 1 min, <FC finale> en <n> min »
  Les segments sont séparés par « ; ». « – » si rien.
Conserve ces lignes telles quelles ; tu peux compléter la remarque avec les données de la montre
(distance, kcal, effet d'entraînement…) en les ajoutant à la fin, après « ; ».
```

## Questions ouvertes

- Faut-il un « prompt système » à donner à Claude pour qu'il génère toujours ce format ? → on pourrait
  l'afficher dans l'app (bouton « Copier les consignes pour Claude »).
- Garder le dernier texte collé et le plafond FC en `localStorage` (comme le prototype) : oui par défaut.
- Nom de domaine / URL de déploiement (GitHub Pages `agambier.github.io/fitpacer` ?).

## Idées pour plus tard

- Historique local des séances et export.
- Bibliothèque de séances favorites.
- Zones FC personnalisées au lieu d'un simple plafond.
- Partage direct vers l'app Claude (Web Share API).

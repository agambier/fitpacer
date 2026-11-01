// "Consignes pour l'IA": the text the user pastes into the instructions of their AI assistant (Claude project, custom GPT…).
// Single source of truth for the workout format and the journal format.

export const FORMAT_VERSION = "v1";

export const EXAMPLE_TREADMILL = `titre: Tapis incliné 35 min
type: salle
fc max: 150
Chauffe | 5:00 | 4 → 5,5 km/h | 0 % | monter progressivement
x5 {
  Marche | 4:00 | 5,5 km/h | 7 % | FC 120-135
  Montée | 1:00 | 5,5 km/h | 9 %
}
Retour au calme | 5:00 | 5,5 → 3 km/h par 1 en 3:00 | 0 %`;

export const EXAMPLE_HOME = `titre: Maison pompes, gainage, corde
type: maison
fc max: 150
Échauffement | 3:00 | | | rotations d’épaules, montées de genoux sur place
x3 {
  Pompes | x10 | | | garder 2-3 rép en réserve
  Repos | 1:30
  Planche | 30s | | | respirer normalement
  Repos | 30s
  Dead bug | x8 par côté | | | bas du dos plaqué au sol
  Repos | 45s
}
Étirements | 4:00 | | | pectoraux, épaules, mollets`;

// Journal lines produced by the app for the two examples above (kept in sync by tests/instructions.test.ts).
export const EXAMPLE_JOURNAL_TREADMILL =
  "31/10/2026 | salle | 35 min | Tapis incliné 35 min : Chauffe 5 min (4 → 5,5 km/h, 0 %) ; Marche 5x4 min (5,5 km/h, 7 %) ; Montée 5x1 min (5,5 km/h, 9 %) ; Retour au calme 5 min (5,5 → 3 km/h par 1 en 3:00, 0 %) ; pause ajoutée par l'utilisateur : Marche (tour 2) 1 min 20 (FC 128→112) | 95/127/140 | ressenti 7/10 | 82,4 kg | – | salle chaude ; dérive FC Marche ~124→138 ; récup FC 140→133 en 1 min, 107 en 5 min ; plage FC Marche 120-135 : 79 %";

export const EXAMPLE_JOURNAL_HOME =
  "31/10/2026 | maison | 19 min | Maison pompes, gainage, corde : Échauffement 3 min ; Pompes 3x10 rép ; Planche 2x30 s ; Dead bug 2x8 rép par côté ; Étirements 4 min ; sauté : Dead bug (tour 3) ; écourté : Planche (tour 2) 0:18/0:30 | FC non reçue | ressenti 6/10 | – | – | montre non connectée : pas de FC (ni dérive ni récupération)";

export const JOURNAL_RULES = `Journal d'entraînement — format (9 colonnes, séparateur « | », ne jamais changer l'ordre) :
jj/mm/aaaa | type | durée | contenu et perfs | FC min/moy/max | ressenti x/10 | poids | tour de taille | remarque

Lignes venant de l'app FitPacer :
- type : salle ou maison
- durée : temps d'effort réel, sans les pauses que j'ai ajoutées (le temps de ces pauses est indiqué dans le contenu)
- contenu : « titre : étapes réalisées » (passages comptés avec la lettre x : « Pompes 3x10 rép »), suivi de « (arrêtée avant la fin) » si la séance a été interrompue,
  puis éventuellement les écarts au programme : « sauté : … », « écourté : … (fait/prévu) »,
  « non fait (arrêt) : … » (étapes repérées par leur tour, ex. « Corde (tour 3, 2e) »),
  « pause ajoutée par l'utilisateur : Marche (tour 2) 1 min 20 (FC 142→118) » ou « pauses ajoutées par
  l'utilisateur : 2 (…), total 3 min 10 » : pauses de 10 s ou plus que j'ai prises en plus du programme,
  avec l'étape en cours et, si la montre est connectée, la FC au début et à la fin de la pause (« ? » si
  non reçue) : indice de ma récupération pendant ces pauses non prévues
- FC : min/moy/max en bpm, ou « FC non reçue »
- poids : « 82,4 kg » ou « – » ; tour de taille : « 94 cm » ou « – »
- remarque : mon commentaire libre, puis éventuellement ces segments calculés par l'app, dans cet ordre :
    « montre non connectée : pas de FC (ni dérive ni récupération) »  ou
    « FC partielle : reçue <durée> sur <durée> (montre déconnectée) »  — la FC est alors absente ou incomplète
    « dérive FC <étape> ~<FC début>→<FC fin> »   (une par étape concernée)
    « récup FC <FC fin d'effort>→<FC à 1 min> en 1 min, <FC finale> en <n> min »
    « plage FC <étape> <min>-<max> : <n> % »   (part du temps passé dans la plage prévue, tours regroupés ;
                                               une par étape avec plage)
  Les segments sont séparés par « ; ». « – » si rien.

Exemples de lignes produites par l'app (une ligne par séance) :
- séance tapis avec la montre, une pause ajoutée pendant le 2e tour :
${EXAMPLE_JOURNAL_TREADMILL}
- séance maison sans la montre, un Dead bug sauté et une Planche écourtée :
${EXAMPLE_JOURNAL_HOME}

Conserve ces lignes telles quelles ; tu peux compléter la remarque avec les données de la montre
(distance, kcal, effet d'entraînement…) en les ajoutant à la fin, après « ; ».`;

// Short session used to show Claude the file exported at the end of a session.
export const EXAMPLE_SHORT = `titre: Tapis court
type: salle
fc max: 150
Chauffe | 3:00 | 4 → 5 km/h | 0 %
x2 {
  Marche | 2:00 | 5,5 km/h | 7 % | FC 120-135
  Montée | 1:00 | 5,5 km/h | 9 %
}
Retour au calme | 3:00 | 5 → 3 km/h | 0 %`;

// Export of EXAMPLE_SHORT as produced by the app, HR samples shortened ("…").
// Kept in sync by tests/instructions.test.ts.
export const EXAMPLE_EXPORT = [
  "# FitPacer — Tapis court — 31/10/2026 11:02",
  "",
  "## Ligne de journal",
  "",
  "31/10/2026 | salle | 11 min | Tapis court : Chauffe 3 min (4 → 5 km/h, 0 %) ; Marche 2x2 min (5,5 km/h, 7 %) ; Montée 1 min (5,5 km/h, 9 %) ; Retour au calme 3 min (5 → 3 km/h, 0 %) ; écourté : Montée (tour 2) 0:40/1:00 ; pause ajoutée par l'utilisateur : Marche (tour 1) 50 s (FC 125→118) | 92/122/138 | ressenti 7/10 | – | – | jambes lourdes ; dérive FC Marche ~126→135 ; récup FC 138→126 en 1 min, 103 en 3 min ; plage FC Marche 120-135 : 95 %",
  "",
  "## Séance",
  "",
  "- Début : 2026-10-31 11:02:14 (heure locale, UTC+1) — Fin : 11:14:44 — Durée active : 11:40 — Durée totale (pauses incluses) : 12:30",
  "- Type : salle — FC max de la séance : 150 — Capteur FC : Suunto Race — FC min/moy/max : 92/122/138",
  "- Ressenti : 7/10 (Dur) — Poids : – — Tour de taille : –",
  "- Commentaire : jambes lourdes",
  "- Arrêtée avant la fin : non",
  "- Pauses ajoutées par l'utilisateur (bouton Pause, au moins 10 s, hors repos du programme) : 1, total 50 s (non comptées dans la durée active)",
  "",
  "## Étapes",
  "",
  "Heures locales. Statut : fait / écourté / sauté / arrêt (étape en cours quand la séance a été terminée). Les étapes jamais atteintes sont listées à la fin.",
  "",
  "| # | Tour | Étape | Prévu | Consignes | Début | Fin | Durée | Statut | FC moy | FC max | Plage FC (% du temps dedans) |",
  "|---|------|-------|-------|-----------|-------|-----|-------|--------|--------|--------|------------------------------|",
  "| 1 |  | Chauffe | 3:00 | 4 → 5 km/h, 0 % | 11:02:14 | 11:05:14 | 3:00 | fait | 107 | 122 |  |",
  "| 2 | 1/2 | Marche | 2:00 | 5,5 km/h, 7 % | 11:05:14 | 11:08:04 | 2:00 | fait | 125 | 128 | 120-135 (100 %) |",
  "| | | *pause ajoutée par l'utilisateur* | | FC 125→118 | 11:06:14 | 11:07:04 | 0:50 | pause | | | |",
  "| 3 | 1/2 | Montée | 1:00 | 5,5 km/h, 9 % | 11:08:04 | 11:09:04 | 1:00 | fait | 129 | 130 |  |",
  "| 4 | 2/2 | Marche | 2:00 | 5,5 km/h, 7 % | 11:09:04 | 11:11:04 | 2:00 | fait | 133 | 136 | 120-135 (89 %) |",
  "| 5 | 2/2 | Montée | 1:00 | 5,5 km/h, 9 % | 11:11:04 | 11:11:44 | 0:40 | écourté | 137 | 138 |  |",
  "| 6 |  | Retour au calme | 3:00 | 5 → 3 km/h, 0 % | 11:11:44 | 11:14:44 | 3:00 | fait | 120 | 138 |  |",
  "",
  "## FC par exercice",
  "",
  "| Exercice | FC moy | FC max |",
  "|---|---|---|",
  "| Chauffe (4 → 5 km/h, 0 %) | 107 | 122 |",
  "| Marche (5,5 km/h, 7 %) | 129 | 136 |",
  "| Montée (5,5 km/h, 9 %) | 132 | 138 |",
  "| Retour au calme (5 → 3 km/h, 0 %) | 120 | 138 |",
  "",
  "## Analyses FC",
  "",
  "- dérive FC Marche ~126→135",
  "- récup FC 138→126 en 1 min, 103 en 3 min",
  "- plage FC Marche 120-135 : 95 %",
  "",
  "## Fréquence cardiaque (toutes les 5 s)",
  "",
  "```csv",
  "heure,fc,etape",
  "11:02:14,92,1",
  "11:02:19,93,1",
  "11:02:24,94,1",
  "…",
  "11:14:34,104,6",
  "11:14:39,103,6",
  "```",
  "",
  "## Programme collé",
  "",
  "```",
  "titre: Tapis court",
  "type: salle",
  "fc max: 150",
  "Chauffe | 3:00 | 4 → 5 km/h | 0 %",
  "x2 {",
  "  Marche | 2:00 | 5,5 km/h | 7 % | FC 120-135",
  "  Montée | 1:00 | 5,5 km/h | 9 %",
  "}",
  "Retour au calme | 3:00 | 5 → 3 km/h | 0 %",
  "```",
].join("\n");

export const EXPORT_RULES = `Je peux aussi te donner le fichier « fitpacer-….md » que l'app me fait télécharger en fin de
séance. Il commence par la ligne de journal, puis détaille la séance :
- Séance : heures de début et de fin, durée active (sans mes pauses) et totale, FC max de la séance,
  capteur FC, ressenti, commentaire, pauses que j'ai ajoutées ;
- Étapes : une ligne par étape dans l'ordre où je les ai faites (tour, prévu, consignes, heures de début et
  de fin, durée réelle, statut fait / écourté / sauté / arrêt, FC moyenne et max, plage FC prévue et
  part du temps passé dedans), avec mes pauses ajoutées (FC au début et à la fin de la pause) ;
- FC par exercice (tous les tours regroupés), puis les analyses FC (dérive, récupération, plages) ;
- FC toutes les 5 s (heure, FC, numéro de l'étape dans le tableau) et le programme collé.
Sers-t'en pour voir comment s'est passé chaque exercice (FC qui monte d'un tour à l'autre, étape écourtée
ou sautée, pause prise à un moment précis) et pour adapter la séance suivante. Si je te donne aussi le
fichier .fit de ma montre Suunto, aligne-les grâce aux heures de début et de fin de chaque étape.

Exemple de fichier (relevé de FC raccourci : « … ») :
~~~markdown
${EXAMPLE_EXPORT}
~~~`;

export function claudeInstructions(): string {
  return `# Consignes FitPacer pour l'IA (Format FitPacer ${FORMAT_VERSION})

J'utilise l'app FitPacer pour mes séances à la maison et en salle. C'est toi qui me proposes la
séance, adaptée à mon journal d'entraînement, puis tu m'en donnes la description au format
FitPacer ci-dessous. Je la copie et la colle dans l'app, qui me guide (chrono, voix, bips, FC).

## Format de séance FitPacer ${FORMAT_VERSION}

Donne la séance dans un seul bloc de texte, sans autre contenu dedans.

En-tête :
titre: <titre court>
type: salle   (ou maison)
fc max: <FC max de la séance, en bpm>

Puis une étape par ligne :
Nom | quantité | info 1 | info 2 | note

- Seuls le nom et la quantité sont obligatoires. Laisse une case vide si besoin : « Planche | 30s | | | respirer ».
- Quantité chronométrée : 4:00, 45s, 5 (minutes). L'app enchaîne seule à la fin du chrono.
- Quantité en répétitions : x10, x12 par bras, x8 par côté, max. L'app attend que je
  touche « Fait » : n'utilise les répétitions que pour un exercice qui se compte (pompes, squats…).
- Infos : vitesse (5,5 km/h), pente (7 %), charge (6 kg), niveau (niv 8), puissance (120 W),
  cadence (85 rpm) ou une consigne courte (rythme facile).
- Progression : écris « départ → arrivée unité » (ex. 4 → 5,5 km/h, 5,5 → 3 km/h, 2 → 6 %,
  6:00 → 5:30 min/km). L'app la découpe en paliers réguliers sur la durée de l'étape (0,5 km/h, 0,5 %,
  1 niveau, 10 W, 5 rpm, 0:10 min/km ; écart agrandi si besoin pour que chaque palier dure au
  moins 20 s) et m'annonce chaque palier. Deux options, facultatives :
  « par 1 » fixe l'écart entre deux paliers (3 → 5 km/h par 1 : 3, 4, 5), obligatoire pour une autre
  unité (10 → 20 kg par 2,5) ; « en 3:00 » fait la progression sur 3 min seulement : la valeur
  d'arrivée est atteinte au bout de 3 min, puis gardée jusqu'à la fin de l'étape
  (Chauffe | 5:00 | 3 → 5 km/h par 1 en 2:00 : 3 km/h, 4 km/h à 1:00, 5 km/h de 2:00 à la fin).
  N'écris pas de consigne du type « −0,5 km/h / 30 s ».
- Repos : une étape nommée « Repos » avec une durée (Repos | 1:30). L'app annonce l'exercice suivant.
- Répétition d'un bloc : « x3 { » (ou « 3x { ») sur une ligne, les étapes, puis « } » sur une ligne.
- FC max (obligatoire) : « fc max: 155 » dans l'en-tête, choisie selon mon profil et le but de la
  séance. Au-dessus, l'app donne l'alerte (bandeau rouge, bips, voix) pendant toute la séance, quelle que
  soit la plage de l'étape. Je ne peux pas la modifier dans l'app : sans elle, aucune alerte.
- Plage de FC d'une étape (facultative) : ajoute une case « FC 120-145 » après la quantité, en général
  après les infos (Marche rapide | 10:00 | 6 km/h | 3 % | FC 120-145 | respirer par le nez). L'app
  affiche la plage, me dit si je suis dedans et me le rappelle à voix haute (« accélérez » / « ralentissez »)
  si j'en sors plus de 15 s. Une plage dont le haut dépasse la FC max relève la FC max de la séance à
  cette valeur : garde le haut des plages sous la FC max.
- Note : courte, utile pendant l'effort (technique, respiration). Elle est lue à voix haute.
- Termine toujours par un retour au calme ou des étirements chronométrés (au moins 3 min) :
  l'app s'en sert pour mesurer ma récupération cardiaque.
- Une ligne qui commence par # est un commentaire ignoré.

Exemple tapis :
${EXAMPLE_TREADMILL}

Exemple maison :
${EXAMPLE_HOME}

## Après la séance

${JOURNAL_RULES}

## Fichier exporté en fin de séance

${EXPORT_RULES}
`;
}

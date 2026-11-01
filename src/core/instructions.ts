// "Consignes pour Claude": the text the user pastes into the Claude project instructions.
// Single source of truth for the workout format and the journal format.

export const FORMAT_VERSION = "v1";

export const EXAMPLE_TREADMILL = `titre: Tapis incliné 35 min
type: salle
Chauffe | 5:00 | 4 → 5,5 km/h | 0 % | monter progressivement
x5 {
  Marche | 4:00 | 5,5 km/h | 7 %
  Montée | 1:00 | 5,5 km/h | 9 %
}
Retour au calme | 5:00 | 5,5 → 3 km/h | 0 %`;

export const EXAMPLE_HOME = `titre: Maison pompes, gainage, corde
type: maison
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

export const JOURNAL_RULES = `Journal d'entraînement — format (9 colonnes, séparateur « | », ne jamais changer l'ordre) :
jj/mm/aaaa | type | durée | contenu et perfs | FC min/moy/max | ressenti x/10 | poids | tour de taille | remarque

Lignes venant de l'app FitPacer :
- type : salle ou maison
- contenu : « titre : étapes réalisées » (passages comptés avec la lettre x : « Pompes 3x10 rép »), suivi de « (arrêtée avant la fin) » si la séance a été interrompue,
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

Je peux aussi te donner le fichier « fitpacer-….md » exporté par l'app avec le fichier .fit de ma
montre Suunto : aligne-les grâce aux heures de début et de fin de chaque étape.`;

export function claudeInstructions(): string {
  return `# Consignes FitPacer pour Claude (Format FitPacer ${FORMAT_VERSION})

J'utilise l'app FitPacer pour mes séances à la maison et en salle. C'est toi qui me proposes la
séance, adaptée à mon journal d'entraînement, puis tu m'en donnes la description au format
FitPacer ci-dessous. Je la copie et la colle dans l'app, qui me guide (chrono, voix, bips, FC).

## Format de séance FitPacer ${FORMAT_VERSION}

Donne la séance dans un seul bloc de texte, sans autre contenu dedans.

En-tête :
titre: <titre court>
type: salle   (ou maison)

Puis une étape par ligne :
Nom | quantité | info 1 | info 2 | note

- Seuls le nom et la quantité sont obligatoires. Laisse une case vide si besoin : « Planche | 30s | | | respirer ».
- Quantité chronométrée : 4:00, 45s, 5 (minutes). L'app enchaîne seule à la fin du chrono.
- Quantité en répétitions : x10, x12 par bras, x8 par côté, max. L'app attend que je
  touche « Fait » : n'utilise les répétitions que pour un exercice qui se compte (pompes, squats…).
- Infos : vitesse (5,5 km/h), pente (7 %), charge (6 kg), niveau (niv 8), puissance (120 W),
  cadence (85 rpm) ou une consigne courte (rythme facile).
- Progression : écris « départ → arrivée unité » (ex. 4 → 5,5 km/h, 5,5 → 3 km/h, 2 → 6 %).
  L'app la découpe en paliers réguliers sur la durée de l'étape (0,5 km/h, 0,5 %, 1 niveau,
  10 W, 5 rpm) et m'annonce chaque palier. N'écris pas de consigne du type « −0,5 km/h / 30 s ».
- Repos : une étape nommée « Repos » avec une durée (Repos | 1:30). L'app annonce l'exercice suivant.
- Répétition d'un bloc : « x3 { » (ou « 3x { ») sur une ligne, les étapes, puis « } » sur une ligne.
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
`;
}

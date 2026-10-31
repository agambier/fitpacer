# FitPacer — notes produit

## Le principe

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
- **Répétition de bloc** : `x3 {` (ou `3x {`) … `}` ; imbrication possible.
- Lignes vides et lignes commençant par `#` ignorées.
- Les étapes nommées `Repos…` / `Récup…` sont exclues du contenu de la ligne de journal.

### Ligne de journal produite

```
31/10/2026 | salle | 35 min | Tapis incliné 35 min : Chauffe 5 min (4 → 5,5 km/h, 0 %) ; Marche 5×4 min (5,5 km/h, 7 %) ; … | 72/118/134 | ressenti 6/10 | – | – | salle chaude
```

Champs : `date | type | durée réelle | titre [(arrêtée avant la fin)] : contenu réalisé | FC min/moy/max
(ou « FC non reçue ») | ressenti N/10 | – | – | commentaire`.

## Questions ouvertes

- À quoi correspondent les deux colonnes `–` de la ligne de journal ? (réservées par le format du journal
  côté Claude ? distance / calories ?)
- Faut-il un « prompt système » à donner à Claude pour qu'il génère toujours ce format ? → on pourrait
  l'afficher dans l'app (bouton « Copier les consignes pour Claude »).
- Garder le dernier texte collé et le plafond FC en `localStorage` (comme le prototype) : oui par défaut.
- Nom de domaine / URL de déploiement (GitHub Pages `agambier.github.io/fitpacer` ?).

## Idées pour plus tard

- Historique local des séances et export.
- Bibliothèque de séances favorites.
- Zones FC personnalisées au lieu d'un simple plafond.
- Partage direct vers l'app Claude (Web Share API).

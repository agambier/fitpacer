# Journal des versions

Format `vAA.MM.XX` (voir `CLAUDE.md`). Seules les versions stables figurent ici : chaque section sert
de texte à la release GitHub créée automatiquement.

## v26.11.03

**Avant la séance**
- Objectif de la séance (`objectif: …`) affiché sous le titre.
- Encadré « Avant de commencer » : sport à lancer sur la montre (`montre: Marche sur tapis (Treadmill walking)`, rappelé à voix haute au démarrage) et liste à cocher des conditions d’exécution (`avant: …`, une ligne par point, rien n’est enregistré).
- Ceinture cardio (`ceinture: recommandée`) : question Oui / Non dans l’encadré, ou au démarrage si elle n’a pas été répondue.

**Pendant la séance**
- Exercices en répétitions : la voix annonce l’exercice sans ajouter « Touchez Fait quand c’est terminé ».
- Le temps écoulé affiche aussi la part de la séance déjà faite (« 1:10 · 13 % »).

**Bilan**
- Courbe de FC 1,5× plus haute, avec 4 repères étiquetés : limite (fc max de la séance), max, moyenne, min.
- Décrochements brefs de la montre (aller-retour de plus de 25 bpm en quelques secondes) : point entouré sur la courbe, « ? » après la valeur concernée, explication sous la courbe.

**Rapport pour l’IA**
- FC min/moy/max calculées sans les décrochements ; segment « décrochement capteur FC ignoré : … » dans la remarque.
- Segment « ceinture cardio portée » / « sans ceinture cardio (recommandée) » quand la séance la recommande.
- Fichier exporté : lignes « Objectif » et « Sport sur la montre », ceinture cardio sur la ligne du capteur.

**Consignes pour l’IA**
- Nouvelles lignes d’en-tête `objectif:`, `montre:`, `avant:`, `ceinture:` expliquées, avec des exemples ; nouveaux segments de la remarque documentés. À redonner à l’IA.

## v26.11.02

**FC max et plages de FC**
- La FC max de la séance est écrite dans la séance par l’IA (`fc max: 155`) et ne se règle plus dans l’app (champ « Plafond de FC » supprimé, plus rien n’est gardé sur le téléphone). Absente : message « demandez à l’IA », pas d’alerte.
- Au-dessus de la FC max : bandeau rouge en plus des bips et de la voix, quelle que soit la plage de l’exercice.
- Plage de FC par exercice (`FC 120-145`, dans n’importe quelle case après la durée) : badge sur l’écran programme ; pendant l’exercice, jauge et état « Dans la plage » / « En dessous : accélérez » / « Au-dessus : ralentissez » (FC colorée en conséquence), « FC non reçue » en orange ; rappel vocal après 15 s hors plage, puis toutes les 30 s ; la plage est annoncée au début de l’exercice.
- Une plage qui dépasse la FC max relève la FC max de la séance (affiché sur l’écran programme).

**Séance**
- « Terminer la séance » devient un vrai bouton, toujours visible en bas de l’écran.

**Bilan**
- Ligne de journal : segment « plage FC <exercice> <min>-<max> : <n> % » (temps passé dans la plage).
- Fichier exporté : FC max de la séance, colonne « Plage FC (% du temps dedans) » dans le tableau des étapes, plages dans « Analyses FC ».

**Consignes pour l’IA** (anciennement « Consignes pour Claude »)
- Format `fc max:` et `FC 120-145` expliqués ; exemples de lignes de journal et exemple complet du fichier exporté (résumé, tableau des étapes…), produits par l’app et vérifiés par les tests.
- Les textes de l’app parlent de « l’IA » (Claude, ChatGPT…) au lieu de Claude ; fichier `fitpacer-consignes-ia.md`.

## v26.11.01

**Nouveautés à l’écran**
- Nouvelle icône : un cœur qui bat, traversé par un tracé de rythme cardiaque (aussi dans « À propos »).
- Fenêtre de bienvenue au premier lancement, et fenêtre « Quoi de neuf ? » après chaque mise à jour (une section par version si plusieurs ont été sautées ; aussi dans le menu ☰).
- Boutons en icônes : ouvrir un fichier, coller, effacer (programme) ; copier, partager, télécharger (bilan et consignes pour Claude).
- Les questions « Terminer la séance ? » et « Effacer la séance ? » s’affichent dans une fenêtre de l’app.

**Programme**
- Nouveau bouton pour ouvrir une séance depuis un fichier texte du téléphone (.txt, .md : e-mail, téléchargement, cloud).
- Répétitions : `x10` (forme de référence) ; `10x` et `10 rép` restent acceptés. Plus de caractère spécial `×`, nulle part.
- Progressions : option `par` pour l’écart entre paliers (`3 → 5 km/h par 1`, toute unité), option `en` pour atteindre la valeur d’arrivée avant la fin de l’étape (`3 → 5 km/h en 3:00`), allures `6:00 → 5:30 min/km`. Sans `par`, chaque palier dure au moins 20 s.

**Séance**
- Bips 5-4-3-2-1 en fin d’étape (au lieu de 3-2-1), et aussi avant chaque palier, dont le compte à rebours passe en orange à 10 s.
- Pendant un repos, la voix lit aussi ses consignes (et à la reprise après une pause) ; le bouton Pause y est désactivé.
- En pause : grand compteur « En pause depuis ».

**Bilan**
- Pauses ajoutées avec le bouton Pause (10 s ou plus) notées dans la ligne de journal et le fichier : étape, durée, total, et FC au début et à la fin si la montre est connectée.
- Ligne de journal : nombre de passages écrit avec la lettre x (`Pompes 3x10 rép`).
- Le bouton Partager ouvre bien le menu de partage d’Android (fichier .txt) ; le bouton Charger ne demande plus l’accès au micro.

## v26.10.04

**Barre de menu**
- Icône de l'app et version à gauche, badge « Développement » au milieu (version en développement), menu ☰ à droite.

**Menu**
- Nouveau sous-menu **Thème** : Sombre (par défaut) ou Clair (gris clairs). Le choix est gardé sur le téléphone ; sans choix, le réglage du système s'applique.
- « À propos » indique l'auteur : Alexandre Gambier, avec l'aide de l'IA.

## v26.10.03

**Versions**
- Deux pages : la version stable (https://agambier.github.io/fitpacer/) et la version en développement (https://agambier.github.io/fitpacer/dev/), installables côte à côte (« FitPacer » et « FitPacer DEV »).
- Badge « Développement » dans la barre de menu de la version en développement.
- Chaque version stable est publiée automatiquement avec son tag et sa release GitHub.

## v26.10.02

Première version stable de FitPacer, la PWA qui cadence les séances préparées par Claude.

**Séance**
- Collage du programme au format FitPacer v1 (tolère `---`, blocs de code, signe moins typographique), erreurs ligne par ligne.
- Étapes chronométrées (enchaînement automatique, bips 3-2-1) ou en répétitions (bouton « Fait ✓ »), repos, blocs `x3 { … }`.
- Progressions guidées `A → B` (vitesse, pente, niveau, puissance, cadence) découpées en paliers, annoncés.
- Annonces vocales (étape, repos + exercice suivant, paliers, alerte FC, reprise après pause), activables.
- Pause / reprise, précédent / suivant, écran maintenu allumé, vibrations.

**Montre**
- FC en Bluetooth (service Heart Rate standard), reconnexion automatique, alerte au-dessus du plafond.
- Question « Connecter la montre ? » au démarrage ; messages dédiés pour les navigateurs sans Bluetooth web (iPhone/iPad, Firefox, Brave sans l'option…), Bluetooth coupé ou bloqué.

**Bilan**
- Ressenti 1–10, commentaire, poids et tour de taille facultatifs.
- Ligne de journal 9 colonnes pour Claude : étapes faites, sautées, écourtées, non faites ; FC min/moy/max ; dérive et récupération cardiaques ; FC manquante signalée.
- Fichier Markdown horodaté (étapes, pauses, FC toutes les 5 s) à croiser avec le `.fit` de la montre : Copier / Partager / Télécharger.

**App**
- Menu ☰ : Aide (format, connexion de la montre, vie privée), Consignes pour Claude (Copier / Partager / Télécharger), À propos.
- Installable, fonctionne hors ligne, thème sombre, aucune donnée envoyée.

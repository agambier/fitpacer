# Journal des versions

Format `vAA.MM.XX` (voir `CLAUDE.md`). Seules les versions stables figurent ici : chaque section sert
de texte à la release GitHub créée automatiquement.

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

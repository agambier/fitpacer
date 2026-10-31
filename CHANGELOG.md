# Journal des versions

Format `vAA.MM.XX` (voir `CLAUDE.md`). Seules les versions stables figurent ici : chaque section sert
de texte à la release GitHub créée automatiquement.

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

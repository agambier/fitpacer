# FitPacer

FitPacer guides you during a workout session : PWA compagnon qui cadence une séance préparée par une IA (Claude, ChatGPT…)
(chrono, répétitions, progressions de vitesse/pente, voix, bips), affiche la FC de la montre en
Bluetooth et produit la ligne de journal + un fichier détaillé à redonner à l'IA.

- Specs produit : [`NOTES.md`](NOTES.md) — consignes de dev : [`CLAUDE.md`](CLAUDE.md)
- Exemples de séances : [`examples/`](examples)

```
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # dist/
```

- Version stable : https://agambier.github.io/fitpacer/
- Version en développement : https://agambier.github.io/fitpacer/dev/

Web Bluetooth : Chrome Android (ou Brave avec `brave://flags` → Web Bluetooth). HTTPS obligatoire.

# FitPacer

FitPacer guides you during a workout session : PWA compagnon qui cadence une séance préparée par Claude
(chrono, répétitions, progressions de vitesse/pente, voix, bips), affiche la FC de la montre en
Bluetooth et produit la ligne de journal + un fichier détaillé à redonner à Claude.

- Specs produit : [`NOTES.md`](NOTES.md) — consignes de dev : [`CLAUDE.md`](CLAUDE.md)
- Exemples de séances : [`examples/`](examples)

```
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # dist/
```

Web Bluetooth : Chrome Android (ou Brave avec `brave://flags` → Web Bluetooth). HTTPS obligatoire.

# WritingPad

Zone de tracé au doigt : une case carrée à repères en croix, comme la case de question, en plus grand.

- **Cadre** : contour `ink` 1,5 px, `radius-sm`, fond `paper-raised`, croix en pointillés `hairline`. 296 px de côté sur 360 px de large, jamais moins de 240 px.
- **Encre** : `ink`, 4,2 unités sur 109 (≈ 11 px), bouts ronds. Le modèle en filigrane (calque) est en `hairline`.
- **Retour par trait** : un trait validé se fixe (en calque, il prend la forme du modèle en 120 ms) ; un trait refusé passe en pointillés `error`, tremble une fois puis s'efface en 400 ms, avec la raison en clair sous la zone (« Sens inversé », « Trop haut », « Ce n'est pas encore ce trait »).
- **Indice** (après 2 erreurs sur un trait, ou à la demande) : point de départ plein `accent` et trajet en pointillés `accent`.
- **Outils**, sous la zone, à 52 px de haut : Effacer, Annuler, Indice, et l'action du niveau (Comparer, Terminé) avec contour.
- `touch-action: none` sur la zone, un seul doigt actif.

Vous fournissez le caractère, le mode (`trace` ou `free`), `validate`. Structure de `WritingPad.tsx` inchangée : canvas pour l'encre en cours, SVG dessous pour le reste.

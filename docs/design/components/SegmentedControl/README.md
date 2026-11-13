# SegmentedControl

Choix exclusif entre 2 à 4 options courtes, toutes visibles (`role="radiogroup"`).

- L'option active est un aplat `ink` avec texte `paper` : la sélection se lit par l'inversion, pas par une teinte.
- Chaque option fait 44 px de haut. Au-delà de 4 options ou de libellés longs, utilisez une liste à boutons radio.

Vous fournissez `label` (accessible), `options`, `value`, `onChange` — la signature du composant existant `SegmentedControl.tsx` ne change pas.

# Chip

Puce à cocher pour choisir des lignes de kana ou des listes.

- Cochée : aplat `accent`, texte `on-accent`, sans coche (l'aplat suffit ; `aria-pressed` annonce l'état, et la puce ne change pas de largeur). Partielle (une liste ne couvre qu'une partie de la ligne) : contour `accent` 2 px, fond `accent-tint`, compte « 3/5 ».
- 44 px de haut. Le kana de tête est en `Klee One Kana` 20 px, le romaji en petit.
- Chaque groupe (Gojūon, Dakuten…) a ses raccourcis « Tout » / « Aucun » en bouton texte.

Vous fournissez le kana de tête, le romaji, l'état.

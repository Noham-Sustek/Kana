# Choice

Bouton de réponse des questions à choix (grille 2 × 2, ou 2 × 4 avec `k-choices--8`).

- Le romaji est en `answer` (Newsreader), le kana en `Klee One Kana` (`k-jp`).
- **Juste** : contour `correct` 2 px, fond `correct-tint`, pastille à coche. **Faux** : contour `error`, texte barré, pastille à croix. **Révélée** : contour `ink`, pastille à œil. La couleur n'est jamais le seul signal.
- Après une erreur avec réessai, la réponse fausse reste marquée et n'est plus touchable ; les autres restent actives.
- Hauteur 62 px (52 px en grille de 8), écart 10 px.

Vous fournissez le libellé et l'état.

# KanaTile

La case de kana : carrée, `radius-sm`, kana en `kana-tile`. Elle sert à la grille, au parcours, aux sélecteurs et aux listes.

- **Base** : neutre, avec romaji (`k-tile--rom`), sélectionnée (`is-sel` : contour `accent`, fond `accent-tint`, coche).
- **Parcours** : acquise (aplat `accent`, coche), en cours (contour `accent`, remplissage `accent-tint` à hauteur de l'avancement via `--fill`), verrouillée (pointillés `hairline`, cadenas).
- **Lentille Lecture** : rampe d'une seule teinte, du clair au foncé — `heat-1`, `heat-2`, `heat-3`, `accent`. Jamais vu = case vide en pointillés. Le niveau le plus bas porte un coin plein en bas à gauche : « à revoir » se lit sans la couleur. Pas de rouge ni de vert ici : ils restent réservés au retour de réponse.
- **Lentille Écriture** : petit carré en bas à droite — absent (jamais tracé), vide (calque réussi), plein (de mémoire réussi).
- **Tous les repères (coche, cadenas, coin, carré d'écriture) vont dans les coins bas.** En haut à droite, une coche se lit comme un dakuten ゛ et un cadenas comme un handakuten ゜ : か deviendrait が.
- Dans une grille, 5 colonnes, gouttière `space-2`. La case ne descend jamais sous 44 px.
- Accessibilité : `aria-label` complet, par exemple « ぬ, nu, réussite 40 %, à revoir ».

Vous fournissez le kana, la variante, et le romaji si la case est seule.

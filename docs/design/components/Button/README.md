# Button

Bouton d'action, en cinq variantes : principal (`accent`), encre, contour, texte et icône seule.

- **Principal** (`k-btn`) : une seule fois par écran, collé en bas du contenu, hauteur `action-height`. Peut porter une seconde ligne (`<small>`) et une flèche (`k-btn--split`).
- **Encre** (`k-btn--ink`) : l'action « Suivant » après une réponse, juste ou fausse. Jamais `accent` à côté d'un retour d'erreur.
- **Contour** (`k-btn--line`) : action secondaire à poids égal (« Réessayer », « À revoir »).
- **Texte** (`k-btn--text`) : lien d'action, 44 px de haut. `k-btn--quiet` pour « Afficher la réponse ».
- **Icône** (`k-iconbtn`) : 44 × 44, toujours avec `aria-label`.
- États : `is-pressed` (1 px vers le bas, 8 % plus sombre, 80 ms), `disabled` (opacité 42 %).

Vous fournissez le libellé, à l'infinitif ou en groupe nominal (« Commencer », « Session du jour »), et l'icône éventuelle.

# TextField

Champ de saisie du romaji (kana, mot, phrase) et des noms (profil, liste).

- Saisie en `answer`, centrée pour un kana ou un mot ; alignée à gauche sur deux lignes pour une phrase (`k-field--text`).
- Focus : contour `ink` 2 px (pas `accent`, pour ne ressembler ni au juste ni au faux). Juste : `correct` + coche. Faux : `error` + croix, tremblement horizontal de 6 px ; dans une phrase, seuls les mots faux sont soulignés d'une vague.
- `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`, `enterkeyhint="done"`. Entrée valide. Le champ garde le focus après une erreur avec réessai.
- Le champ et son retour restent visibles clavier ouvert : ils sont placés juste au-dessus du clavier, la consigne se resserre au-dessus.

Vous fournissez la valeur, l'état, le texte d'attente.

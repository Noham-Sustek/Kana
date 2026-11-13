# Feedback

Panneau de retour affiché sous la zone de réponse.

- Trois états, chacun avec sa pastille : coche sur `correct`, croix sur `error`, œil sur `ink` (réponse révélée, ni juste ni fausse à l'œil).
- Titre court : « Juste », « Pas encore », « La réponse : … ». Jamais « Bravo ! » ni « Faux ! ».
- Le détail apporte quelque chose : un mot d'exemple et sa traduction, le kanji usuel, le kana confondu, la provenance d'une phrase.
- Apparition : glisse de 8 px vers le haut en 160 ms. Haptique : une impulsion de 10 ms pour juste, deux de 30 ms pour faux.
- `role="status"`, `aria-live="polite"`.

Vous fournissez le type, le titre, le détail.

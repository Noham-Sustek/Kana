# AppKeyboard

Clavier romaji intégré, sous les champs de réponse (quiz : stages 4, 6, 8 ; lecture chronométrée).

- Affiché sur écran tactile quand Réglages → Saisie → Clavier = Intégré (défaut). Le champ passe en `inputMode="none"` : le clavier du téléphone ne s'ouvre pas, l'écran ne se réduit pas, le mot ou le kana ne bouge pas.
- Disposition AZERTY, QWERTY ou QWERTZ ; Auto = d'après la langue du téléphone (Android ne donne pas la disposition réelle du clavier).
- Rangées de lettres, effacer (se répète si l'on reste appuyé), puis tiret (ー), apostrophe (n'), espace, Entrée (« Valider », « Suivant », « OK », en accent).
- Les touches agissent au toucher et ne prennent jamais le focus : le curseur reste dans le champ. Chaque touche : `haptic('key')` (vibration de 6 ms, clic de marimba en style Wii).
- Touches de 46 px de haut, grille de 10 colonnes. Papier et encre : cases `paper` à filet `control`, Entrée en `accent`. Wii : bandeau bombé comme la barre d'onglets, touches en relief, Entrée bleu brillant.

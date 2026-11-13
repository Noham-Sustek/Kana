# TabBar

En-tête et barre d'onglets des quatre écrans principaux.

- **En-tête** : à gauche le sceau du profil actif (initiale, contour `accent`) et son nom, qui ouvrent la feuille des profils ; à droite l'icône Réglages. Respecte `env(safe-area-inset-top)`.
- **Onglets** : Accueil, S'entraîner, Kana, Progrès. Icône de 22 px et libellé de 11,5 px, 56 px de haut plus `env(safe-area-inset-bottom)`. Actif : `accent` et un trait de 2 px au-dessus ; l'icône ne change pas de forme.
- L'onglet Kana a pour icône le caractère あ.
- Masquée en plein écran (question, tracé, lecture chronométrée, onboarding).
- À partir de 840 px : rail vertical à gauche (`k-rail`), trait actif sur le côté.

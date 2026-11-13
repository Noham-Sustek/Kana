# Sheet

Feuille qui monte du bas pour un choix court sans quitter l'écran : profils, choix d'exercice, options de session.

- Coins hauts `radius-lg`, poignée, ombre `shadow-sheet`, voile `scrim` derrière. Hauteur selon le contenu, 85 % de l'écran au plus, puis défilement interne.
- Se ferme en la tirant vers le bas, en touchant le voile, ou avec le bouton Retour d'Android.
- Entrée 240 ms, sortie 180 ms. En mouvement réduit : fondu.
- `role="dialog"`, `aria-modal="true"`, focus piégé, titre relié par `aria-labelledby`.

Vous fournissez le titre et le contenu.

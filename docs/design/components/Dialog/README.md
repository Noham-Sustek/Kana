# Dialog

Confirmation intégrée, à la place de `confirm()` du navigateur.

- Une question en titre, une phrase qui dit la conséquence, deux boutons. L'action sûre est à droite, sous le pouce : « Continuer » pour une session en cours, « Annuler » pour un import.
- Action irréversible (import, suppression de profil ou de liste) : bouton `k-btn--ink` nommé par son verbe (« Remplacer », « Supprimer »), jamais « OK ». Pas de rouge : il reste réservé aux réponses.
- Le bouton Retour d'Android et la touche Échap annulent.
- `role="alertdialog"`, focus initial sur l'action sûre.

Vous fournissez le titre, la conséquence, les deux libellés.

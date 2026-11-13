# Navigation

Quatre onglets, deux raccourcis d'en-tête, et un mode plein écran pour tout ce qui se joue.

## Les quatre onglets

| Onglet | Répond à | Contient |
|---|---|---|
| **Accueil** | Où j'en suis, que faire maintenant | Série, parcours (lignes acquises, en cours, verrouillées), prochaine ligne à ouvrir, kana à consolider, bouton **Session du jour**, lien **Session libre** |
| **S'entraîner** | Je veux choisir | Session libre (exercice → kana → options), Révision ciblée, Lecture chronométrée, Écriture enchaînée (une ligne, mes kana faibles), Mes listes |
| **Kana** | Je veux regarder un kana | Une seule grille gojūon, bascule hiragana / katakana, lentille **Lecture** (réussite) ou **Écriture** (jamais fait, calque réussi, de mémoire réussi) ; chaque case ouvre la fiche kana |
| **Progrès** | Est-ce que j'avance | Période, série, kana acquis sur le total, maîtrise par famille, activité, kana les plus ratés, records de lecture, progression en écriture |

En-tête de chaque onglet : à gauche le **sceau du profil** actif avec son nom (un toucher ouvre la feuille des profils : changer, créer) ; à droite l'icône **Réglages** (thème, profils, sauvegarde, à propos).

## Pourquoi cette architecture

- **L'accueil remplace le formulaire.** L'app s'ouvrait sur des options ; elle s'ouvre sur un état et un bouton. La session recommandée part en un geste, dans la zone du pouce.
- **Tableau et Écriture fusionnent en Kana.** Les deux onglets montraient la même grille. Une grille, deux lentilles, et la fiche kana devient le point central d'un kana : le lire, le voir tracé, s'entraîner à l'écrire, voir ses confusables et ses mots.
- **Réglages quitte la barre.** Peu de contenu, rarement ouvert : une icône d'en-tête suffit et libère un onglet.
- **La lecture chronométrée a une place.** Elle est une carte de premier rang dans S'entraîner, avec le record du profil visible, et non un lien en bas de page.
- **Le profil est toujours visible.** Dans une famille, savoir qui joue évite d'abîmer la série de quelqu'un d'autre. Deux touchers pour en changer.
- **Quatre onglets plutôt que cinq** : cibles de 90 px de large à 360 px, libellés entiers (« S'entraîner » tient), et une place libre si un besoin apparaît.

## Parcours principaux

1. **Premier lancement** : Bienvenue → deux écritures (hiragana d'abord, katakana ensuite, modifiable) → principe du parcours (une ligne à la fois, la suivante s'ouvre à 80 %) → nom du profil → Accueil avec l'état vide « Ligne あ : 5 kana à découvrir » et le bouton **Commencer**. Trois écrans, chacun passable.
2. **Session quotidienne en un geste** : Accueil → **Session du jour** → questions en plein écran → (déblocage d'une ligne, s'il y a lieu) → récapitulatif → Accueil, série mise à jour.
3. **Session libre** : Accueil ou S'entraîner → **Session libre** → choix de l'exercice (trois familles) → kana (lignes ou listes) → **Commencer**. Les options (nombre de questions, chrono, réessai, validation du dessin, filtre des phrases) sont repliées et n'apparaissent que si l'exercice choisi les utilise. Le dernier réglage est mémorisé.
4. **Écrire un kana** : Kana → case → fiche kana → **S'entraîner à l'écrire** → observer, calque, de mémoire → comparaison → kana suivant de la ligne ou retour à la fiche.
5. **Consulter un kana** : Kana → case → fiche ; balayage ou précédent / suivant pour parcourir la ligne. Depuis un récapitulatif ou « À consolider », un kana ouvre la même fiche.

## Plein écran

Question, tracé, lecture chronométrée, onboarding et célébration de déblocage masquent la barre d'onglets. Une croix en haut à gauche quitte ; si une session est en cours, un dialogue intégré demande confirmation (« Quitter la session ? Vos 4 réponses sont enregistrées. » — **Continuer** / **Quitter**).

## Écran large

À partir de 840 px, la barre d'onglets devient un rail vertical à gauche (mêmes quatre entrées, profil en haut, réglages en bas). Le contenu reste une colonne de 480 px ; Accueil et Progrès gagnent une seconde colonne (parcours et kana à consolider d'un côté, série et action de l'autre). La question reste centrée, réponses à portée de clavier (touches 1 à 4, Entrée pour suivant).

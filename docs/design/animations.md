# Animations et haptique

Le mouvement sert à trois choses : dire si une réponse est juste, montrer qu'on avance, marquer un déblocage. Rien ne bouge pour décorer.

## Principes

- **Court.** 80 à 240 ms pour un retour, 300 ms pour changer d'écran, 360 à 600 ms pour le déblocage d'une ligne. Une animation ne retarde jamais une saisie : la question suivante peut être touchée pendant qu'une animation se termine.
- **Une courbe.** `cubic-bezier(.2, .8, .2, 1)` pour ce qui apparaît, `ease-out` pour ce qui tremble ou glisse, `linear` pour les fondus.
- **Pas de couleur seule.** Le mouvement double toujours un signal déjà visible (icône, texte barré, mot).
- **Mouvement réduit** (`prefers-reduced-motion: reduce`) : tout déplacement, rebond ou tremblement devient un fondu de 100 ms. Les signaux statiques restent.
- **Haptique** via `navigator.vibrate` (Android) ; absent sur iPhone, rien ne doit en dépendre. Réglage « Vibrations » dans Réglages, activé par défaut.

## Catalogue

| Moment | Animation | Durée | Haptique | Mouvement réduit |
|---|---|---|---|---|
| Toucher une réponse, un bouton | Enfoncement 1 px, 8 % plus sombre | 80 ms | — | Assombrissement seul |
| Réponse juste | Bouton : pulsation à 104 % ; pastille à coche qui grossit de 0 à 100 % | 180 ms / 200 ms | 1 impulsion, 10 ms | Fondu de la pastille |
| Réponse fausse | Bouton ou champ : tremblement horizontal 6 → 2 px ; pastille à croix | 240 ms | 2 impulsions, 30 ms · pause 40 ms · 30 ms | Pas de tremblement ; croix et texte barré |
| Panneau de retour | Glisse de 8 px vers le haut et apparaît | 160 ms | — | Fondu 100 ms |
| Barre de session | Le segment se remplit (accent, ou entaille si raté) | 200 ms | — | Instantané |
| Question suivante | Le contenu sort à gauche de 24 px en fondu, le suivant entre par la droite | 220 ms | — | Fondu croisé 100 ms |
| Trait validé (calque) | L'encre se remplace par le tracé du modèle | 120 ms | 1 impulsion, 8 ms | Remplacement direct |
| Trait refusé | Pointillés rouges, un tremblement, puis effacement | 400 ms | 2 impulsions, 30 ms | Effacement en fondu |
| Indice | Point de départ qui pulse 2 fois, trajet en pointillés tracé | 600 ms | — | Point et trajet statiques |
| Ordre des traits (fiche, observer) | Chaque trait se dessine, pause de 100 ms entre les traits, boucle après 1,2 s | 700 ms par trait | — | Traits numérotés, affichés d'un coup |
| Ligne débloquée | Écran plein : rayons en fondu, titre qui monte de 8 px, les 5 cases apparaissent l'une après l'autre (échelle 60 → 106 → 100 %) | 360 ms + 60 ms par case | 3 impulsions, 20 · 60 · 20 · 60 · 40 ms | Fondu de l'ensemble |
| Nouveau record | L'étoile or apparaît à 115 % puis 100 %, le chiffre compte jusqu'à sa valeur | 200 ms / 600 ms | 1 impulsion, 20 ms | Chiffre final direct |
| Vibrations activées (Réglages) | L'interrupteur glisse | 150 ms | 1 impulsion, 15 ms (confirme que la vibration fonctionne) | Instantané |
| Récapitulatif | Les carrés de maîtrise se remplissent un à un | 120 ms chacun | — | Instantané |
| Série +1 | Le carré du jour passe des pointillés au plein | 240 ms | — | Instantané |
| Changement d'onglet | Aucun mouvement de page ; le trait actif glisse sous l'onglet | 200 ms | — | Instantané |
| Ouvrir un écran (fiche, session libre) | Entre par la droite sur 32 px en fondu ; retour en sens inverse | 300 ms / 240 ms | — | Fondu 100 ms |
| Feuille modale | Monte du bas ; voile en fondu | 240 ms entrée, 180 ms sortie | — | Fondu |
| Dialogue | Échelle 96 → 100 % en fondu | 160 ms | — | Fondu |
| Lecture chronométrée : mot juste | Le cadre glisse vers le mot suivant ; le mot lu passe en `ink-muted` | 140 ms | 1 impulsion, 8 ms | Saut direct |
| Lecture chronométrée : mot faux | Le cadre tremble, le champ se vide | 240 ms | 2 impulsions, 30 ms | Champ vidé, contour rouge |
| Chrono de question | La barre se vide linéairement ; pointillés sous 3 s | durée du chrono | 1 impulsion, 40 ms à l'échéance | Identique (information) |

## Implémentation

- Keyframes dans `components/bundle.css` : `k-pop`, `k-shake`, `k-rise`, `k-badge-in`, `k-unlock`, `k-ink` ; classes `k-anim-*`. À reprendre dans `src/index.css` à côté des existantes (`stroke-draw`, `fade-in`, `timer-shrink`).
- Haptique : une fonction `haptic(pattern)` dans `lib/`, qui teste `'vibrate' in navigator` et le réglage, appelée par les stores au moment où la session fixe le résultat (pas par les composants).
- Transitions d'écran : View Transitions API quand elle existe (`document.startViewTransition`), sinon aucune animation.

## Style « Wii » (`src/styles/skin-wii.css`)

Quand `<html data-ui="wii">`, les mêmes classes `animate-*` prennent un mouvement élastique (`cubic-bezier(.3, 1.5, .5, 1)`), et l'interface flotte :

| Moment | Mouvement | Durée |
|---|---|---|
| Repos : cartes, réponses, étiquettes, bannières | Flottement vertical de 4 px, décalé d'un élément à l'autre | 4,4 s en boucle |
| Repos : case en cours du parcours | Flottement de 3 px (les cases de la grille restent fixes : plus de 100 calques animés font ramer) | 3,6 s en boucle |
| Repos : case de la question (écran 3DS) | Flottement de 5 px | 5,2 s en boucle |
| Bouton principal | Respiration (échelle 1 → 1,015) | 3,6 s en boucle |
| Appui (boutons, cartes, cases) | S'enfonce de 3 px (l'ombre du bas disparaît), rebondit au relâché | 70 ms / 380 ms |
| Onglet actif | La bulle saute et reste 4 px plus haut | 520 ms |
| Entrée d'une carte | Gonfle de 90 → 100 % en fondu, en cascade | 620 ms |
| Bonne réponse / mauvaise | Rebond 92 → 107 → 100 % / tremblement avec rotation | 460 ms |
| Feuille, dialogue | Monte avec un léger dépassement / gonfle de 82 % | 560 ms / 460 ms |
| Fond | Bulles qui dérivent lentement | 38 s, aller-retour |

Le flottement anime la propriété `translate`, l'appui `transform`, les entrées `scale` : ils se combinent. Mouvement réduit : plus aucune boucle ni rebond, fondu de 100 ms. Performances : seules des propriétés composées (`translate`, `transform`, `scale`, `opacity`) bouclent ; fond en calques fixes, jamais `background-attachment: fixed`.

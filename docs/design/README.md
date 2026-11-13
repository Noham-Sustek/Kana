Kana est une PWA personnelle pour apprendre les hiragana et les katakana : hors ligne, sans compte, à une main, en sessions de 2 à 10 minutes. Ce système décrit sa nouvelle interface.

Direction retenue : **Papier et encre**. Où trouver quoi :

- *Navigation* : quatre onglets, parcours principaux, plein écran, écran large.
- *Animations et haptique* : chaque mouvement, sa durée, sa vibration, sa variante réduite.
- Groupe **Composants** : bouton, réponse à choix, contrôle segmenté, interrupteur, puce, carte, case de kana, progression, champ, étiquette de mot, zone de tracé, retour de réponse, bandeau, feuille, dialogue, barre d'onglets, état vide, mouvement.
- Groupe **Écrans** : onboarding, accueil, S'entraîner et listes, session libre, fin de session (quitter, déblocage, récapitulatif), lecture chronométrée, Kana (grille, fiche), écriture guidée, progrès, réglages, écran large.
- Groupe **Questions** : les six variantes, chacune en attente, juste, fausse avec réessai et réponse révélée.
- *Directions* : les trois pistes de départ, gardées pour mémoire.

Chaque carte montre le clair puis le sombre.

## Voix

- Écrivez en français, au vouvoiement, partout. « Choisissez une autre réponse », jamais « Choisis ».
- Ton sobre et encourageant, jamais infantilisant. Une erreur se dit « Pas encore », une réussite « Juste ». Pas de point d'exclamation, pas d'émoji, pas de mascotte.
- Dites ce qui se passe et ce qui vient : « Ligne た : 4 kana acquis sur 5. Encore un et la ligne な s'ouvre. »
- Casse de phrase pour les titres et les boutons. Les capitales sont réservées au style `overline`.
- Typographie française : espace insécable avant « : ; ? ! », guillemets « », apostrophe courbe.
- Les chiffres disent des faits (série, questions, minutes, kana par minute). Pas de points, de niveaux ni de monnaie.

## Vocabulaire

Les termes internes ne s'affichent jamais. Utilisez ces noms.

| Interne | À l'écran |
|---|---|
| Mode auto, parcours guidé | **Session du jour** (le bouton principal de l'accueil) |
| Mode auto, sélection | **Révision ciblée** (sur « mes kana ») |
| Mode manuel | **Session libre** |
| Stage 1 · kana → romaji, 4 choix | Reconnaître · **Quel son ?** |
| Stage 2 · romaji → kana, 4 choix | Reconnaître · **Quel kana ?** |
| Stage 3 · 8 choix proches | Reconnaître · **Faux jumeaux** |
| Stage 4 · saisie | Reconnaître · **De mémoire** |
| Stage 5 · dessiner un kana | Écrire · **Tracer un kana** |
| Stage 7 · dessiner un mot | Écrire · **Tracer un mot** |
| Stage 6 · lire un mot | Lire · **Lire un mot** |
| Stage 8 · lire une phrase | Lire · **Lire une phrase** |
| Stage 9 · composer | Lire · **Composer une phrase** |
| Maîtrise par (kana, stage) | **Nouveau · En cours · Acquis · Solide** |
| Groupe de kana | **Ligne** (ligne あ, ligne か…) |
| Liste personnalisée | **Liste** (« Mes kana difficiles ») |

Trois familles, trois icônes, toujours les mêmes : **Reconnaître** (œil), **Écrire** (pinceau), **Lire** (livre). La famille s'affiche au-dessus de la consigne de chaque question.

## Couleur

- Le fond est `paper`, le texte `ink`. En sombre `paper` est un noir pur : ne posez pas de gris par-dessus pour « adoucir ».
- `accent` (indigo) porte une seule chose par écran : l'action principale ou l'état « acquis ». Texte sur `accent` : `on-accent`.
- `correct` et `error` sont identiques dans les deux thèmes et ne servent qu'au retour de réponse. Ils ne vont jamais seuls : une coche ou une croix dans une pastille `radius-full`, un mot (« Juste », « Pas encore »), et pour une réponse fausse un texte barré.
- Pour du texte vert ou rouge sur `paper`, utilisez `correct-ink` / `error-ink`, pas les aplats.
- Aucun bouton `accent` à côté d'un retour d'erreur : l'action suivante y est en `ink` sur `paper-raised`.
- `gold` est réservé aux records et au déblocage d'une ligne.
- Séparez par des filets `hairline`, pas par des ombres. Un contrôle interactif prend un contour `border-control` (3:1), jamais `hairline` seul.
- La heatmap de réussite est une rampe d'une seule teinte : `heat-1`, `heat-2`, `heat-3`, puis `accent`. Le niveau le plus faible porte en plus un coin plein. Pas de rouge ni de vert dans la heatmap.
- Focus clavier : contour `ink` de 2 px décalé de 2 px, sur toutes les surfaces (15:1 en clair, 17:1 en sombre).

## Typographie

- Tout kana est en `Klee One Kana` (classe `jp`), une police de manuel scolaire dont les formes suivent l'écriture manuscrite standard : さ, き et り gardent leurs traits séparés, comme on les trace. Seuls les kana sont embarqués (25 Ko) ; les kanji retombent sur la police système.
- Le kana d'une question est en `kana-hero`, dans une case carrée à repères en croix. Ne le réduisez pas pour gagner de la place : réduisez le reste.
- Consignes, chiffres clés et romaji des réponses en `Newsreader` (`title`, `numeral`, `answer`). Tout le reste de l'interface en `Figtree`.
- Chiffres tabulaires pour les compteurs et les chronos.

## Forme et espace

- Le motif est la case de papier quadrillé (genkō yōshi) : carrée, `radius-sm`, filet fin. Elle sert à la question, à la grille, au parcours et à la zone de tracé.
- Sur une case de kana, tout repère (coche, cadenas, coin, carré d'écriture) va dans un coin **bas**. En haut à droite, une coche se lit comme un dakuten ゛ et un cadenas comme un handakuten ゜.
- Rayons courts : `radius-sm` pour les cases, `radius-md` pour les boutons. `radius-lg` seulement pour les feuilles modales.
- Toute cible tactile fait au moins `touch-min`. L'action principale d'un écran est collée en bas du contenu (`sticky`, jamais `fixed`), haute de `action-height`, au-dessus de la zone sûre.
- Largeur de référence 360 à 412 px. Sur écran large, le contenu reste une colonne de 480 px au plus, la navigation passe sur le côté.
- Pendant une question ou la lecture chronométrée : plein écran, sans barre d'onglets.

## Icônes

- Tracés au trait de 2 px, bouts et angles arrondis, grille de 24 px, `currentColor`, embarqués en SVG dans le code (jeu existant de `src/components/Icon.tsx`, style Lucide). Aucune police d'icônes, aucun émoji.
- Familles : œil (`eye`) = Reconnaître, pinceau (`pen`) = Écrire, livre (`book`) = Lire. Onglets : maison, cible, あ, graphique.
- À ajouter au jeu existant : `home`, `target`, `book`, `flame`, `star`, `compare`, `download`, `upload`, `list`, `lock`, `play`, `skip`, `arrow`, `chevronDown`, `chevronUp`.
- L'onglet Kana a pour icône le caractère あ lui-même, en `Klee One Kana`.

## Écrans de question

- De haut en bas : quitter et progression ; famille d'exercice (icône + nom) et consigne ; le sujet (kana, mot, phrase) centré dans l'espace libre ; la zone de réponse ; le retour ; l'action. Le sujet rétrécit, jamais la zone de réponse.
- Clavier ouvert (320 à 400 px utiles) : la consigne passe en version compacte (`k-kind--c`, `k-ask--c`), le kana en `k-case--sm`, et le champ, son retour et « Suivant » restent juste au-dessus du clavier.
- « Suivant » est en encre (`k-btn--ink`), juste ou faux. Après une erreur avec réessai, pas de bouton : on répond à nouveau.
- Quitter une session en cours passe par un dialogue intégré.

## Mouvement

- Court et utile : 80 à 240 ms pour un retour, 300 ms pour changer d'écran, 600 ms au plus pour un déblocage. Le détail est dans *Animations et haptique*.
- Avec `prefers-reduced-motion`, tout déplacement devient un fondu de 100 ms ; le tremblement d'erreur disparaît, la croix et le texte barré restent.

## Contraintes du produit

- Aucune ressource distante à l'exécution : polices, icônes et tracés sont dans le build.
- Aucune interaction au survol seul. Aucun audio.
- Conservez les attributions KanjiVG, JMdict (Jiyomi) et Aozora Bunko dans Réglages → À propos, et ajoutez-y les licences OFL des trois polices (`licenses/`).

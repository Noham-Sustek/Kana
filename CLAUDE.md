# Kana — PWA d'apprentissage des hiragana & katakana

Application personnelle pour apprendre les kana japonais (hiragana + katakana).
Cible principale : **Android, Samsung S24** (Chrome, installée en PWA).

Principes non négociables :
- **100 % hors ligne** : aucune requête réseau à l'exécution (pas de CDN, pas de Google Fonts, pas d'API). Tout asset (données, polices, tracés) est embarqué dans le build et précaché par le service worker.
- **Sans compte, sans pub, sans tracking.** Les données restent sur l'appareil.
- **Mobile-first** : conçu pour un écran ~360–412 px de large, utilisé au pouce.

## Stack

| Rôle | Outil |
|---|---|
| UI | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Styles | Tailwind CSS v4 (`@tailwindcss/vite`, config CSS-first dans `src/index.css`) |
| PWA | `vite-plugin-pwa` (generateSW, `registerType: 'autoUpdate'`) |
| État | Zustand |
| Persistance | IndexedDB via Dexie |
| Routing | React Router 7 en `HashRouter` (zéro config serveur, compatible tout hébergeur statique) |

## Commandes

```bash
npm run dev        # serveur de dev
npm run build      # tsc -b && vite build — doit toujours passer avant un commit
npm run preview    # sert dist/ (pour tester le service worker / l'installation PWA)
npm run typecheck  # tsc -b seul
npm test           # tests Vitest (vitest run) ; npm run test:watch en continu
npm run icons      # régénère les icônes PNG/SVG de public/ (scripts/build-icons.mjs)
npm run words      # régénère src/data/dictWords.json depuis le dictionnaire Jiyomi (scripts/build-words.mjs)
```

Tester sur le S24 : `npm run dev -- --host` puis ouvrir l'IP locale depuis le téléphone (le SW n'est actif qu'en HTTPS ou localhost — pour tester l'installation, passer par `preview` + tunnel ou le déploiement).

## Structure

```
src/
  app/         App.tsx (routes), tabs.ts (définition des onglets)
  components/  composants UI partagés (AppLayout, BottomTabBar, Icon, PageHeader…)
  pages/       une page par onglet : Learn, Table, Writing, Stats, Settings
  stores/      stores Zustand (un fichier par domaine : settingsStore.ts, profileStore.ts…)
  db/          base Dexie (db.ts) — schéma versionné ; un fichier d'accès par domaine (answers, profiles, backup…)
  engine/      scheduler.ts : planificateur du mode auto (répétition espacée, pur)
  lib/         hooks et utilitaires génériques
  data/        données statiques : kana.ts (kana + groupes), words.ts (~1800 mots écrits à la main + dictWords.json,
               généré : 6500 mots au total), sentences.ts (phrases), confusables.ts,
               strokes.json (généré, tracés KanjiVG) + strokes.ts (accès typé)
  features/    logique métier par domaine (quiz/, writing/, stats/, backup/)
scripts/       build-icons.mjs : icônes PWA (192/512, maskable, apple-touch, icon.svg) depuis le tracé de あ,
               rasterisation + encodage PNG maison, sans dépendance — `npm run icons`
               build-strokes.mjs : télécharge les SVG KanjiVG des kana (cache scripts/.cache, ignoré par git)
               et régénère src/data/strokes.json — `npm run strokes` (`-- --refresh` pour retélécharger)
               build-words.mjs : télécharge la base SQLite du dictionnaire Jiyomi (JMdict + français, release figée
               `dico-60`, cache scripts/.cache) et régénère src/data/dictWords.json — `npm run words`
public/        assets statiques (icônes générées)
.github/       workflows/deploy.yml : tests + build + GitHub Pages à chaque push sur main
```

Alias d'import : `@/` → `src/`. Toujours l'utiliser plutôt que des chemins relatifs `../`.

## Conventions

- **Langue** : interface en français. Code (identifiants, noms de fichiers) en anglais. Commentaires en français, rares, uniquement pour le *pourquoi*.
- **Composants** : fonctions nommées exportées (`export function Foo()`), pas d'export default. Un composant par fichier, nom de fichier = nom du composant.
- **TypeScript** : `strict` + `noUncheckedIndexedAccess`. Pas de `any`. Imports de types avec `import type`.
- **Styles** : classes Tailwind uniquement, pas de CSS module. Chaque couleur claire a sa variante `dark:`. Couleur d'accent : `accent-*` (définie dans `@theme` de `index.css`). Texte japonais : classe `font-jp`.
- **Thème** : réglage `light | dark | system` dans `settingsStore`, appliqué via la classe `.dark` sur `<html>` (`useApplyTheme`). Un script inline dans `index.html` l'applique avant le premier rendu — garder la clé `kana-settings` synchronisée.
- **Persistance** :
  - Préférences d'UI légères → Zustand `persist` (localStorage).
  - Données d'apprentissage (progression, révisions SRS, historique, profils) → **Dexie/IndexedDB**. Toute modification de schéma = nouveau `db.version(n)` avec migration ; ne jamais modifier une version existante.
  - **Profils** (Dexie v4) : toute donnée d'apprentissage porte un `profileId` et toute requête filtre dessus (index composés `[profileId+…]`). Profil actif = `profileStore` (localStorage `kana-profile`) ; `activeProfileId()` hors composants. Profil par défaut id 1 « Moi » (créé par `populate` ou par la migration v4).
  - **Sauvegarde** (`features/backup/`) : format JSON `kana-backup` versionné, validé par `parseBackup` ; l'import remplace tout. Nouvelle table ou nouveau champ → l'ajouter à l'export/import et à la validation ; nouvelle clé localStorage → `PREFERENCE_KEYS`.
- **Logique métier** isolée dans `features/` en fonctions pures testables, séparée des composants. Les stores orchestrent, les composants affichent.
- **Mobile** : cibles tactiles ≥ 44 px, respecter `env(safe-area-inset-*)`, pas d'interaction au survol uniquement.
- **Dépendances** : en ajouter le moins possible ; aucune qui charge des ressources distantes.
- **Données kana** (`src/data/kana.ts`) : ids stables `h-<clé>` / `k-<clé>` (persistés en base, ne jamais les renommer). `romaji[0]` = forme Hepburn affichée, les suivants = variantes acceptées. Les groupes katakana sont dérivés des hiragana (seuls les étendus sont écrits en katakana). Homophones Hepburn assumés : じ/ぢ (ji), ず/づ (zu), ヲ/ウォ (wo) — un quiz romaji → kana doit en tenir compte.
- **Quiz** (`features/quiz/`) — 9 stages : 1 kana→romaji (4 choix), 2 romaji→kana, 3 kana→romaji (8 proches), 4 saisie, 5 dessiner le kana, 6 lire un mot, 7 dessiner un mot, 8 lire une phrase, 9 composer une phrase (romaji → étiquettes en kana). Pas d'audio (retiré). Les numéros sont persistés (`answers.stage`) : en insérer ou en retirer un = migration Dexie + `BACKUP_VERSION` + migration du store de réglages (historique et `migrateStage` dans `stages.ts`).
  - `questions.ts` génère les questions (pures, `Rng` injectable pour des tests déterministes) ; un distracteur ne doit jamais être une bonne réponse possible (pas de romaji partagé, cf. homophones).
  - `reading.ts` vérifie une saisie romaji (kana seul ou mot) : toutes les variantes, っ = consonne doublée (っち → tchi/cchi), ー = voyelle répétée ou `-`. Les mots se lisent kana par kana (とうきょう → toukyou).
  - `session.ts` = machine à états pure (pending → correct/failed). Le résultat est fixé au **premier essai** : une réussite après réessai reste un échec ; « Afficher la réponse » et chrono écoulé = échec `revealed`.
  - Mode auto, deux sources (`autoSource`) : `path` = parcours guidé par écriture (groupes débloqués quand 80 % des kana actifs sont maîtrisés au stage 1) ; `selection` = kana cochés par l'utilisateur (mêmes `groupIds`/`customGroupIds` que le mode manuel), même planificateur sans déblocage (`createSelectionContext`).
  - Table Dexie `answers` : une ligne par kana évalué (mots et phrases : une ligne par kana distinct, `wordId` pour les mots).
  - Phrases (`data/sentences.ts`) : mots et particules séparés par des espaces ; は / へ / を isolés se lisent wa / e / o (`reading.ts`, lecture du kana aussi acceptée). Les phrases tout hiragana existent aussi converties en katakana (`toKatakana`) ; celles avec des mots empruntés forment la série « mixte ». Filtre `sentenceFilter` (mode manuel, stages 8 et 9) : écriture, ou `dragonball` si l'option `animeSentences` est cochée (`effectiveSentenceFilter`).
  - Phrases d'anime (`data/animeSentences.ts`) : répliques de Dragon Ball (liste du dépôt Dokkan, `Text/_iconiques.tsv`) réécrites en kana lisibles (kanji et chiffres en kana, sans ponctuation, longues répliques découpées) ; `original` (texte d'origine, montré après la réponse) et `scene`. Proposées quels que soient les kana cochés ; jamais en mode auto.
  - Stage 9 (`kind: 'compose'`, `ComposeAnswer`) : une étiquette par mot de la phrase + 2 à 4 intrus (`tileDistractors` : un kana remplacé par un kana proche, jamais un mot juste ni une variante de même romaji, cf. ず/づ). Vérifié dès que la phrase est complète ; toucher une étiquette posée la retire. Absent du mode auto (`AUTO_STAGES` = 1 à 8).
  - Dessin (stages 5 et 7, `kind: 'draw'`) : `QuizDrawing` (chargé en différé), un `WritingPad` libre par caractère ; petits kana dessinés en grand, ー synthétisé (`drawingStrokesOf`). Juste = aucune erreur de trait ni indice sur tous les caractères (`session.submitDrawing`), puis comparaison tracé / modèle. Le romaji d'un mot à dessiner note ー par un macron (kōhī).
  - Rouge (`red-600`) = erreur, vert (`emerald-600`) = correct, identiques dans les deux thèmes ; ne pas utiliser l'accent pour un bouton affiché à côté d'une erreur.
- **Mots** (`data/words.ts`) : liste manuelle `RAW` (prioritaire) + `dictWords.json` généré par `npm run words` (mots courants de Jiyomi/JMdict, CC BY-SA 4.0, attribution dans `/settings/about` — à conserver). Ne pas éditer `dictWords.json` à la main : ajuster les filtres ou les cibles (`TARGET`) du script. L'id d'un mot est son kana (persisté dans `answers.wordId`). Kanji usuel (`Word.kanji`, montré après la réponse aux stages 6 et 7) : celui de l'entrée JMdict pour les mots générés, rapproché par la traduction pour la liste manuelle (`manualKanji`, corrections dans `KANJI_OVERRIDES`) ; jamais pour un mot habituellement écrit en kana, un mot en katakana ou un sens ambigu.
- **Écriture** (`features/writing/`) :
  - Tracés KanjiVG (CC BY-SA 3.0, attribution dans `/settings/about` — à conserver) : repère carré de 109 unités, traits dans l'ordre, points à pas ~2. Ne jamais éditer `strokes.json` à la main.
  - `strokeMatch.ts` compare des points rééchantillonnés (32) : forme (écart moyen après recentrage), position (écart des centres), sens (endroit vs envers, ignoré pour les traits < 14 unités), ordre (le trait correspond à un trait suivant). Modes `trace` (niveau 2, strict) et `free` (niveau 3, tolère décalage et échelle ×1,4). `session.ts` = machine à états pure, indice après 2 erreurs sur un trait.
  - `WritingPad` : le canvas ne porte que l'encre en cours / le trait refusé ; modèle, traits validés et indices sont dans un SVG dessous. Niveau 2 (calque) : un trait validé est remplacé par celui du modèle. Niveau 3 (libre) : pas de « magnétisme », le trait reste tel que dessiné ; à la fin (ou bouton « Comparer ») `WritingComparison` affiche tracé et modèle côte à côte. Pointer events + `touch-none` (pas de scroll pendant le tracé), un seul doigt actif, `getCoalescedEvents`.
  - Seuls les kana d'un caractère sont exercés (pas les yōon/combinaisons).
  - La page d'exercice est chargée en différé (`lazy`) pour sortir les tracés du bundle principal.
- **Stats** (`features/stats/`) : fonctions pures sur l'historique `answers` du profil (`now` injecté, jours locaux). Une question = un horodatage (`questionsOf`, le stage 6 écrit une ligne par kana). Heatmap = réussite sur les 10 dernières réponses du kana ; couleurs identiques dans les deux thèmes.
- **PWA** : compatible Android (Chrome) et iPhone (Safari, métas `apple-mobile-web-app-*`, hauteur en `dvh`). Boutons d’action (Commencer, Suivant) en `sticky bottom-0`, jamais en `fixed`. Tout le build est précaché (Workbox generateSW, cache-first), `navigateFallback` sur `index.html`. Vérifier qu'aucune URL distante n'est chargée et que l'app se recharge serveur coupé.
- Tests Vitest à côté du code (`foo.test.ts`), pour toute logique pure.
- Vérifier que `npm run build` et `npm test` passent avant chaque commit.

## Roadmap

1. **Données kana** — table complète hiragana/katakana (gojūon, dakuten/handakuten, yōon), romaji (Hepburn), regroupement par lignes (a, ka, sa…), typée et statique dans `src/data/`. Onglet *Tableau* affichant la grille.
2. **Quiz (stages)** — apprentissage par étapes (ligne par ligne, puis mélange). Types de questions : kana → romaji, romaji → kana, QCM et saisie. Onglet *Apprendre*.
3. **Mode auto / répétition espacée** — algorithme SRS (type SM-2 ou FSRS simplifié) par kana, file de révision quotidienne, persistance Dexie.
4. **Écriture guidée** — tracé au doigt sur canvas, ordre et direction des traits (données de tracés embarquées, ex. KanjiVG sous licence CC BY-SA), validation tolérante. Onglet *Écriture*.
5. ~~**Audio**~~ — abandonné : synthèse vocale retirée (stage « Écouter » supprimé, migration v7).
6. **Stats & profils** — taux de réussite, kana difficiles, séries, historique ; plusieurs profils locaux. Onglet *Stats*.
7. **PWA/offline & déploiement** — icônes PNG (192/512, maskable), écran de démarrage, vérification hors ligne complète, export/import des données (JSON), déploiement statique (GitHub Pages ou équivalent).

## État actuel

- Étape 0 : projet initialisé, navigation par onglets, thème clair/sombre/système, PWA de base.
- Étape 1 terminée : `src/data/kana.ts` (104 hiragana, 104 katakana + 24 katakana étendus), tests de cohérence, onglet Tableau (grille gojūon, bascule hiragana/katakana, vue détaillée `/table/:kanaId` avec précédent/suivant et swipe).
- Étape 2 terminée : quiz en 6 stages (onglet Apprendre, `/learn/quiz`), mode manuel par groupes cochés + listes personnalisées (Dexie `customGroups`, `/learn/custom/:id`), options réessai / afficher la réponse / chrono, réponses enregistrées dans Dexie `answers`.
- Étape 3 terminée : mode auto (`engine/scheduler.ts`, `features/quiz/auto.ts`), maîtrise par (kana, stage), déblocage progressif des groupes (Dexie `autoStates`).
- Étape 4 (écriture guidée) en place : onglet Écriture, `/writing/:kanaId` avec 3 niveaux, validation trait par trait, écran À propos. Pas encore de persistance des résultats d'écriture.
- Étape 5 abandonnée : l'audio (synthèse vocale, stage Écouter) a été retiré.
- Étape 6 terminée : profils (Réglages → Profils, pastilles sur Stats), onglet Stats (série, réussite, temps moyen, activité 14 j, kana les plus ratés, heatmap), heatmap optionnelle sur le Tableau (`?heat=1`).
- Étape 7 terminée : icônes PNG + maskable, manifeste complet, précache cache-first vérifié hors ligne, export/import JSON (Réglages → Sauvegarde), déploiement GitHub Pages par GitHub Actions.

# Kana — PWA d'apprentissage des hiragana & katakana

Application personnelle pour apprendre les kana japonais (hiragana + katakana).
Cible principale : **Android, Samsung S24** (Chrome, installée en PWA).

Principes non négociables :
- **100 % hors ligne** : aucune requête réseau à l'exécution (pas de CDN, pas de Google Fonts, pas d'API). Tout asset (données, audio, polices, tracés) est embarqué dans le build et précaché par le service worker.
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
```

Tester sur le S24 : `npm run dev -- --host` puis ouvrir l'IP locale depuis le téléphone (le SW n'est actif qu'en HTTPS ou localhost — pour tester l'installation, passer par `preview` + tunnel ou le déploiement).

## Structure

```
src/
  app/         App.tsx (routes), tabs.ts (définition des onglets)
  components/  composants UI partagés (AppLayout, BottomTabBar, Icon, PageHeader…)
  pages/       une page par onglet : Learn, Table, Writing, Stats, Settings
  stores/      stores Zustand (un fichier par domaine : settingsStore.ts…)
  db/          base Dexie (db.ts) — schéma versionné
  lib/         hooks et utilitaires génériques
  data/        données statiques : kana.ts (kana + groupes), words.ts (~250 mots), confusables.ts,
               strokes.json (généré, tracés KanjiVG) + strokes.ts (accès typé)
  features/    logique métier par domaine (quiz/, audio/, writing/ ; à venir : srs)
scripts/       build-strokes.mjs : télécharge les SVG KanjiVG des kana (cache scripts/.cache, ignoré par git)
               et régénère src/data/strokes.json — `npm run strokes` (`-- --refresh` pour retélécharger)
public/        assets statiques (icône, audio…)
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
- **Logique métier** isolée dans `features/` en fonctions pures testables, séparée des composants. Les stores orchestrent, les composants affichent.
- **Mobile** : cibles tactiles ≥ 44 px, respecter `env(safe-area-inset-*)`, pas d'interaction au survol uniquement.
- **Dépendances** : en ajouter le moins possible ; aucune qui charge des ressources distantes.
- **Données kana** (`src/data/kana.ts`) : ids stables `h-<clé>` / `k-<clé>` (persistés en base, ne jamais les renommer). `romaji[0]` = forme Hepburn affichée, les suivants = variantes acceptées. Les groupes katakana sont dérivés des hiragana (seuls les étendus sont écrits en katakana). Homophones Hepburn assumés : じ/ぢ (ji), ず/づ (zu), ヲ/ウォ (wo) — un quiz romaji → kana doit en tenir compte.
- **Quiz** (`features/quiz/`) :
  - `questions.ts` génère les questions (pures, `Rng` injectable pour des tests déterministes) ; un distracteur ne doit jamais être une bonne réponse possible (pas de romaji partagé, cf. homophones).
  - `reading.ts` vérifie une saisie romaji (kana seul ou mot) : toutes les variantes, っ = consonne doublée (っち → tchi/cchi), ー = voyelle répétée ou `-`. Les mots se lisent kana par kana (とうきょう → toukyou).
  - `session.ts` = machine à états pure (pending → correct/failed). Le résultat est fixé au **premier essai** : une réussite après réessai reste un échec ; « Afficher la réponse » et chrono écoulé = échec `revealed`.
  - Table Dexie `answers` : une ligne par kana évalué (stage 6 : une ligne par kana distinct du mot, avec `wordId`).
  - Audio : tout passe par `useKanaAudio()` (provisoirement synthèse vocale de l'appareil ; à remplacer par les fichiers de l'étape 5 sans toucher aux appelants).
  - Rouge (`red-600`) = erreur, vert (`emerald-600`) = correct, identiques dans les deux thèmes ; ne pas utiliser l'accent pour un bouton affiché à côté d'une erreur.
- **Écriture** (`features/writing/`) :
  - Tracés KanjiVG (CC BY-SA 3.0, attribution dans `/settings/about` — à conserver) : repère carré de 109 unités, traits dans l'ordre, points à pas ~2. Ne jamais éditer `strokes.json` à la main.
  - `strokeMatch.ts` compare des points rééchantillonnés (32) : forme (écart moyen après recentrage), position (écart des centres), sens (endroit vs envers, ignoré pour les traits < 14 unités), ordre (le trait correspond à un trait suivant). Modes `trace` (niveau 2, strict) et `free` (niveau 3, tolère décalage et échelle ×1,4). `session.ts` = machine à états pure, indice après 2 erreurs sur un trait.
  - `WritingPad` : le canvas ne porte que l'encre en cours / le trait refusé ; modèle, traits validés et indices sont dans un SVG dessous. Pointer events + `touch-none` (pas de scroll pendant le tracé), un seul doigt actif, `getCoalescedEvents`.
  - Seuls les kana d'un caractère sont exercés (pas les yōon/combinaisons).
  - La page d'exercice est chargée en différé (`lazy`) pour sortir les tracés du bundle principal.
- Tests Vitest à côté du code (`foo.test.ts`), pour toute logique pure.
- Vérifier que `npm run build` et `npm test` passent avant chaque commit.

## Roadmap

1. **Données kana** — table complète hiragana/katakana (gojūon, dakuten/handakuten, yōon), romaji (Hepburn), regroupement par lignes (a, ka, sa…), typée et statique dans `src/data/`. Onglet *Tableau* affichant la grille.
2. **Quiz (stages)** — apprentissage par étapes (ligne par ligne, puis mélange). Types de questions : kana → romaji, romaji → kana, QCM et saisie. Onglet *Apprendre*.
3. **Mode auto / répétition espacée** — algorithme SRS (type SM-2 ou FSRS simplifié) par kana, file de révision quotidienne, persistance Dexie.
4. **Écriture guidée** — tracé au doigt sur canvas, ordre et direction des traits (données de tracés embarquées, ex. KanjiVG sous licence CC BY-SA), validation tolérante. Onglet *Écriture*.
5. **Audio** — prononciation de chaque kana, fichiers audio embarqués et précachés (pas de TTS en ligne).
6. **Stats & profils** — taux de réussite, kana difficiles, séries, historique ; plusieurs profils locaux. Onglet *Stats*.
7. **PWA/offline & déploiement** — icônes PNG (192/512, maskable), écran de démarrage, vérification hors ligne complète, export/import des données (JSON), déploiement statique (GitHub Pages ou équivalent).

## État actuel

- Étape 0 : projet initialisé, navigation par onglets, thème clair/sombre/système, PWA de base.
- Étape 1 terminée : `src/data/kana.ts` (104 hiragana, 104 katakana + 24 katakana étendus), tests de cohérence, onglet Tableau (grille gojūon, bascule hiragana/katakana, vue détaillée `/table/:kanaId` avec précédent/suivant et swipe).
- Étape 2 terminée : quiz en 6 stages (onglet Apprendre, `/learn/quiz`), mode manuel par groupes cochés + listes personnalisées (Dexie `customGroups`, `/learn/custom/:id`), options réessai / afficher la réponse / chrono, réponses enregistrées dans Dexie `answers`. Stage 5 dépend d'une voix japonaise sur l'appareil en attendant l'étape 5.
- Étape 4 (écriture guidée) en place : onglet Écriture (grille gojūon/dakuten/handakuten), `/writing/:kanaId` avec 3 niveaux (1 animation de l'ordre des traits, 2 calque, 3 de mémoire), validation trait par trait, écran À propos. Pas encore de persistance des résultats d'écriture.

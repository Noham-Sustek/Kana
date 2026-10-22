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
  data/        données statiques : kana.ts (kana + groupes), tests *.test.ts à côté
  features/    (à venir) logique métier par domaine : quiz, srs, writing, audio
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

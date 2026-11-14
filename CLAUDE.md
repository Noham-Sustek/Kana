# Kana — PWA d'apprentissage des hiragana & katakana

Application personnelle pour apprendre les kana japonais (hiragana + katakana).
Cible principale : **Android, Samsung S24** : PWA installée depuis Chrome, ou application Android (APK Capacitor, `fr.kana.app`) construite à partir du même code.

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
| Android | Capacitor 8 (`capacitor.config.json`, projet `android/`) : le build web embarqué dans une WebView |
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
npm run build:android  # build web en mode android (sans service worker) + cap sync android
npm run book       # régénère src/data/book.json (銀河鉄道の夜, Aozora Bunko) avec scripts/book-review.json
```

Tester sur le S24 : `npm run dev -- --host` puis ouvrir l'IP locale depuis le téléphone (le SW n'est actif qu'en HTTPS ou localhost — pour tester l'installation, passer par `preview` + tunnel ou le déploiement).

## Structure

```
src/
  app/         App.tsx (routes), tabs.ts (définition des onglets)
  components/  composants UI partagés (AppLayout, BottomTabBar, Icon, PageHeader…)
  pages/       une page par onglet : Home, Learn (S'entraîner), Kana, Stats (Progrès) (+ Settings, Quiz, Chrono, détails…)
  stores/      stores Zustand (un fichier par domaine : settingsStore.ts, profileStore.ts…)
  db/          base Dexie (db.ts) — schéma versionné ; un fichier d'accès par domaine (answers, profiles, backup…)
  engine/      scheduler.ts : planificateur du mode auto (répétition espacée, pur)
  lib/         hooks et utilitaires génériques
  data/        données statiques : kana.ts (kana + groupes), words.ts (~1800 mots écrits à la main + dictWords.json,
               généré : 6500 mots au total), sentences.ts (phrases), confusables.ts,
               strokes.json (généré, tracés KanjiVG) + strokes.ts (accès typé),
               book.json (généré, 銀河鉄道の夜 en kana + traduction) + book.ts
  features/    logique métier par domaine (quiz/, learn/, home/, kana/, chrono/, writing/, stats/, backup/)
scripts/       build-icons.mjs : icônes piste « A · La case » (case, repères en croix, coin indigo, あ) en clair et sombre :
               PWA (192/512, maskable, apple-touch, icon.svg), favicon (svg qui suit le thème, .ico, 32 px) et Android
               (mipmap, adaptative + monochrome, fonds) — `npm run icons`. Rendu par @resvg/resvg-js (dév.).
               Le あ = tracé de Klee One SemiBold figé dans icon-glyph.json (aucune police chargée). Sous 40 px :
               ni repères ni coin, cadre de 3.
               build-strokes.mjs : télécharge les SVG KanjiVG des kana (cache scripts/.cache, ignoré par git)
               et régénère src/data/strokes.json — `npm run strokes` (`-- --refresh` pour retélécharger)
               build-words.mjs : télécharge la base SQLite du dictionnaire Jiyomi (JMdict + français, release figée
               `dico-60`, cache scripts/.cache) et régénère src/data/dictWords.json — `npm run words`
               build-book.mjs : télécharge 銀河鉄道の夜 (Aozora Bunko, fiche 456, cache scripts/.cache), lit les kanji
               (furigana, sinon kuromoji, dépendance de dev), découpe en mots et régénère src/data/book.json — `npm run book`
public/        assets statiques (icônes générées)
android/       projet Android Capacitor (généré par `cap add android`, puis ajusté : icônes, écran de démarrage,
               signature, aucune permission). `app/src/main/assets/public` = copie du build, ignorée par git.
scripts/build-apk.sh  APK (Linux / WSL) : signé si KANA_KEYSTORE + KANA_KEYSTORE_PASSWORD, sinon debug
docs/design/   design system de la refonte UI (direction « Papier et encre ») : README.md (voix, vocabulaire, couleur,
               typographie), navigation.md, animations.md, tokens.json / tokens.css, components/bundle.css,
               components/*/README.md et preview.html (maquettes, à ouvrir dans un navigateur), fonts/ et licenses/ (OFL).
               Référence à lire avant tout travail d'UI ; hors du build.
.github/       workflows/deploy.yml : tests + build + GitHub Pages à chaque push sur main ;
               workflows/android.yml : APK à chaque push sur main (signé avec les secrets KANA_KEYSTORE_BASE64 /
               KANA_KEYSTORE_PASSWORD, publié dans la release « android » du dépôt ; sinon debug en artefact)
```

Alias d'import : `@/` → `src/`. Toujours l'utiliser plutôt que des chemins relatifs `../`.

## Conventions

- **Langue** : interface en français. Code (identifiants, noms de fichiers) en anglais. Commentaires en français, rares, uniquement pour le *pourquoi*.
- **Composants** : fonctions nommées exportées (`export function Foo()`), pas d'export default. Un composant par fichier, nom de fichier = nom du composant.
- **TypeScript** : `strict` + `noUncheckedIndexedAccess`. Pas de `any`. Imports de types avec `import type`.
- **Styles** : classes Tailwind uniquement, pas de CSS module. Design system dans `docs/design/` (direction « Papier et encre ») : le lire avant tout travail d'UI.
  - **Couleurs = jetons** (`index.css` : variables `--k-*` redéfinies sous `.dark`, exposées par `@theme inline`) : `paper` (fond), `paper-raised` (cartes, cases, champs), `ink` / `ink-muted` (texte), `hairline` (filets décoratifs), `control` (contour d'un contrôle interactif), `accent` (indigo, une seule chose par écran : action principale ou « acquis ») + `on-accent` / `accent-tint`, `correct` / `error` (+ `-ink`, `-tint`, `on-signal`), `gold` (records et déblocage seulement), `heat-1..3` / `on-heat-3`, `scrim`. Ils suivent le thème : **pas de variante `dark:`** pour eux, et plus de `slate-*`, `white` ni couleurs Tailwind brutes. Le canvas de `WritingPad` reprend les valeurs en dur (à garder synchronisées).
  - **Polices embarquées** (`src/assets/fonts/`, licences OFL dans `public/licenses/` et À propos) : `font-sans` = Figtree (interface), `font-serif` = Newsreader (consignes, chiffres clés, romaji des réponses), `font-jp` = Klee One réduite aux kana (formes du manuel ; les kanji retombent sur la police système). Tout texte japonais : `font-jp`. Style Wii : M PLUS Rounded 1c (latin, 500/700/800) remplace `font-sans` et `font-serif`.
  - **Composants du design system** (`src/components/`, un fichier chacun, doc dans `docs/design/components/*/README.md`) : `Button` (primary / ink / line / text / quiet), `IconButton`, `Choice`, `SegmentedControl`, `Switch`, `Chip`, `KanaTile`, `SessionProgress`, `ProgressBar`, `TimerBar`, `MasterySteps`, `WeekStrip`, `TextField`, `WordTile`, `Feedback` + `SignalBadge` (coche / croix / œil : la couleur n'est jamais le seul signal), `Banner`, `EmptyState`, `Sheet` et `Dialog` (`<dialog>` natif via `useModalDialog` : voile, focus, Échap et Retour Android). Les utiliser plutôt que des classes répétées ; jamais de `window.confirm` (→ `Dialog`, action irréversible en encre, pas en rouge). Galerie : `#/dev/composants` (serveur de dev seulement, absente du build).
  - **Mouvement et haptique** (`docs/design/animations.md`) : classes `animate-pop`, `animate-shake`, `animate-rise`, `animate-badge-in`, `animate-unlock`, `animate-sheet-in`, `animate-dialog-in` (`index.css`, fondu de 100 ms en mouvement réduit). Vibrations par `haptic(kind)` (`lib/haptic.ts`, motifs `HAPTIC`), qui respecte le réglage `vibrations` de `settingsStore` ; rien ne doit en dépendre (pas de vibreur sur iPhone).
  - **Forme** : rayons courts (`rounded-sm` cases, `rounded-md` boutons et cartes, `rounded-2xl` feuilles modales seulement), séparation par filets `border-hairline`, pas d'ombre. Sur une case de kana, tout repère (coche, cadenas, coin) va dans un coin **bas** (en haut à droite, il se lirait comme un dakuten ゛ / handakuten ゜).
- **Thème** : réglage `light | dark | system` dans `settingsStore`, appliqué via la classe `.dark` sur `<html>` (`useApplyTheme`). Un script inline dans `index.html` l'applique avant le premier rendu — garder la clé `kana-settings` synchronisée.
- **Style d'interface** (Réglages → Apparence → Style) : `settingsStore.ui` = `papier` (« Papier et encre », défaut) | `wii` (rond, brillant, flottant, d'après le canevas « Kana — UI style Wii / 3DS »), appliqué par l'attribut `data-ui` sur `<html>` (`useApplyTheme` + script inline). Un style = une feuille hors `@layer` (`src/styles/skin-wii.css`, importée par `index.css`) qui redéfinit les jetons `--k-*`, polices (M PLUS Rounded 1c, embarquée, OFL), rayons (`--radius-*`), puis habille les composants par leurs classes d'accroche `k-*` (`k-btn k-btn--<variante>`, `k-card`, `k-choice--<état>`, `k-tile--<variante>`, `k-seg`, `k-switch`, `k-chip`, `k-bar`, `k-tick`, `k-feedback`, `k-word`, `k-field`, `k-banner`, `k-sheet`, `k-dialog`, `k-prompt`, `k-tabbar` / `k-rail` / `k-tab` / `k-tab__icon`) : les écrans ne changent pas. Garder ces classes en modifiant un composant. Mouvement Wii : flottement au repos (propriété `translate`), appui qui s'enfonce (`transform`) et rebond, entrées élastiques ; tout coupé en mouvement réduit. Variante sombre propre (nuit bleutée). La règle « pas de panneau Juste » vaut aussi en Wii.
- **Persistance** :
  - Préférences d'UI légères → Zustand `persist` (localStorage).
  - Données d'apprentissage (progression, révisions SRS, historique, profils) → **Dexie/IndexedDB**. Toute modification de schéma = nouveau `db.version(n)` avec migration ; ne jamais modifier une version existante.
  - **Profils** (Dexie v4) : toute donnée d'apprentissage porte un `profileId` et toute requête filtre dessus (index composés `[profileId+…]`). Profil actif = `profileStore` (localStorage `kana-profile`) ; `activeProfileId()` hors composants. Profil par défaut id 1 « Moi » (créé par `populate` ou par la migration v4).
  - **Sauvegarde** (`features/backup/`) : format JSON `kana-backup` versionné, validé par `parseBackup` ; l'import remplace tout. Nouvelle table ou nouveau champ → l'ajouter à l'export/import et à la validation ; nouvelle clé localStorage → `PREFERENCE_KEYS`.
- **Logique métier** isolée dans `features/` en fonctions pures testables, séparée des composants. Les stores orchestrent, les composants affichent.
- **Accueil** (`features/home/`) : `home.ts` pur et testé (série + semaine, parcours en cases avec la phrase « Ligne た : 4 kana acquis sur 5. Encore un et la ligne な s’ouvre. », bouton Première session / Session du jour / Encore une session, rappel de sauvegarde), `useHome` lit Dexie. À consolider = `mostMissed`. Rappel de sauvegarde : seulement une fois la session du jour faite, après 30 jours sans export (`settingsStore.lastBackupAt`, renseigné par `lib/backupFile.ts`), masquable 7 jours.
- **Navigation** (`docs/design/navigation.md`) : 4 onglets (`app/tabs.ts`) — Accueil `/home` (Session du jour en un geste, `useStartDailySession`), S'entraîner `/learn` (cartes d'action → Session libre `/learn/libre`, Révision ciblée, Lecture chronométrée, Écriture enchaînée, Mes listes `/learn/custom/:id`), Kana `/kana` (une grille, lentilles Lecture — réussite récente, toujours colorée — → fiche `/kana/:id`, et Écriture — carré vide = calque réussi, plein = de mémoire, bouton « Tracer la ligne … » — → `/writing/:id`), Progrès `/progress`. Réglages (`/settings`) n'est plus un onglet : icône dans l'en-tête des onglets (`AppHeader`), avec le sceau du profil actif qui ouvre la feuille « Qui apprend ? » (`ProfileSheet`). Plein écran sans onglets : `/learn/quiz`, `/learn/reading`, `/bienvenue`. ≥ 840 px : rail vertical à gauche (sceau du profil en haut, Réglages en bas ; `AppHeader` masqué), Accueil en deux colonnes (parcours et À consolider à gauche, série et action du jour à droite). Anciennes adresses (`/table`, `/table/:id`, `/writing`, `/stats`) redirigées en gardant les paramètres. Le quiz revient à l'écran qui l'a lancé (`state.from` de la navigation, `/learn` par défaut).
- **Mobile** : cibles tactiles ≥ 44 px, respecter `env(safe-area-inset-*)`, pas d'interaction au survol uniquement.
- **Dépendances** : en ajouter le moins possible ; aucune qui charge des ressources distantes.
- **Données kana** (`src/data/kana.ts`) : ids stables `h-<clé>` / `k-<clé>` (persistés en base, ne jamais les renommer). `romaji[0]` = forme Hepburn affichée, les suivants = variantes acceptées. Les groupes katakana sont dérivés des hiragana (seuls les étendus sont écrits en katakana). Homophones Hepburn assumés : じ/ぢ (ji), ず/づ (zu), ヲ/ウォ (wo) — un quiz romaji → kana doit en tenir compte.
- **Quiz** (`features/quiz/`) — 9 stages : 1 kana→romaji (4 choix), 2 romaji→kana, 3 kana→romaji (8 proches), 4 saisie, 5 dessiner le kana, 6 lire un mot, 7 dessiner un mot, 8 lire une phrase, 9 composer une phrase (romaji → étiquettes en kana). Pas d'audio (retiré). Les numéros sont persistés (`answers.stage`) : en insérer ou en retirer un = migration Dexie + `BACKUP_VERSION` + migration du store de réglages (historique et `migrateStage` dans `stages.ts`).
  - Écran de question (`QuizPage`, docs/design « Écrans de question ») : nom, famille (Reconnaître / Écrire / Lire) et consigne de chaque stage dans `stages.ts` (`stagePresentation` : nom, famille, description du choix d'exercice, consigne ; `stageKindLabel`). Retour = `Feedback` dont le contenu vient de `feedback.ts` (pur : « Pas encore » + ce que vaut la réponse choisie, « La réponse : … » + kana proches ; rien pour une bonne réponse, que la zone de réponse signale seule par le vert et la coche). **Règle : la traduction d'un mot ou d'une phrase (kanji, sens, provenance, réplique d'origine) n'apparaît qu'une fois la réponse fixée (ou le dessin terminé), sous le texte en romaji / japonais : c'est la récompense de complétion. Jamais avant, et pas répétée dans le `Feedback`.** Quitter après une réponse passe par un `Dialog`. Vibrations déclenchées par `quizSessionStore` (juste, faux à chaque essai, chrono écoulé, ligne débloquée).
  - Fin de session (`pages/QuizSummary.tsx`, logique pure dans `summary.ts`) : ligne débloquée d'abord (`UnlockCelebration`, or), puis récapitulatif : justes du premier coup, segments, durée / temps par réponse / série (+1 si première session du jour), maîtrise gagnée par carte (kana, stage) — niveaux `masteryLevel` du planificateur (Nouveau = jamais répondu, En cours, Acquis = maîtrisé, Solide = maîtrisé avec un intervalle ≥ 7 jours) —, À revoir (réponse donnée au premier essai, `Outcome.given`), Et maintenant (tracer les kana ratés, encore une session), Terminer. `SessionState.startedAt` / `finishedAt` pour la durée.
  - `questions.ts` génère les questions (pures, `Rng` injectable pour des tests déterministes) ; un distracteur ne doit jamais être une bonne réponse possible (pas de romaji partagé, cf. homophones).
  - `reading.ts` vérifie une saisie romaji (kana seul ou mot) : toutes les variantes, っ = consonne doublée (っち → tchi/cchi), ー = voyelle répétée ou `-`. Les mots se lisent kana par kana (とうきょう → toukyou).
  - `session.ts` = machine à états pure (pending → correct/failed). Le résultat est fixé au **premier essai** : une réussite après réessai reste un échec ; « Afficher la réponse » et chrono écoulé = échec `revealed`.
  - Mode auto (`startAuto`), deux usages : Session du jour = parcours guidé par écriture (groupes débloqués quand 80 % des kana actifs sont maîtrisés au stage 1) ; Révision ciblée (S'entraîner) = `kanaIds` des kana à revoir (`reviewSelection` : une carte pas encore acquise ou arrivée à échéance), même planificateur sans déblocage (`createSelectionContext`).
  - S'entraîner (`features/learn/learn.ts`, pur et testé ; `useLearnHub`) : résumés des cartes et de la Session libre (`freeSessionLine`, `kanaSummary`, `optionsSummary`, `startDetail`, `unavailableReason`), options montrées seulement si elles s'appliquent (`applicableOptions` : validation du tracé aux stages 5 et 7, phrases aux stages 8 et 9). Session libre (`pages/FreeSessionPage.tsx`) : exercice dans une feuille par famille, kana (Hiragana / Katakana / Mes listes, `pickerScript`), options repliées ; derniers réglages gardés dans `quizSettingsStore` (`stage`, `groupIds`, `customGroupIds`…).
  - Table Dexie `answers` : une ligne par kana évalué (mots et phrases : une ligne par kana distinct, `wordId` pour les mots).
  - Phrases (`data/sentences.ts`) : mots et particules séparés par des espaces ; は / へ / を isolés se lisent wa / e / o (`reading.ts`, lecture du kana aussi acceptée). Les phrases tout hiragana existent aussi converties en katakana (`toKatakana`) ; celles avec des mots empruntés forment la série « mixte ». Session libre, stages 8 et 9 : écriture des phrases `sentenceFilter` (toutes / hiragana / katakana / mixte), et `animeSentences` qui ajoute les répliques de Dragon Ball (`sentencesForPool(pool, filter, anime)`).
  - Phrases d'anime (`data/animeSentences.ts`) : répliques de Dragon Ball (liste du dépôt Dokkan, `Text/_iconiques.tsv`) réécrites en kana lisibles (kanji et chiffres en kana, sans ponctuation, longues répliques découpées) ; `original` (texte d'origine, montré après la réponse) et `scene`. Ajoutées aux phrases quels que soient les kana cochés ; jamais en mode auto.
  - Stage 9 (`kind: 'compose'`, `ComposeAnswer`) : une étiquette par mot de la phrase + 2 à 4 intrus (`tileDistractors` : un kana remplacé par un kana proche, jamais un mot juste ni une variante de même romaji, cf. ず/づ). Vérifié dès que la phrase est complète ; toucher une étiquette posée la retire. Absent du mode auto (`AUTO_STAGES` = 1 à 8).
  - Dessin (stages 5 et 7, `kind: 'draw'`) : `QuizDrawing` (chargé en différé), un `WritingPad` libre par caractère ; petits kana dessinés en grand, ー synthétisé (`drawingStrokesOf`). Juste = aucune erreur de trait ni indice sur tous les caractères (`session.submitDrawing`), puis comparaison tracé / modèle. Le romaji d'un mot à dessiner note ー par un macron (kōhī). Réglage « Validation du dessin » (`drawingCheck`, transmis dans `QuizOptions`) : `auto` (ci-dessus) ou `self` : `WritingPad validate={false}` (dessin libre, Effacer / Annuler / Terminé), comparaison au modèle puis boutons « À revoir » / « C’est juste » qui fixent le résultat et passent à la suite.
  - Rouge (`error`) = erreur, vert (`correct`) = correct, identiques dans les deux thèmes (texte : `error-ink` / `correct-ink`) ; ne pas utiliser l'accent pour un bouton affiché à côté d'une erreur.
- **Mots** (`data/words.ts`) : liste manuelle `RAW` (prioritaire) + `dictWords.json` généré par `npm run words` (mots courants de Jiyomi/JMdict, CC BY-SA 4.0, attribution dans `/settings/about` — à conserver). Ne pas éditer `dictWords.json` à la main : ajuster les filtres ou les cibles (`TARGET`) du script. L'id d'un mot est son kana (persisté dans `answers.wordId`). Kanji usuel (`Word.kanji`, montré après la réponse aux stages 6 et 7) : celui de l'entrée JMdict pour les mots générés, rapproché par la traduction pour la liste manuelle (`manualKanji`, corrections dans `KANJI_OVERRIDES`) ; jamais pour un mot habituellement écrit en kana, un mot en katakana ou un sens ambigu.
- **Livre** (`data/book.ts`, `book.json`) : 銀河鉄道の夜 de Kenji Miyazawa (domaine public, Aozora Bunko, attribution dans `/settings/about`). Ne pas éditer `book.json` : corriger dans `scripts/book-review.json` (phrase d'origine → `fr`, `kana` corrigé facultatif, `exclude` pour un passage lacunaire) ou dans `WORD_FIXES` / `SUBSTITUTIONS` du script, puis `npm run book`. Mêmes règles d'écriture que les phrases : particules séparées, は / へ / を isolés seulement comme particules, っ jamais en fin de mot, petits ぁ / ぃ remplacés. Phrases de 2 à 12 mots mêlées aux phrases des stages 8 et 9 (`BOOK_QUIZ_SENTENCES`, id `book:…`, aussi en katakana), provenance « titre · chapitre ».
- **Premier lancement** (`pages/OnboardingPage.tsx`, `/bienvenue`, `app/OnboardingGate.tsx`) : 4 écrans (bienvenue + « J’ai une sauvegarde à importer », écriture de départ → `autoScript`, principe du parcours, prénom → renomme le profil actif, puis Première session ou l'accueil), « Passer » partout. Indicateur `settingsStore.onboarded` (store v2 : réglages déjà enregistrés = déjà vu) ; une base avec des réponses le pose aussi.
- **Réglages** (`pages/SettingsPage.tsx`) : Apparence (thème, Vibrations), Profils (`ProfileSettings` : série de chaque profil `useProfileStreaks`, feuille Renommer / Passer à ce profil / Supprimer), Sauvegarde (`BackupSettings` : `lastExportLine`, `ImportBackupButton` partagé avec le premier lancement, confirmation `importWarning`), Application (« Installer sur l’écran d’accueil » via `beforeinstallprompt` capté tôt par `lib/installPrompt.ts`, seulement s'il est disponible ; À propos).
- **Lecture chronométrée** (`features/chrono/`, page `/learn/reading`, chargée en différé) : le livre défile mot par mot depuis un début de paragraphe tiré au sort ; espace (ou Entrée) valide le mot (`matchesWord` : particule lue wa / e / o), faux = on le retape, « Passer le mot » montre la lecture. Durée 1/2/3/5 min, chrono lancé à la première touche ; écriture hiragana (katakana d'origine gardés) ou tout katakana. Score = kana/min des mots justes ; records par profil dans `chronoSettingsStore` (localStorage `kana-chrono-settings`, dans `PREFERENCE_KEYS`). Écrans (`pages/ChronoPage.tsx`) : réglage (record, durée, écriture, 3 étapes), partie (mot en cours encadré à l'encre, allure en kana/min), résultat (« Nouveau record · N auparavant » en or, records par durée, phrases lues avec leur traduction).
- **Fiche kana** (`pages/KanaDetailPage.tsx`, logique dans `features/kana/detail.ts`, données `useKanaProgress`) : ordre des traits animé (`KanaStrokeCase`, chargé en différé : les tracés restent hors du bundle principal), lecture, Rejouer / autre écriture, « S'entraîner à l'écrire », vos résultats (réussite, temps moyen, réponses, maîtrise par famille `familyMastery`), kana proches (`confusablesOf`), mots qui contiennent le kana (`wordsWithKana`). Précédent / suivant dans l'ordre du tableau, swipe et flèches du clavier.
- **Écriture** (`features/writing/`) :
  - Résultats (Dexie v8, table `writingResults` : `kanaId`, `level` 2 | 3, `success`, `mistakes`, `hinted`, `revealed`, `at`), un par tracé terminé ; dans la sauvegarde (v4) et supprimés avec le profil. `progress.ts` (pur) : `writingLevels` (calque réussi = 1 ; de mémoire réussi, ou stage 5 juste du premier coup au quiz = 2), `isWritingSuccess` (de mémoire : sans indice ni modèle), `nextLineToTrace`, `strokeNote`.
  - Page d'exercice (`WritingExercisePage`) : niveaux 1 · Observer (animation complète ou trait par trait), 2 · Calque, 3 · De mémoire (le kana est caché dans l'en-tête jusqu'à la fin, puis comparaison et note par trait). Après un tracé : `Feedback`, Refaire / De mémoire ou Suivant.
  - Tracés KanjiVG (CC BY-SA 3.0, attribution dans `/settings/about` — à conserver) : repère carré de 109 unités, traits dans l'ordre, points à pas ~2. Ne jamais éditer `strokes.json` à la main.
  - `strokeMatch.ts` compare des points rééchantillonnés (32) : forme (écart moyen après recentrage), position (écart des centres), sens (endroit vs envers, ignoré pour les traits < 14 unités), ordre (le trait correspond à un trait suivant). Modes `trace` (niveau 2, strict) et `free` (niveau 3, tolère décalage et échelle ×1,4). `session.ts` = machine à états pure, indice après 2 erreurs sur un trait.
  - `WritingPad` : le canvas ne porte que l'encre en cours / le trait refusé ; modèle, traits validés et indices sont dans un SVG dessous. Niveau 2 (calque) : un trait validé est remplacé par celui du modèle. Niveau 3 (libre) : pas de « magnétisme », le trait reste tel que dessiné ; à la fin (ou bouton « Comparer ») `WritingComparison` affiche tracé et modèle côte à côte. Cadre en encre, outils Effacer / Annuler (retire le dernier trait validé, `undoStroke`) / Indice / Comparer, indice en `accent`. Pointer events + `touch-none` (pas de scroll pendant le tracé), un seul doigt actif, `getCoalescedEvents`.
  - Seuls les kana d'un caractère sont exercés (pas les yōon/combinaisons).
  - La page d'exercice est chargée en différé (`lazy`) pour sortir les tracés du bundle principal.
- **Progrès** (`pages/ProgressPage.tsx`, `features/stats/progress.ts` : période 7 / 30 jours / tout, kana acquis par écriture et par famille, bulle d'activité) : série, réussite, temps moyen, activité 14 jours (barre touchée = détail, « Voir en tableau »), kana acquis, les plus ratés (« En faire une liste »), lecture et écriture.
- **Stats** (`features/stats/`) : fonctions pures sur l'historique `answers` du profil (`now` injecté, jours locaux). Une question = un horodatage (`questionsOf`, le stage 6 écrit une ligne par kana). Heatmap = réussite sur les 10 dernières réponses du kana ; rampe d'une seule teinte (`heat-1`, `heat-2`, `heat-3`, `accent`, cf. `HEAT_CLASSES`), jamais rouge / vert.
- **Application Android** (Capacitor) : `vite build --mode android` désactive `vite-plugin-pwa` (fichiers déjà locaux), `cap sync` les copie dans l'APK, servis par la WebView sans réseau. Le manifeste n'a **aucune permission** (pas même INTERNET) et la sauvegarde automatique Android est coupée (`allowBackup="false"`, `data_extraction_rules.xml`) : les données restent sur l'appareil. Données distinctes de celles de la PWA (autre origine) : passer par Exporter / Importer. Code natif seulement derrière `Capacitor.isNativePlatform()` : export dans Documents/Kana (`@capacitor/filesystem`) et partage (`@capacitor/share`) dans `lib/backupFile.ts`, style de la barre d'état suivant le thème (`SystemBars`, `useApplyTheme`). Plein écran bord à bord (`SystemBars.insetsHandling: native`) : les `env(safe-area-inset-*)` restent la seule source des marges. Icônes Android générées par `npm run icons` (icône claire dans les deux thèmes ; fond de l'écran de démarrage noir en thème sombre). Plein écran immersif (`MainActivity` : barres système masquées, réapparaissent au glissement). Permission VIBRATE seulement, pour `navigator.vibrate` dans la WebView. `versionCode` = `KANA_VERSION_CODE` (CI : numéro de run × 10). Clé de signature hors du dépôt : la perdre empêche toute mise à jour par-dessus l'application installée.
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
- Étape 4 (écriture guidée) en place : onglet Écriture, `/writing/:kanaId` avec 3 niveaux, validation trait par trait, écran À propos. Résultats d'écriture enregistrés (Dexie v8) et montrés dans la lentille Écriture.
- Étape 5 abandonnée : l'audio (synthèse vocale, stage Écouter) a été retiré.
- Étape 6 terminée : profils (Réglages → Profils, pastilles sur Stats), onglet Stats (série, réussite, temps moyen, activité 14 j, kana les plus ratés, heatmap), heatmap optionnelle sur le Tableau (`?heat=1`).
- Livre : 銀河鉄道の夜 relu et traduit (1 153 phrases), mêlé aux stages 8 et 9, lecture chronométrée.
- Étape 7 terminée : icônes PNG + maskable, manifeste complet, précache cache-first vérifié hors ligne, export/import JSON (Réglages → Sauvegarde), déploiement GitHub Pages par GitHub Actions.

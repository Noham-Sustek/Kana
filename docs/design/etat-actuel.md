# État actuel (extrait du code)

Relevé de l'interface existante, `noham-sustek/kana` à `c738d78`. Il sert d'inventaire : tout ce qui est listé ici doit avoir un équivalent dans le nouveau système.

## Jetons en place

Déclarés dans `src/index.css` (`@theme`), le reste vient de la palette Tailwind par défaut.

| Jeton | Valeur | Usage relevé |
|---|---|---|
| `--color-accent-50` | `oklch(0.969 0.015 12.4)` | Fond de sélection clair |
| `--color-accent-500` | `oklch(0.645 0.246 16.4)` | Bouton principal, puce cochée, interrupteur, onglet actif (sombre) |
| `--color-accent-600` | `oklch(0.586 0.253 17.6)` | Bouton pressé, onglet actif (clair) |
| `--font-sans` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Toute l'interface |
| `--font-jp` | `'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif` | Kana (aucun fichier embarqué : police système) |

- **Neutres** : échelle `slate` (fond `slate-50` / `slate-950`, cartes `white` / `slate-900`, texte secondaire `slate-500` / `slate-400`, contours `slate-200`–`300` / `slate-700`).
- **Sémantique** : `red-600` = erreur, `emerald-600` = correct, identiques dans les deux thèmes ; `amber` pour les avertissements.
- **Heatmap** : jamais vu `slate-100` / `slate-800`, < 50 % `red-600`, 50–75 % `orange-500`, 75–90 % `amber-400`, ≥ 90 % `emerald-600`.
- **Rayons** : `rounded-xl` (12 px) pour les contrôles, `rounded-2xl` (16 px) pour les cartes, `rounded-full` pour les pastilles.
- **Ombres** : `shadow-sm` sur les cartes et l'option active d'un contrôle segmenté.
- **Texte** : `text-sm` (14 px) et `text-xs` (12 px) dominent ; kana de `text-5xl` à `text-9xl`.
- **Animations** : `stroke-draw` (tracé progressif d'un trait), `fade-in`, `timer-shrink` (barre de chrono).

## Constats

- L'accent (teinte 16°, rose-rouge) est à 10° du rouge d'erreur `red-600` : un champ en attente et un champ en erreur se ressemblent.
- La heatmap oppose rouge et vert par la teinte seule.
- Aucune police japonaise n'est embarquée : la forme des kana dépend de l'appareil.

## Composants à reprendre

`AppLayout`, `BottomTabBar`, `PageHeader`, `Icon` (21 tracés), `SegmentedControl`, `Switch`, `ScriptToggle`, `KanaGrid`, `StrokeCell`, `KanaGuideLines`, `KanaNavButton`, `HeatmapLegend`, `ProfileSwitcher`, `ProfileSettings`, `BackupSettings`, `Placeholder` (état vide), `StrokeOrderAnimation`, `WritingPad`, `WritingComparison`, `WordComparison`, `QuizDrawing`.

Pas de composant dédié aujourd'hui (classes répétées dans les pages) : bouton, puce de sélection, carte, barre de progression, champ de saisie, étiquette de mot, feuille modale, dialogue, bandeau.

## Écrans

`LearnPage`, `QuizPage`, `ChronoPage`, `CustomGroupPage`, `TablePage`, `KanaDetailPage`, `WritingPage`, `WritingExercisePage`, `StatsPage`, `SettingsPage`, `AboutPage`.

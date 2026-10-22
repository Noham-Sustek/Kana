# Kana — hiragana & katakana

Application web progressive (PWA) pour apprendre à lire et écrire les **hiragana** et **katakana**.
Pensée pour le téléphone (Android, Samsung Galaxy S24), elle s'installe sur l'écran d'accueil et
fonctionne **100 % hors ligne**, **sans compte, sans pub, sans tracking** : tout reste sur l'appareil.

**En ligne :** https://noham-sustek.github.io/Kana/

## Fonctionnalités

- **Tableau** des 104 hiragana, 104 katakana et 24 katakana étendus (gojūon, dakuten, handakuten, yōon),
  vue détaillée avec prononciation, heatmap de réussite en option.
- **Quiz en 6 stages** : reconnaître (kana → romaji), retrouver (romaji → kana), discerner (8 choix
  proches), taper au clavier, écouter (son → kana), lire des mots (~250).
  - **Mode auto** : répétition espacée par kana et par stage, nouveaux groupes débloqués au fil de la maîtrise.
  - **Mode manuel** : groupes au choix, listes personnalisées, chrono, réessai.
- **Écriture guidée** au doigt : animation de l'ordre des traits, calque, puis de mémoire, validation trait
  par trait (tracés KanjiVG).
- **Audio** : prononciation par la synthèse vocale du téléphone (voix japonaise, hors ligne).
- **Stats** : série de jours consécutifs, taux de réussite, temps moyen de réponse, activité sur 14 jours,
  kana les plus ratés, heatmap par kana.
- **Profils** locaux multiples, chacun avec sa progression.
- **Sauvegarde** : export / import de toute la progression en JSON.
- Thème clair / sombre / système.

## Installer sur un Samsung Galaxy S24 (ou tout Android)

1. Ouvrir **Chrome** et aller sur https://noham-sustek.github.io/Kana/
2. Attendre que la page soit chargée (le temps que tout soit mis en cache pour le hors ligne).
3. Menu **⋮** (en haut à droite) → **Ajouter à l'écran d'accueil** → **Installer**.
   Chrome peut aussi proposer directement une bannière « Installer l'application ».
4. L'icône **あ** apparaît sur l'écran d'accueil / dans le tiroir d'applications. Kana s'ouvre en plein
   écran, sans barre d'adresse, et fonctionne en mode avion.

> Avec **Samsung Internet** : menu **≡** → **Ajouter la page à** → **Écran d'accueil**.

Les mises à jour s'installent automatiquement : à la prochaine ouverture avec du réseau, la nouvelle
version est téléchargée et appliquée.

### Activer le son (stage 5 « Écouter »)

Le son utilise la synthèse vocale d'Android : il faut une **voix japonaise** installée.

1. **Paramètres** → rechercher « synthèse vocale » (Samsung : **Gestion globale** → **Synthèse vocale**).
2. **Moteur préféré** : **Services vocaux Google** (recommandé) ou **Samsung TTS**.
3. Engrenage ⚙ à côté du moteur → **Installer les données vocales** → **Japonais (日本語)** → télécharger.
4. Fermer complètement Kana puis la rouvrir. **Réglages → Audio** indique si la voix est détectée
   (bouton « Tester »).

Une fois téléchargée, la voix fonctionne hors ligne.

### Changer de téléphone

**Réglages → Sauvegarde → Exporter** (ou **Partager…** vers Drive, mail, Quick Share) produit un fichier
`kana-sauvegarde-AAAA-MM-JJ.json`. Sur le nouveau téléphone : **Réglages → Sauvegarde → Importer**
(remplace toutes les données de l'appareil).

## Développement

Prérequis : Node.js 22 (ou ≥ 20.19).

```bash
npm install
npm run dev        # serveur de dev (ajouter -- --host pour tester depuis le téléphone)
npm test           # tests unitaires (Vitest)
npm run build      # vérification TypeScript + build de production dans dist/
npm run preview    # sert dist/ (service worker actif sur localhost)
```

Scripts de génération (résultats commités, à relancer seulement si besoin) :

```bash
npm run strokes    # régénère src/data/strokes.json depuis KanjiVG
npm run icons      # régénère les icônes de public/ à partir du tracé de あ
```

Stack : React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Dexie (IndexedDB), React Router
(HashRouter), vite-plugin-pwa (Workbox). Détails d'architecture et conventions : [CLAUDE.md](CLAUDE.md).

## Déploiement

Chaque push sur `main` lance le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) :
tests, build, puis publication sur GitHub Pages.

À faire une seule fois sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**
(le dépôt doit être public, ou sur un plan qui autorise Pages en privé). Le site est ensuite servi sur
`https://<utilisateur>.github.io/Kana/`. Les chemins sont relatifs et le routage passe par le hash
(`#/learn`…) : aucune configuration serveur n'est nécessaire, n'importe quel hébergeur statique convient.

## Crédits

Tracés et ordre des traits : [KanjiVG](https://kanjivg.tagaini.net), © Ulrich Apel et contributeurs,
licence [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Les données dérivées
(`src/data/strokes.json`, icônes) sont distribuées sous la même licence.

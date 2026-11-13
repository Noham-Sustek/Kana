# Progress

Quatre façons de montrer une avancée.

- **Session** (`k-ticks`) : un segment par question. Fait = `accent`, raté = `ink-muted` entaillé (forme différente, pas seulement teinte), en cours = `ink`. Toujours avec le compteur « 4 / 12 ».
- **Barre** (`k-bar`) : 6 px, pour une proportion (kana acquis sur le total). Toujours avec sa valeur en clair à côté.
- **Chrono** (`k-bar--timer`) : 3 px, `ink`, se vide de droite à gauche. Passe en pointillés sous 3 s ; pas de rouge.
- **Maîtrise** (`k-steps`) : quatre petits carrés, de « Nouveau » à « Solide ». `aria-label` porte le mot.
- **Semaine** (`k-week`) : jours faits pleins, aujourd'hui en pointillés tant que la session n'est pas faite.

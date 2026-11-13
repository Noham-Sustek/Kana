# Mouvement

Démonstration des animations du système ; la spécification complète, haptique comprise, est dans la section *Animations et haptique*.

- Classes `k-anim-ok`, `k-anim-ko`, `k-anim-rise`, `k-anim-unlock`, `k-anim-stroke` (keyframes dans `bundle.css`).
- Avec `prefers-reduced-motion: reduce`, chacune devient un fondu de 100 ms ; l'ordre des traits s'affiche trait par trait sans tracé progressif.

Vous ajoutez la classe au moment de l'événement (réponse, déblocage) ; retirez-la puis remettez-la pour rejouer.

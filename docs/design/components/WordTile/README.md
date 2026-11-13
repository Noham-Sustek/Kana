# WordTile

Étiquette d'un mot en kana, pour composer une phrase.

- Un toucher la pose à la suite dans la phrase ; toucher une étiquette posée la renvoie dans la réserve. Pas de glisser obligatoire.
- La réserve garde l'emplacement d'une étiquette posée (`is-gone`, pointillés) : rien ne saute.
- Bord inférieur de 3 px : l'étiquette se lit comme un objet qu'on prend. Soulevée : 3 px vers le haut, rotation de 2°.
- Vérification dès que la phrase est complète : juste = contour `correct`, fausse = contour `error` + pastille à croix sur les étiquettes en cause.
- 48 px de haut, kana en 22 px.

Vous fournissez le mot et l'état.

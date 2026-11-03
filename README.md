# Habille-moi

Application web qui propose la tenue du jour selon votre garde-robe, la météo et votre programme.

- Garde-robe : photo ou galerie, reconnaissance du type dans le navigateur, correction manuelle.
- Météo en direct avec Open-Meteo, par position ou par ville.
- Proposition de tenue selon des règles simples (température, pluie, programme).
- Les données restent sur l'appareil (stockage local du navigateur).

Page principale : `index.html`. Aucune installation nécessaire.

## Comment la tenue est choisie

- **Chaleur** : chaque vêtement a une valeur d'isolation en clo (table ANSI/ASHRAE 55). L'appli vise l'isolation nécessaire pour une marche active à la température ressentie. Le manteau n'est pas dans la table : sa valeur est estimée.
- **Température ressentie** : formule de Steadman (Bureau of Meteorology australien) avec vent et humidité d'Open-Meteo.
- **Couleurs** : base neutre, une seule couleur d'accent, pas de noir avec du marron, pas plus de deux couleurs vives.
- **Autres critères** : pluie, vent, formalité du programme, rotation (rien de ce qui a été porté hier ou avant-hier).

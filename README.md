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

## Reconnaissance et apprentissage

- Environ 50 types de vêtements (maillot de sport, jogging, polo, blazer, doudoune...), chacun avec une formalité (sport, décontracté, soigné, habillé), une chaleur et une isolation (catalogue.js).
- Au bureau, jamais de pièce de sport ; en réunion ou en cérémonie, rien de décontracté.
- La photo est comparée à plusieurs formulations par type ; les 3 types les plus probables sont proposés. Quand le doute est grand, le vêtement est marqué « à vérifier ».
- Chaque vêtement confirmé ou corrigé garde les scores de sa photo : les photos suivantes qui lui ressemblent reçoivent un bonus pour ce type.
- Un compteur de précision (onglet Plus) mesure les types justes du premier coup.

## Détourage des photos

- Niveau 1 (par défaut) : si le fond est uni, il est repéré depuis les bords de l'image et remplacé par un blanc cassé. Si le fond est chargé ou trop proche du vêtement, la photo d'origine est gardée.
- Niveau 2 (option, onglet Plus) : modèle RMBG-1.4 chargé dans le navigateur. Son usage est non commercial (licence CC BY-NC) : réservé aux tests.
- Un interrupteur « Fond retiré » permet de revenir à la photo d'origine avant d'enregistrer.

## Agent IA styliste

- Un relais Cloudflare Workers AI gratuit (`agent/worker.js`, guide dans `agent/GUIDE.md`) appelle un modèle de langage.
- L'appli envoie la situation complète (météo ressentie, occasions, formalité, vêtements autorisés avec leur isolation, favoris, tenues déjà proposées). Seuls des textes sont envoyés.
- Le code contrôle chaque réponse : pièces existantes, tenue complète, formalité, isolation, pièces verrouillées. Si la réponse est invalide ou si le relais est indisponible, les règles locales prennent le relais.

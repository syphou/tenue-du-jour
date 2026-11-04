# Mettre en place l'agent IA (Cloudflare, gratuit)

Durée : environ 10 minutes. Un ordinateur est plus confortable, mais un téléphone convient aussi.

1. Créez un compte gratuit sur https://dash.cloudflare.com/sign-up (e-mail + mot de passe, sans carte bancaire).
2. Dans le menu de gauche : **Compute (Workers)** puis **Workers & Pages** → **Create** → **Create Worker**.
3. Nommez-le `habille-moi-agent`, puis appuyez sur **Deploy** (le code d'exemple n'a pas d'importance).
4. Appuyez sur **Edit code**. Supprimez tout le code affiché, collez à la place le contenu du fichier `agent/worker.js`, puis **Deploy**.
5. Revenez à la page du Worker : **Settings** → **Bindings** → **Add** → **Workers AI**. Dans « Variable name », écrivez exactement `AI`, puis enregistrez/déployez.
6. Notez l'adresse du Worker (elle ressemble à `https://habille-moi-agent.VOTRE-NOM.workers.dev`).
7. Dans l'appli : onglet **Plus** → **Agent IA** → collez l'adresse → **Tester la connexion**.

## Limites et sécurité

- L'offre gratuite donne 10 000 « neurones » par jour. Avec le modèle léger utilisé ici, cela représente plusieurs centaines de tenues par jour pour l'ensemble des testeurs. Au-delà, l'agent s'arrête jusqu'au lendemain et l'appli utilise ses règles habituelles.
- Seules des descriptions de vêtements (type, couleur, chaleur…) sont envoyées. Jamais les photos.
- Le Worker n'accepte que les appels venant de l'adresse de l'appli (`https://syphou.github.io`).
- Facultatif : pour plafonner par personne et par jour, créez un espace **KV** nommé `LIMITS` (Storage & databases → KV) et liez-le au Worker (Settings → Bindings → KV namespace, variable `LIMITS`).
- Pour changer de modèle plus tard, ajoutez une variable `MODEL` dans Settings → Variables.

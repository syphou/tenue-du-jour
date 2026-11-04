/* Catalogue des types de vêtements.
   c : catégorie (haut, bas, robe, ext, pied, acc)
   f : formalité (1 sport, 2 décontracté, 3 soigné, 4 habillé)
   w : chaleur par défaut (1 léger, 2 moyen, 3 chaud)
   clo : isolation [léger, moyen, chaud] : valeurs de la table ANSI/ASHRAE 55-2010 quand elle existe ; les pièces absentes de la table
         (manteau, doudoune, parka, polaire, trench...) sont des ESTIMATIONS.
   en : formulations anglaises utilisées pour la reconnaissance par photo (modèle CLIP).
   rain : résiste à la pluie par défaut. */
(function(){
var C={};
function d(name,c,f,w,clo,en,rain){C[name]={c:c,f:f,w:w,clo:clo,en:en,rain:!!rain}}
/* Hauts */
d('t-shirt','haut',2,1,[.08,.08,.10],['a plain t-shirt','a short sleeve cotton tee']);
d('débardeur','haut',2,1,[.04,.05,.06],['a tank top','a sleeveless top']);
d('polo','haut',3,1,[.15,.17,.25],['a polo shirt']);
d('chemise','haut',3,2,[.17,.25,.34],['a button-up dress shirt','a collared long sleeve shirt']);
d('chemisier','haut',3,1,[.15,.2,.28],['a blouse']);
d('pull','haut',3,3,[.20,.30,.40],['a knit sweater','a pullover jumper']);
d('gilet','haut',3,2,[.15,.22,.30],['a knitted cardigan']);
d('sweat','haut',2,2,[.25,.34,.40],['a crewneck sweatshirt']);
d('sweat à capuche','haut',2,3,[.30,.40,.48],['a hoodie with a hood']);
d('maillot de sport','haut',1,1,[.08,.10,.12],['a football jersey','a soccer team jersey','a basketball jersey']);
d('haut de sport','haut',1,1,[.06,.09,.12],['a running athletic t-shirt','a gym training shirt']);
/* Bas */
d('jean','bas',2,2,[.17,.22,.26],['a pair of blue jeans','denim pants']);
d('pantalon','bas',3,2,[.15,.19,.24],['a pair of dress trousers','tailored slacks']);
d('chino','bas',3,2,[.15,.19,.22],['a pair of chino pants']);
d('pantalon cargo','bas',2,2,[.17,.22,.26],['a pair of cargo pants']);
d('jogging','bas',1,2,[.17,.22,.28],['a pair of sweatpants','a pair of track pants','a tracksuit bottom']);
d('legging','bas',1,1,[.08,.10,.15],['a pair of leggings']);
d('short','bas',2,1,[.06,.07,.08],['a pair of casual shorts']);
d('short de sport','bas',1,1,[.04,.05,.06],['a pair of athletic gym shorts','soccer shorts']);
d('jupe','bas',3,1,[.14,.18,.23],['a skirt']);
/* Robes */
d('robe','robe',3,1,[.23,.33,.47],['a dress']);
d('robe de soirée','robe',4,1,[.20,.25,.30],['an evening gown','a cocktail dress']);
/* Vestes et manteaux */
d('veste','ext',3,2,[.30,.40,.48],['a casual jacket']);
d('blazer','ext',4,2,[.30,.40,.48],['a blazer','a suit jacket']);
d('veste en jean','ext',2,2,[.30,.35,.42],['a denim jacket']);
d('blouson','ext',2,2,[.35,.45,.55],['a bomber jacket','a leather jacket']);
d('veste de sport','ext',1,2,[.25,.30,.38],['a zip track jacket','a sports training jacket']);
d('coupe-vent','ext',1,1,[.18,.25,.30],['a windbreaker','a lightweight rain jacket'],true);
d('polaire','ext',2,2,[.40,.50,.60],['a fleece jacket']);
d('trench','ext',4,2,[.40,.50,.60],['a trench coat'],true);
d('manteau','ext',3,3,[.60,.75,.90],['a long wool coat','an overcoat'],true);
d('doudoune','ext',2,3,[.70,.85,1.0],['a puffer jacket','a down jacket'],true);
d('parka','ext',2,3,[.70,.85,1.0],['a parka with a hood'],true);
/* Chaussures */
d('baskets','pied',2,2,[.02,.02,.03],['a pair of white sneakers','a pair of casual sneakers']);
d('chaussures de sport','pied',1,2,[.02,.02,.03],['a pair of running shoes','a pair of athletic training shoes','football boots']);
d('chaussures de ville','pied',4,2,[.02,.02,.03],['a pair of leather dress shoes','oxford shoes']);
d('mocassins','pied',3,2,[.02,.02,.03],['a pair of loafers']);
d('bottines','pied',3,3,[.06,.08,.10],['a pair of ankle boots']);
d('bottes','pied',2,3,[.08,.10,.12],['a pair of tall boots','a pair of rain boots'],true);
d('sandales','pied',2,1,[.01,.01,.01],['a pair of sandals','a pair of flip flops']);
d('talons','pied',4,1,[.02,.02,.02],['a pair of high heels']);
/* Accessoires */
d('casquette','acc',2,1,[0,0,0],['a baseball cap']);
d('chapeau','acc',3,1,[0,0,0],['a hat with a brim']);
d('bonnet','acc',2,3,[.03,.04,.05],['a knitted beanie hat','a wool winter hat']);
d('écharpe','acc',3,3,[.03,.05,.06],['a scarf']);
d('gants','acc',3,3,[.02,.03,.04],['a pair of gloves']);
d('lunettes de soleil','acc',3,1,[0,0,0],['a pair of sunglasses']);
d('ceinture','acc',3,2,[0,0,0],['a belt']);

window.CATALOG=C;
window.TYPES={};Object.keys(C).forEach(function(k){window.TYPES[k]=C[k].c});
window.TYPE_GROUPS=[['haut','Hauts'],['bas','Bas'],['robe','Robes'],['ext','Vestes et manteaux'],['pied','Chaussures'],['acc','Accessoires']];
window.FLABEL=['','Sport','Décontracté','Soigné','Habillé'];
/* Formalité d'une pièce : celle de son type, ajustée d'un cran si la personne a changé le style à la main */
window.formality=function(it){
var c=C[it.type];if(!c)return 2;
var f=c.f,dressy=c.f>=3;
if(it.style===2&&!dressy)f+=1;else if(it.style===1&&dressy&&c.f<4)f-=1;
return Math.max(1,Math.min(4,f));
};
})();

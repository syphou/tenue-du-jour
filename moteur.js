/* Moteur de suggestion de tenue.
   Bases :
   - Isolation vestimentaire en clo : valeurs de la table de l'ANSI/ASHRAE 55-2010 (pantalon 0,15-0,24 ; t-shirt 0,08 ; chemise 0,19-0,34 ;
     pull 0,25-0,36 ; veste 0,36-0,44 ; robe 0,23-0,47 ; chaussures 0,02 ; bottes 0,10). Le manteau n'y figure pas : valeur ESTIMÉE.
   - Bilan thermique simplifié : on est à l'aise si T > 30 °C - q*R, avec q = 58,2 W/m² x MET (marche active 1,4 MET) et 1 clo = 0,155 m²K/W.
   - Température ressentie à l'ombre (Steadman 1984, formule du Bureau of Meteorology australien, sans rayonnement) :
     AT = T + 0,348 e - 0,70 v - 4,25, e = (HR/100) x 6,105 x exp(17,27 T / (237,7 + T)) en hPa, v = vent à 10 m en m/s.
   - Harmonie des couleurs : neutres (noir, blanc, gris, beige, marine, kaki...), une seule couleur vive accentuée,
     analogues ou complémentaires atténuées, pas de noir avec du marron, pas plus de deux couleurs vives.
   Ce sont des règles de bon sens appuyées sur ces références, pas une étude sur le goût : le style reste personnel. */
(function(){
var CLO={ /* [léger, moyen, chaud] */
't-shirt':[.08,.08,.10],'chemise':[.17,.25,.34],'pull':[.20,.30,.40],'pantalon':[.15,.19,.24],'jean':[.19,.22,.26],
'short':[.06,.07,.08],'jupe':[.14,.18,.23],'robe':[.23,.33,.47],'veste':[.30,.40,.48],'manteau':[.60,.75,.90],
'chaussures de ville':[.02,.02,.03],'baskets':[.02,.02,.03],'bottes':[.08,.10,.12]};
var BASE=0.10; /* sous-vêtements et couche d'air */
function clo(it){var a=CLO[it.type]||[.1,.1,.1];return a[Math.max(0,Math.min(2,(it.warm||2)-1))]}

/* Température ressentie à l'ombre, en °C (t en °C, rh en %, ws en km/h) */
function feels(t,rh,wsKmh){
if(rh==null||wsKmh==null)return t;
var v=wsKmh/3.6,e=(rh/100)*6.105*Math.exp(17.27*t/(237.7+t));
return t+0.348*e-0.70*v-4.25;
}
/* Isolation totale visée (clo) pour un marcheur (1,2 MET) à une température ressentie donnée */
function needClo(at,met){
met=met||1.4;var q=58.2*met,R=Math.max(0,(30-at)/q);
return Math.max(0.35,Math.min(3.2,R/0.155));
}

/* --- couleurs --- */
var NEUTRAL={noir:1,blanc:1,gris:1,beige:1,'bleu marine':1,marine:1,kaki:1,crème:1,creme:1,marron:1,écru:1,ecru:1,denim:1};
var HUE={rouge:0,bordeaux:350,rose:330,orange:25,jaune:55,vert:120,turquoise:175,bleu:215,violet:275,mauve:285};
function colInfo(c){
c=String(c||'').toLowerCase();if(!c)return{n:true,k:'?'};
for(var k in NEUTRAL)if(c.indexOf(k)>-1)return{n:true,k:k==='marine'?'bleu marine':k};
for(var h in HUE)if(c.indexOf(h)>-1)return{n:false,k:h,h:HUE[h]};
return{n:true,k:'?'};
}
function hueDist(a,b){var d=Math.abs(a-b)%360;return d>180?360-d:d}
/* Renvoie {s: score >=0 bonus / <0 malus, why: [raisons]} */
function colorScore(list){
var s=0,why=[],vivid=[],names={};
list.forEach(function(it){var ci=colInfo(it.col);names[ci.k]=1;if(!ci.n)vivid.push(ci)});
if(names['noir']&&names['marron']){s-=4;why.push('éviter le noir avec le marron')}
var vk={};vivid.forEach(function(v){vk[v.k]=v});
var kinds=Object.keys(vk);
if(kinds.length>=3){s-=4;why.push('trop de couleurs vives')}
else if(kinds.length===2){
var d=hueDist(vk[kinds[0]].h,vk[kinds[1]].h);
if(d<=60){s+=1;why.push('couleurs voisines, harmonieuses')}
else if(d>=150){s-=1;why.push('couleurs opposées : à porter atténuées')}
else{s-=2;why.push('deux couleurs vives qui se marient peu')}
}else if(kinds.length===1){s+=2;why.push('base neutre avec une seule couleur d’accent')}
else if(list.length>1){s+=1;why.push('palette neutre, facile à assortir')}
if(names['bleu marine']&&names['noir']){s-=1.5;why.push('marine et noir : contraste faible')}
return{s:s,why:why};
}

/* --- notation d'une tenue --- */
function score(parts,ctx){
var tot=BASE,why=[],s=0,i;
parts.forEach(function(it){tot+=clo(it)});
/* Thermique : écart à la cible, pénalisé de façon asymétrique (avoir froid est pire qu'avoir un peu chaud) */
var diff=tot-ctx.need;
s-= diff<0 ? -diff*(ctx.at>=26?3:12) : diff*(ctx.at>=26?16:7);
/* Formalité */
parts.forEach(function(it){var w=(ctx.sport&&(TYPES[it.type]==='haut'||TYPES[it.type]==='bas'||TYPES[it.type]==='pied'))?0.3:1.2;s-=Math.abs((it.style||1)-ctx.sT)*w});
/* Pluie, vent */
var ext=parts.filter(function(p){return TYPES[p.type]==='ext'})[0];
var shoes=parts.filter(function(p){return TYPES[p.type]==='pied'})[0];
if(ctx.rain){if(ext&&ext.rain)s+=3;else if(ext)s-=0.5;if(shoes&&(shoes.type==='bottes'||shoes.rain))s+=2;else if(shoes&&shoes.type==='chaussures de ville')s-=1.5}
else if(shoes&&shoes.type==='bottes'&&ctx.at>=5)s-=2.5;
if(ctx.wind>=30&&ext)s+=1.5;
/* Sport */
if(ctx.sport&&shoes&&shoes.type==='baskets')s+=4;
if(!ctx.sport&&ctx.sT>=2&&shoes&&shoes.type==='baskets')s-=1.5;
/* Chaleur : pas de short sous 22 °C ressentis, ni de manteau au-dessus de 15 */
parts.forEach(function(it){if(it.type==='short'&&ctx.at<22&&!ctx.sport)s-=8;if(it.type==='manteau'&&ctx.at>15)s-=6;if(it.type==='pull'&&ctx.at>24)s-=6});
/* Couleurs */
var cs=colorScore(parts);s+=cs.s;
/* Rotation : ne pas répéter ce qui a été porté hier ou avant-hier */
parts.forEach(function(it){var dw=window.lastWornDays?lastWornDays(it.id,ctx.ref):null;if(dw===1)s-=5;else if(dw===2)s-=2;});
return{s:s,clo:tot,diff:diff,color:cs};
}

/* Combinaisons : (robe) OU (haut + bas), + couche(s) d'extérieur éventuelle, + chaussures.
   Une seule couche légère (pull/veste) est ajoutée si besoin : jusqu'à 3 couches au total pour le haut. */
function propose(ctx){
var by={haut:[],bas:[],ext:[],pied:[],robe:[]};
items.forEach(function(it){if(it.type==='robe')by.robe.push(it);else by[TYPES[it.type]]&&by[TYPES[it.type]].push(it)});
var tops=by.haut,pulls=tops.filter(function(i){return i.type==='pull'}),base=tops.filter(function(i){return i.type!=='pull'});
var lower=by.bas.length?by.bas:[null];
var feet=by.pied.length?by.pied:[null];
var outer=[null].concat(by.ext);
var bodies=[];
base.forEach(function(h){lower.forEach(function(b){bodies.push([h,b])})});
by.robe.forEach(function(r){bodies.push([r,null])});
if(!bodies.length)pulls.forEach(function(h){lower.forEach(function(b){bodies.push([h,b])})});
var res=[];
bodies.forEach(function(bd){
var mid=[null];
if(bd[0]&&bd[0].type!=='pull')pulls.forEach(function(p){mid.push(p)});
mid.forEach(function(p){outer.forEach(function(o){feet.forEach(function(f){
var parts=[bd[0],p,bd[1],o,f].filter(Boolean);
if(!parts.length)return;
var r=score(parts,ctx);
res.push({parts:parts,s:r.s,clo:r.clo,diff:r.diff,color:r.color,body:bd[0],mid:p,low:bd[1],ext:o,foot:f});
})})});
});
res.sort(function(a,b){return b.s-a.s});
/* variantes distinctes : on évite de proposer deux tenues qui ne diffèrent que d'une pièce secondaire */
var out=[];
res.forEach(function(r){
if(out.length>=6)return;
if(out.every(function(o){var same=o.parts.filter(function(p){return r.parts.indexOf(p)>-1}).length;return same<=Math.max(2,o.parts.length-2)||(o.parts.length!==r.parts.length)}))out.push(r);
});
return out;
}

/* Explications lisibles, pièce par pièce */
function explain(o,ctx){
var tot=o.clo.toFixed(2).replace('.',',');
var need=ctx.need.toFixed(2).replace('.',',');
var lines=[];
lines.push('Ressenti '+Math.round(ctx.at)+' °C'+(ctx.wind>=20?' (vent '+Math.round(ctx.wind)+' km/h)':'')+' : '+need+' clo visés, tenue à '+tot+' clo.');
if(o.diff<-0.3)lines.push('Attention : votre garde-robe ne couvre pas tout à fait ce froid (il manque environ '+Math.abs(o.diff).toFixed(1).replace('.',',')+' clo). Ajoutez écharpe, bonnet, gants ou une pièce plus chaude.');
if(o.color.why.length)lines.push('Couleurs : '+o.color.why.join(', ')+'.');
return lines;
}
window.ENGINE={clo:clo,feels:feels,needClo:needClo,colorScore:colorScore,propose:propose,explain:explain,score:score};
})();

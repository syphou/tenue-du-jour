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
/* Isolation : voir catalogue.js */
var BASE=0.10; /* sous-vêtements et couche d'air */
function clo(it){var a=(window.CATALOG&&CATALOG[it.type]&&CATALOG[it.type].clo)||[.1,.1,.1];return a[Math.max(0,Math.min(2,(it.warm||2)-1))]}

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


/* --- goût de la personne, appris de ses tenues favorites ---
   Chaque favori compte : pièces, couleurs et associations de couleurs reviennent un peu plus souvent.
   Le bonus est plafonné pour ne jamais l'emporter sur le confort thermique (un manque de 0,5 clo vaut déjà -6). */
function favsList(){try{var f=JSON.parse(localStorage.getItem('favoris-v1')||'[]');return Array.isArray(f)?f:[]}catch(e){return[]}}
function colKey(it){var c=colInfo(it.col);return c.k}
function pairKeys(parts){var ks=parts.map(colKey).filter(function(k){return k!=='?'});var u=ks.filter(function(k,i){return ks.indexOf(k)===i}).sort(),out=[];for(var i=0;i<u.length;i++)for(var j=i+1;j<u.length;j++)out.push(u[i]+'+'+u[j]);return out}
function profile(){
var P={n:0,item:{},col:{},pair:{},type:{}};
favsList().forEach(function(f){
var parts=(f.ids||[]).map(function(id){return items.filter(function(i){return i.id===id})[0]}).filter(Boolean);
if(!parts.length)return;P.n++;
parts.forEach(function(it){P.item[it.id]=(P.item[it.id]||0)+1;var k=colKey(it);if(k!=='?')P.col[k]=(P.col[k]||0)+1;P.type[it.type]=(P.type[it.type]||0)+1});
pairKeys(parts).forEach(function(k){P.pair[k]=(P.pair[k]||0)+1});
});
return P;
}
function tasteScore(parts,P){
if(!P||!P.n)return{s:0,hit:[]};
var s=0,hit=[];
parts.forEach(function(it){
var n=P.item[it.id]||0;if(n){s+=Math.min(1.2,0.6*n);hit.push(it)}
var c=P.col[colKey(it)]||0;if(c)s+=Math.min(0.8,0.3*c);
});
var pk=pairKeys(parts),pm=0;pk.forEach(function(k){if(P.pair[k])pm+=Math.min(1,0.5*P.pair[k])});
s+=Math.min(1.5,pm);
return{s:Math.min(5,s),hit:hit};
}
function summary(){
var P=profile();if(!P.n)return null;
function top(o,k){return Object.keys(o).sort(function(a,b){return o[b]-o[a]}).slice(0,k)}
var cols=top(P.col,3).filter(function(c){return c!=='?'}),types=top(P.type,3);
var pr=top(P.pair,1);
return{n:P.n,cols:cols,types:types,pair:pr[0]||null};
}

/* --- programmes : formalité visée (t) et formalité minimale acceptée (min) ---
   1 sport, 2 décontracté, 3 soigné, 4 habillé. Au bureau, jamais de pièce de sport ; en réunion et en cérémonie, rien de décontracté. */
var PROG={bureau:{t:3,min:2},reunion:{t:3.7,min:3},decontracte:{t:2,min:1},soiree:{t:3.3,min:2},rdv:{t:3,min:2},ceremonie:{t:4,min:3},voyage:{t:2,min:1},sport:{t:1,min:1}};
function progCtx(keys){
var base=keys.filter(function(k){return k!=='sport'});
if(!base.length)return{fT:1,minF:1,maxF:2,sportOnly:true};
return{fT:Math.max.apply(null,base.map(function(k){return PROG[k]?PROG[k].t:2})),minF:Math.max.apply(null,base.map(function(k){return PROG[k]?PROG[k].min:1})),maxF:4,sportOnly:false};
}
function ctxF(ctx){return ctx.fT!=null?ctx.fT:(ctx.sT>=2?3.5:2)}
function allowed(it,ctx){
if(ctx.minF==null)return true;
var f=formality(it);return f>=ctx.minF&&f<=ctx.maxF;
}

/* --- notation d'une tenue --- */
function score(parts,ctx){
var tot=BASE,why=[],s=0,i;
parts.forEach(function(it){tot+=clo(it)});
/* Thermique : écart à la cible, pénalisé de façon asymétrique (avoir froid est pire qu'avoir un peu chaud) */
var diff=tot-ctx.need;
s-= diff<0 ? -diff*(ctx.at>=26?3:12) : diff*(ctx.at>=26?16:7);
/* Formalité */
var fT=ctxF(ctx),fs=[];
parts.forEach(function(it){var f=formality(it),dv=f-fT;s-=dv<0?-dv*2.2:dv*(ctx.sport?2.5:0.9);if(TYPES[it.type]!=='acc')fs.push(f)});
if(fs.length>1){var sp=Math.max.apply(null,fs)-Math.min.apply(null,fs);if(sp>1)s-=1.2*(sp-1)}
/* Pluie, vent */
var ext=parts.filter(function(p){return TYPES[p.type]==='ext'})[0];
var shoes=parts.filter(function(p){return TYPES[p.type]==='pied'})[0];
if(ctx.rain){if(ext&&ext.rain)s+=3;else if(ext)s-=0.5;if(shoes&&(shoes.type==='bottes'||shoes.rain))s+=2;else if(shoes&&shoes.type==='chaussures de ville')s-=1.5}
else if(shoes&&shoes.type==='bottes'&&ctx.at>=5)s-=2.5;
if(ctx.wind>=30&&ext)s+=1.5;
/* Sport */
if(ctx.sport&&shoes&&shoes.type==='baskets')s+=4;
if(!ctx.sport&&fT>=3&&shoes&&shoes.type==='baskets')s-=1.5;
/* Chaleur : pas de short sous 22 °C ressentis, ni de manteau au-dessus de 15 */
parts.forEach(function(it){if(it.type==='short'&&ctx.at<22&&!ctx.sport)s-=8;if(it.type==='manteau'&&ctx.at>15)s-=6;if(it.type==='pull'&&ctx.at>24)s-=6});
/* Couleurs */
var cs=colorScore(parts);s+=cs.s;
var P=ctx.profile;var ts=tasteScore(parts,P);var ad=Math.abs(diff),tf=ad<=0.3?1:Math.max(0,1-(ad-0.3)/0.5);ts.s*=tf;s+=ts.s;
/* Rotation : ne pas répéter ce qui a été porté hier ou avant-hier */
parts.forEach(function(it){var dw=window.lastWornDays?lastWornDays(it.id,ctx.ref):null;if(dw===1)s-=5;else if(dw===2)s-=2;});
return{s:s,clo:tot,diff:diff,color:cs,taste:ts};
}

/* Combinaisons : (robe) OU (haut + bas), + couche(s) d'extérieur éventuelle, + chaussures.
   Une seule couche légère (pull/veste) est ajoutée si besoin : jusqu'à 3 couches au total pour le haut. */
function propose(ctx){
ctx.profile=profile();
var by={haut:[],bas:[],ext:[],pied:[],robe:[]};
var rel=[];ctx.relaxed=rel;
items.forEach(function(it){var c=TYPES[it.type];if(by[c])by[c].push(it)});
['haut','bas','pied','robe','ext'].forEach(function(c){var f=by[c].filter(function(i){return allowed(i,ctx)});if(f.length||c==='ext'||c==='robe')by[c]=f;else if(by[c].length)rel.push(c)});
var tops=by.haut,pulls=tops.filter(function(i){return i.type==='pull'}),base=tops.filter(function(i){return i.type!=='pull'});
var cap=function(a,n){if(a.length<=n)return a;return a.slice().sort(function(x,y){return Math.abs((x.style||1)-ctx.sT)-Math.abs((y.style||1)-ctx.sT)}).slice(0,n)};
if(base.length*Math.max(1,by.bas.length)*(1+pulls.length)*(1+by.ext.length)*Math.max(1,by.pied.length)>30000){base=cap(base,12);by.bas=cap(by.bas,10);pulls=cap(pulls,4);by.ext=cap(by.ext,4);by.pied=cap(by.pied,5)}
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
res.push({taste:r.taste,parts:parts,s:r.s,clo:r.clo,diff:r.diff,color:r.color,body:bd[0],mid:p,low:bd[1],ext:o,foot:f});
})})});
});
var locks=ctx.locks?Object.keys(ctx.locks).map(function(k){return ctx.locks[k]}):[];
if(locks.length){var f=res.filter(function(r){return locks.every(function(id){return r.parts.some(function(p){return p.id===id})})});if(f.length)res=f}
res.sort(function(a,b){return b.s-a.s});
/* variantes distinctes : on évite de proposer deux tenues qui ne diffèrent que d'une pièce secondaire */
var out=[];
res.forEach(function(r){
if(out.length>=6)return;
if(out.every(function(o){var same=o.parts.filter(function(p){return r.parts.indexOf(p)>-1}).length;return same<=Math.max(2,o.parts.length-2)||(o.parts.length!==r.parts.length)}))out.push(r);
});
return out;
}


/* Rôle d'une pièce dans une tenue : robe, haut, couche (pull porté par-dessus un haut), bas, ext, pied */
function roleOf(it,parts){
var c=TYPES[it.type];
if(it.type==='pull'&&parts.some(function(p){return p!==it&&(p.type==='robe'||(TYPES[p.type]==='haut'&&p.type!=='pull'))}))return 'couche';
return c;
}
function roleItems(role){
return items.filter(function(i){var c=TYPES[i.type];
if(role==='haut')return c==='haut'&&i.type!=='pull';
if(role==='couche')return i.type==='pull';
return c===role});
}
/* Pièces de remplacement pour un rôle, les autres pièces restant en place, de la mieux notée à la moins bien notée */
function alternatives(ctx,parts,role){
ctx.profile=ctx.profile||profile();
var cur=parts.filter(function(p){return roleOf(p,parts)===role})[0];
if(!cur)return[];
var out=[];
roleItems(role).forEach(function(c){
if(c.id===cur.id)return;
var np=parts.map(function(p){return p===cur?c:p});
out.push({it:c,s:score(np,ctx).s});
});
out.sort(function(a,b){return b.s-a.s});
return out.map(function(o){return o.it});
}
/* Accessoires : uniquement ceux que la personne possède, selon la météo et le programme */
var ACC_RULES=[
['bonnet',function(c){return c.at<=4}],
['écharpe',function(c){return c.at<=7}],
['gants',function(c){return c.at<=2}],
['casquette',function(c){return c.at>=20&&!c.rain&&!c.evening}],
['lunettes de soleil',function(c){return c.at>=16&&!c.rain&&!c.evening}],
['ceinture',function(c,p){return !c.sport&&ctxF(c)>=3&&p.some(function(x){return x.type==='pantalon'||x.type==='jean'})}]
];
var ACC_WHY={bonnet:'Il fait très froid : protège la tête.','écharpe':'Froid ou vent : garde le cou au chaud.',gants:'Mains au chaud par grand froid.',casquette:'Journée chaude et sèche : protège du soleil.','lunettes de soleil':'Journée claire et sèche.',ceinture:'Complète une tenue habillée.'};
function accessories(parts,ctx,idx){
var out=[];idx=idx||{};
ctx.profile=ctx.profile||profile();
ACC_RULES.forEach(function(r){
if(!r[1](ctx,parts))return;
var owned=items.filter(function(i){return i.type===r[0]});
if(!owned.length)return;
owned=owned.map(function(i){var all=parts.concat([i]);return{it:i,s:colorScore(all).s+tasteScore(all,ctx.profile).s}}).sort(function(a,b){return b.s-a.s}).map(function(o){return o.it});
out.push({type:r[0],it:owned[(idx[r[0]]||0)%owned.length],count:owned.length,why:ACC_WHY[r[0]]});
});
return out;
}

/* Tenue de sport à emporter : pièces de sport en priorité */
function sportKit(ctx,variant){
var wT=Math.max(1,(ctx.at>=24?1:ctx.at>=16?1.5:ctx.at>=8?2.5:3)-1),out=[];
['haut','bas','pied'].forEach(function(c){
var l=items.filter(function(i){return TYPES[i.type]===c&&formality(i)<=2});
if(!l.length)return;
l.sort(function(a,b){var fa=formality(a)===1?0:1,fb=formality(b)===1?0:1;return fa-fb||Math.abs(a.warm-wT)-Math.abs(b.warm-wT)});
var top=l.filter(function(i){return formality(i)===formality(l[0])});
out.push({c:c,it:top[(variant||0)%top.length],n:top.length});
});
return out;
}
/* Ligne de résumé : style, ressenti, pluie, couleurs */
function headline(o,ctx){
var fs=o.parts.filter(function(p){return TYPES[p.type]!=='acc'}).map(formality),avg=fs.length?Math.round(fs.reduce(function(a,b){return a+b},0)/fs.length):2;
var bits=[FLABEL[avg]||'Décontracté','ressenti '+Math.round(ctx.at)+' °C'];
if(ctx.wind>=25)bits.push('vent '+Math.round(ctx.wind)+' km/h');
if(ctx.rain)bits.push('pluie');
var cw=o.color&&o.color.why&&o.color.why[0];if(cw)bits.push(cw);
return bits.join(' · ');
}
/* Explications lisibles, pièce par pièce */
function explain(o,ctx){
var tot=o.clo.toFixed(2).replace('.',',');
var need=ctx.need.toFixed(2).replace('.',',');
var lines=[];
if(ctx.relaxed&&ctx.relaxed.length)lines.push('Peu de pièces adaptées à ce programme dans votre garde-robe ('+ctx.relaxed.join(', ')+') : j’ai pris les plus proches.');
lines.push('Ressenti '+Math.round(ctx.at)+' °C'+(ctx.wind>=20?' (vent '+Math.round(ctx.wind)+' km/h)':'')+' : '+need+' clo visés, tenue à '+tot+' clo.');
if(o.diff<-0.3)lines.push('Attention : votre garde-robe ne couvre pas tout à fait ce froid (il manque environ '+Math.abs(o.diff).toFixed(1).replace('.',',')+' clo). Une pièce plus chaude dans votre garde-robe aiderait.');
if(o.taste&&o.taste.s>0.5)lines.push('Dans votre style : proche de vos favoris'+(o.taste.hit.length?' ('+o.taste.hit.map(function(i){return i.type+(i.col?' '+i.col:'')}).join(', ')+')':'')+'.');
if(o.color.why.length)lines.push('Couleurs : '+o.color.why.join(', ')+'.');
return lines;
}

/* --- agent IA : contexte envoyé et contrôle de la réponse --- */
var FEN=['','sport','casual','smart','dressy'],WEN=['','light','medium','warm'];
function describe(it,ctx){
var w=window.lastWornDays?lastWornDays(it.id,ctx.ref):null;
return{id:it.id,type:it.type,category:TYPES[it.type],color:it.col||'',warmth:WEN[it.warm||2],formality:FEN[formality(it)],clo:+clo(it).toFixed(2),rain_resistant:!!it.rain,worn_days_ago:(w!==null&&w<=7)?w:null};
}
function agentContext(ctx,o){
o=o||{};ctx.profile=ctx.profile||profile();
var wardrobe=items.filter(function(i){return TYPES[i.type]==='acc'||allowed(i,ctx)}).map(function(i){return describe(i,ctx)});
var cands=propose(ctx).slice(0,3).map(function(c){return c.parts.map(function(p){return p.id})});
var favs=favsList().slice(-6).map(function(f){return f.ids});
return{
moment:o.whenLabel||'today',date:ctx.ref,temperature_c:Math.round(ctx.t),feels_like_c:Math.round(ctx.at),wind_kmh:Math.round(ctx.wind||0),rain:!!ctx.rain,evening:!!ctx.evening,
occasions:o.progLabels||[],target_formality:+ctxF(ctx).toFixed(1),min_formality:ctx.minF||1,
target_insulation_clo:+ctx.need.toFixed(2),insulation_tolerance:'-0.4 to +0.6',base_insulation_clo:BASE,
wardrobe:wardrobe,locked_ids:ctx.locks?Object.keys(ctx.locks).map(function(k){return ctx.locks[k]}):[],
already_proposed:o.avoid||[],favourite_outfits:favs,rule_based_suggestions:cands
};
}
/* Contrôle strict de la réponse de l'agent : jamais de pièce inventée, tenue complète, formalité, isolation. */
function validateAgent(res,ctx){
function bad(r){return{ok:false,reason:r}}
if(!res||typeof res!=='object'||!Array.isArray(res.items))return bad('format');
var byId={};items.forEach(function(i){byId[i.id]=i});
var ids=res.items.map(Number);
if(!ids.length||ids.length>5||ids.some(function(n){return !isFinite(n)})||ids.filter(function(n,i){return ids.indexOf(n)===i}).length!==ids.length)return bad('ids');
var parts=ids.map(function(n){return byId[n]});
if(parts.some(function(p){return !p}))return bad('inconnu');
var c={haut:[],bas:[],ext:[],pied:[],robe:[]};
for(var i=0;i<parts.length;i++){var k=TYPES[parts[i].type];if(!c[k])return bad('categorie');c[k].push(parts[i])}
var tops=c.haut.filter(function(p){return p.type!=='pull'}),pulls=c.haut.filter(function(p){return p.type==='pull'});
if(c.robe.length>1||tops.length>1||pulls.length>1||c.ext.length>1||c.pied.length>1)return bad('doublon');
var hasShoes=items.some(function(p){return TYPES[p.type]==='pied'});
if(hasShoes&&c.pied.length!==1)return bad('chaussures');
if(c.robe.length){if(c.bas.length||tops.length)return bad('robe')}
else{
if(!c.bas.length&&items.some(function(p){return TYPES[p.type]==='bas'}))return bad('bas');
if(c.bas.length>1)return bad('doublon');
if(!tops.length&&!pulls.length)return bad('haut');
if(pulls.length&&!tops.length&&c.haut.length>1)return bad('haut');
}
for(i=0;i<parts.length;i++)if(!allowed(parts[i],ctx))return bad('formalite');
var lockIds=ctx.locks?Object.keys(ctx.locks).map(function(k){return ctx.locks[k]}):[];
if(lockIds.some(function(id){return ids.indexOf(id)<0}))return bad('verrou');
var acc=[];
if(res.accessories!=null){
if(!Array.isArray(res.accessories)||res.accessories.length>3)return bad('accessoires');
var types={};
for(i=0;i<res.accessories.length;i++){var a=byId[Number(res.accessories[i])];if(!a||TYPES[a.type]!=='acc'||types[a.type])return bad('accessoire');types[a.type]=1;acc.push(a)}
}
var sc=score(parts,ctx);
var best=propose(ctx)[0];var floor=best?Math.min(-0.6,best.diff-0.2):-0.6;
if(sc.diff<floor||sc.diff>0.9)return bad('thermique');
var why=typeof res.why==='string'?res.why.replace(/\s+/g,' ').trim().slice(0,420):'';
var tip=typeof res.tip==='string'?res.tip.replace(/\s+/g,' ').trim().slice(0,220):'';
return{ok:true,parts:parts,acc:acc,why:why,tip:tip,clo:sc.clo,diff:sc.diff,color:sc.color,taste:sc.taste};
}

window.ENGINE={agentContext:agentContext,validateAgent:validateAgent,progCtx:progCtx,sportKit:sportKit,headline:headline,PROG:PROG,roleOf:roleOf,alternatives:alternatives,accessories:accessories,clo:clo,feels:feels,needClo:needClo,colorScore:colorScore,propose:propose,explain:explain,score:score,summary:summary};
})();

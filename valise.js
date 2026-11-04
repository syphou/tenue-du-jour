/* Onglet Valise : destination + dates + activités -> liste de vêtements tirée de la garde-robe + indispensables à cocher.
   Utilise les variables globales de index.html (items, TYPES, $, esc, today, addDays, daysBetween, toast). */
(function(){
var VK='valise-v1';
var AC=[['ville','Visites'],['business','Travail'],['soiree','Soirées'],['sport','Sport'],['plage','Plage'],['rando','Randonnée']];
var ESS={
base:['Papiers d’identité / billets','Chargeur et batterie','Trousse de toilette','Médicaments perso','Sous-vêtements','Chaussettes','Pyjama'],
plage:['Maillot de bain','Serviette de plage','Crème solaire','Lunettes de soleil'],
rando:['Gourde','Sac à dos léger','Chaussettes de marche','Petite pharmacie'],
sport:['Tenue de sport','Serviette'],
business:['Ordinateur','Badge / cartes de visite'],
soiree:['Accessoires de soirée'],
chaud:['Écharpe','Bonnet','Gants'],
pluie:['Parapluie compact'],
soleil:['Casquette / chapeau']
};
var S={dest:'',lat:null,lon:null,from:'',to:'',acts:['ville'],packed:{},ess:{},temps:null,rain:false,ready:false,geoFor:''};
try{var r=JSON.parse(localStorage.getItem(VK)||'null');if(r&&typeof r==='object'){for(var k in S)if(k in r)S[k]=r[k]}}catch(e){}
if(!Array.isArray(S.acts)||!S.acts.length)S.acts=['ville'];
if(!S.packed||typeof S.packed!=='object')S.packed={};
if(!S.ess||typeof S.ess!=='object')S.ess={};
function persist(){try{localStorage.setItem(VK,JSON.stringify(S))}catch(e){}}
function nDays(){if(!S.from||!S.to)return 0;return Math.max(1,Math.min(30,daysBetween(S.from,S.to)+1))}
function fmt(d){try{return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(new Date(d+'T12:00:00'))}catch(e){return d}}
function has(a){return S.acts.indexOf(a)>-1}

/* --- sélection dans la garde-robe --- */
function pick(types,count,wT,used){
var pool=items.filter(function(i){return types.indexOf(i.type)>-1&&!used[i.id]});
pool.sort(function(a,b){return Math.abs(a.warm-wT)-Math.abs(b.warm-wT)});
var out=pool.slice(0,count);out.forEach(function(i){used[i.id]=1});
return {got:out,miss:Math.max(0,count-out.length)};
}
function plan(){
var n=nDays(),t=S.temps||{min:12,max:20},mean=(t.min+t.max)/2;
var wT=mean>=24?1:mean>=14?2:3,used={},G=[];
function add(label,types,count,w){if(count<1)return;var r=pick(types,count,w==null?wT:w,used);G.push({label:label,got:r.got,miss:r.miss,need:count,types:types})}
var tops=Math.min(8,Math.ceil(n*0.8));
add('Hauts légers',has('business')?['chemise','polo','chemisier','t-shirt']:['t-shirt','polo','débardeur','chemise','chemisier'],tops,1);
if(mean<18)add('Hauts chauds',['pull','gilet','sweat','sweat à capuche'],mean<8?2:1,3);
var bas=Math.min(4,Math.ceil(n/3)+(has('business')?1:0));
add('Bas',mean>=24?['short','jupe','chino','jean','pantalon']:['jean','pantalon','chino','pantalon cargo','jupe'],bas,2);
if(mean>=22&&(has('plage')||has('sport')))add('Shorts',['short'],1,1);
if(has('sport')){add('Sport : haut',['haut de sport','maillot de sport'],1,1);add('Sport : bas',['short de sport','jogging','legging'],1,1)}
if(t.min<8)add('Manteau',['manteau','doudoune','parka'],1,3);
else if(t.min<17)add('Veste',['veste','blouson','veste en jean','polaire','blazer','trench'],1,2);
if(S.rain&&t.min>=8)add('Contre la pluie',['coupe-vent','trench','parka','manteau'],1,2);
add('Chaussures confort',['baskets','mocassins','sandales'],1,2);
if(has('sport'))add('Chaussures de sport',['chaussures de sport'],1,2);
if(has('business')||has('soiree'))add('Chaussures habillées',['chaussures de ville','mocassins','talons'],1,2);
if(has('rando')||t.min<3)add('Chaussures robustes',['bottes','bottines'],1,3);
return G;
}
function essentials(){
var l=ESS.base.slice();
S.acts.forEach(function(a){if(ESS[a])l=l.concat(ESS[a])});
var t=S.temps;
if(t&&t.min<8)l=l.concat(ESS.chaud);
if(S.rain)l=l.concat(ESS.pluie);
if(t&&t.max>=25)l=l.concat(ESS.soleil);
return l.filter(function(x,i){return l.indexOf(x)===i});
}

/* --- météo du séjour --- */
function geocode(q){
return fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name='+encodeURIComponent(q)).then(function(r){return r.json()}).then(function(j){
if(!j.results||!j.results.length)throw new Error('lieu');var p=j.results[0];return {lat:p.latitude,lon:p.longitude,name:p.name+(p.country?', '+p.country:'')}});
}
function tripWx(){
if(S.lat==null||!S.from||!S.to)return Promise.resolve();
var a=daysBetween(today(),S.from),b=daysBetween(today(),S.to);
if(b>15||b<0){S.temps=null;S.rain=false;return Promise.resolve('hors')}
var u='https://api.open-meteo.com/v1/forecast?latitude='+S.lat+'&longitude='+S.lon+'&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=16&timezone=auto';
return fetch(u).then(function(r){return r.json()}).then(function(j){
var d=j.daily,mn=[],mx=[],pr=0;
d.time.forEach(function(day,i){if(day>=S.from&&day<=S.to){mn.push(d.temperature_2m_min[i]);mx.push(d.temperature_2m_max[i]);if(d.precipitation_probability_max[i]>=50)pr++}});
if(!mn.length){S.temps=null;return 'hors'}
S.temps={min:Math.round(Math.min.apply(null,mn)),max:Math.round(Math.max.apply(null,mx))};
S.rain=pr>0;
});
}

/* --- rendu --- */
var root,busy=false,note='';
function chip(l,on,a){return '<button type="button" class="chip" '+a+' aria-pressed="'+on+'">'+l+'</button>'}
function render(){
root=root||$('trip-root');if(!root)return;
var n=nDays(),h='';
h+='<div class="card"><h2 id="h-trip">Ma valise</h2><p class="note" style="margin-top:6px">Dites où et quand, je prépare la liste avec ce que vous possédez.</p>';
h+='<div class="field" style="margin-top:12px"><label for="tr-dest">Destination</label><div class="row"><input id="tr-dest" type="text" autocomplete="off" placeholder="Ville" value="'+esc(S.dest)+'"></div></div>';
h+='<div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><div class="field"><label for="tr-from">Départ</label><input id="tr-from" type="date" value="'+esc(S.from)+'" min="'+today()+'"></div><div class="field"><label for="tr-to">Retour</label><input id="tr-to" type="date" value="'+esc(S.to)+'" min="'+esc(S.from||today())+'"></div></div>';
h+='<div class="chips" id="tr-acts" style="margin-top:12px" role="group" aria-label="Activités">'+AC.map(function(a){return chip(a[1],has(a[0]),'data-a="'+a[0]+'"')}).join('')+'</div>';
h+='<div class="actions" style="margin-top:14px"><button class="btn primary" id="tr-go" type="button">'+(busy?'Calcul…':'Préparer ma valise')+'</button></div>';
h+='<p class="note" id="tr-note" aria-live="polite">'+esc(note)+'</p></div>';
if(S.ready){
var G=plan(),E=essentials(),tot=0,done=0;
h+='<div class="card"><h2>'+esc(S.dest||'Séjour')+' · '+n+' jour'+(n>1?'s':'')+'</h2><p class="note" style="margin-top:4px">'+fmt(S.from)+' → '+fmt(S.to)+(S.temps?' · '+S.temps.min+' à '+S.temps.max+' °C'+(S.rain?' · pluie possible':''):' · météo non disponible (prévisions à 16 jours)')+'</p>';
G.forEach(function(g){
h+='<h3 style="margin:14px 0 6px">'+g.label+'</h3><ul class="chk">';
g.got.forEach(function(i){tot++;var on=!!S.packed[i.id];if(on)done++;h+='<li><label><input type="checkbox" data-p="'+i.id+'"'+(on?' checked':'')+'><span>'+esc(i.type)+(i.col?' '+esc(i.col):'')+'</span></label></li>'});
if(g.miss)h+='<li class="miss">À prévoir : '+g.miss+' pièce'+(g.miss>1?'s':'')+' ('+esc(g.types[0])+')</li>';
h+='</ul>';
});
h+='<h3 style="margin:14px 0 6px">Indispensables</h3><ul class="chk">';
E.forEach(function(x){tot++;var on=!!S.ess[x];if(on)done++;h+='<li><label><input type="checkbox" data-e="'+esc(x)+'"'+(on?' checked':'')+'><span>'+esc(x)+'</span></label></li>'});
h+='</ul><p class="note" style="margin-top:12px">'+done+' / '+tot+' prêts</p></div>';
}
root.innerHTML=h;
}
function bind(){
root=$('trip-root');
root.addEventListener('click',function(e){
var c=e.target.closest('#tr-acts .chip');
if(c){var a=c.dataset.a,i=S.acts.indexOf(a);if(i>-1){if(S.acts.length>1)S.acts.splice(i,1)}else S.acts.push(a);persist();if(S.ready)render();else{c.setAttribute('aria-pressed',has(a))}return}
if(e.target.id==='tr-go')go();
});
root.addEventListener('input',function(e){if(e.target.id==='tr-dest')S.dest=e.target.value});
root.addEventListener('change',function(e){
var t=e.target;
if(t.dataset.p){if(t.checked)S.packed[t.dataset.p]=1;else delete S.packed[t.dataset.p];persist()}
else if(t.dataset.e){if(t.checked)S.ess[t.dataset.e]=1;else delete S.ess[t.dataset.e];persist()}
else if(t.id==='tr-from'){S.from=t.value;if(S.to&&S.to<S.from){S.to=S.from;$('tr-to').value=S.to}$('tr-to').min=S.from||today();persist()}
else if(t.id==='tr-to'){S.to=t.value;persist()}
if(t.dataset.p||t.dataset.e){var b=root.querySelectorAll('input[type=checkbox]'),d=0;b.forEach(function(x){if(x.checked)d++});var p=root.querySelector('.card:last-child > p.note');if(p)p.textContent=d+' / '+b.length+' prêts'}
});
}
function go(){
var q=$('tr-dest').value.trim();
S.from=$('tr-from').value||S.from;S.to=$('tr-to').value||S.to;
if(!q){note='Indiquez une destination.';render();return}
if(!S.from||!S.to){note='Choisissez les dates du séjour.';render();return}
if(S.to<S.from)S.to=S.from;
busy=true;note='';S.dest=q;render();
var p=(S.geoFor===q&&S.lat!=null)?Promise.resolve({lat:S.lat,lon:S.lon,name:S.dest}):geocode(q).then(function(g){S.lat=g.lat;S.lon=g.lon;S.dest=g.name;S.geoFor=q;S.geoFor=g.name===q?q:q;return g});
p.then(tripWx).then(function(r){note=r==='hors'?'Pas de prévisions pour ces dates : liste établie pour un climat tempéré.':''})
.catch(function(e){S.temps=null;note=e&&e.message==='lieu'?'Lieu introuvable, liste établie pour un climat tempéré.':'Météo indisponible (hors ligne ?), liste établie pour un climat tempéré.'})
.then(function(){busy=false;S.ready=true;persist();render()});
}
window.renderTrip=function(){if(!root){bind()}render()};
})();

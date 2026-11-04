/* Onglet Plus : tenues favorites, statistiques, lien d'avis. Sauvegarde déjà gérée dans index.html. */
(function(){
var FK='favoris-v1',favs=[];
try{favs=JSON.parse(localStorage.getItem(FK)||'[]')}catch(e){favs=[]}
if(!Array.isArray(favs))favs=[];
function name(id){var i=items.filter(function(x){return x.id===id})[0];return i?i.type+(i.col?' '+i.col:''):null}
function stats(){
var h='';
if(!items.length){return '<p class="note">Ajoutez des vêtements pour voir vos statistiques.</p>'}
var cnt={};items.forEach(function(i){var c=CAT[TYPES[i.type]]||'Autre';cnt[c]=(cnt[c]||0)+1});
h+='<p>'+items.length+' vêtement'+(items.length>1?'s':'')+' : '+Object.keys(cnt).map(function(k){return cnt[k]+' '+k.toLowerCase()}).join(', ')+'.</p>';
var nw=items.filter(function(i){return !everWorn(i.id)}).length;
h+='<p class="note" style="margin-top:6px">'+(worn.length?nw+' jamais porté'+(nw>1?'s':'')+' · '+worn.length+' tenue'+(worn.length>1?'s':'')+' enregistrée'+(worn.length>1?'s':'')+'.':'Enregistrez vos tenues portées pour suivre ce que vous mettez vraiment.')+'</p>';
return h;
}
function agentText(){
var A=window.AGENT;if(!A)return '';
return '<h3 style="margin:18px 0 6px">Agent IA styliste</h3>'+
'<p class="note">L’agent choisit la tenue à partir de la météo, de vos occasions et de vos vêtements, puis le code vérifie sa réponse. Seuls des textes (type, couleur…) sont envoyés, jamais vos photos.</p>'+
'<label class="f" style="margin-top:10px"><span>Adresse du relais</span><input type="text" id="agent-url" inputmode="url" autocomplete="off" placeholder="https://habille-moi-agent.….workers.dev" value="'+esc(A.url())+'"></label>'+
'<label class="sw" style="margin-top:10px"><input type="checkbox" id="agent-on" role="switch"'+(A.isOn()?' checked':'')+'><span>Utiliser l’agent IA</span></label>'+
'<div class="actions" style="margin-top:10px"><button class="btn" id="agent-test" type="button">Tester la connexion</button></div><p id="agent-msg" class="dl" aria-live="polite"></p>';
}
function accText(){
var a=window.accStats?accStats():{n:0,ok:0};
var model='';try{model=localStorage.getItem('modele-v1')==='b16'}catch(e){}
return agentText()+'<p style="margin-top:12px">'+(a.n?'Reconnaissance : '+a.ok+' juste'+(a.ok>1?'s':'')+' du premier coup sur '+a.n+' ('+Math.round(100*a.ok/a.n)+' %).':'Pas encore de mesure : elle s’affichera après quelques vêtements ajoutés par photo.')+'</p>'+
'<label class="sw" style="margin-top:10px"><input type="checkbox" id="model-b16" role="switch"'+(model?' checked':'')+'><span>Modèle plus précis (téléchargement d’environ 150 Mo, en Wi-Fi)</span></label>'+
'<label class="f" style="margin-top:14px"><span>Fond des photos</span><select id="bg-mode"><option value="auto">Retirer un fond uni (rapide)</option><option value="ia">Retirer tout fond (IA, environ 45 Mo)</option><option value="off">Garder la photo d’origine</option></select></label><p class="note" style="margin-top:6px">L’option IA utilise un modèle à licence non commerciale : réservée aux tests.</p>'+
'<p class="note" style="margin-top:6px">Chaque vêtement que vous corrigez améliore les photos suivantes.</p>';
}
function styleText(){
var m=window.ENGINE&&ENGINE.summary();if(!m)return '';
return '<div class="taste"><b>Votre style</b><p>D’après '+m.n+' favori'+(m.n>1?'s':'')+(m.cols.length?', vous aimez : '+esc(m.cols.join(', ')):'')+(m.types.length?'. Pièces préférées : '+esc(m.types.join(', ')):'')+(m.pair?'. Association récurrente : '+esc(m.pair.replace('+',' et ')):'')+'.</p><p class="note">Vos propositions s’en rapprochent, sans jamais sacrifier le confort face à la météo.</p></div>';
}
function favList(){
var rows=favs.map(function(f,k){
var n=f.ids.map(name).filter(Boolean);
if(!n.length)return '';
return '<li style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)"><span>'+esc(n.join(', '))+'</span><button type="button" class="btn" data-fd="'+k+'" aria-label="Retirer des favoris">Retirer</button></li>';
}).join('');
return rows?styleText()+'<ul style="list-style:none;margin:0;padding:0">'+rows+'</ul>':'<p class="note">Aucune pour l’instant. Touchez « Mettre en favori » sous une proposition de l’onglet Tenue.</p>';
}
window.addFav=function(ids){
var key=ids.slice().sort().join(',');
if(favs.some(function(f){return f.ids.slice().sort().join(',')===key}))return false;
favs.push({ids:ids.slice()});try{localStorage.setItem(FK,JSON.stringify(favs))}catch(e){}return true;
};
window.renderPlus=function(){
$('favs').innerHTML=favList();
$('stats').innerHTML=stats()+accText();try{var bm=localStorage.getItem('fond-v1');if($('bg-mode'))$('bg-mode').value=(bm==='off'||bm==='ia')?bm:'auto'}catch(e){}
};
$('favs').addEventListener('click',function(e){
var b=e.target.closest('[data-fd]');if(!b)return;
favs.splice(+b.dataset.fd,1);try{localStorage.setItem(FK,JSON.stringify(favs))}catch(x){}
window.renderPlus();
});
})();

document.addEventListener('change',function(e){if(e.target&&e.target.id==='model-b16'&&window.setPreciseModel)setPreciseModel(e.target.checked)});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='bg-mode'&&window.setBgMode)setBgMode(e.target.value)});
document.addEventListener('change',function(e){var t=e.target;if(!t||!window.AGENT)return;if(t.id==='agent-url')AGENT.setUrl(t.value);if(t.id==='agent-on')AGENT.setOn(t.checked)});
document.addEventListener('click',function(e){
if(!e.target||e.target.id!=='agent-test'||!window.AGENT)return;
var u=document.getElementById('agent-url');if(u)AGENT.setUrl(u.value);
var m=document.getElementById('agent-msg');
if(!/^https:\/\//.test(AGENT.url())){m.textContent='Collez d’abord l’adresse du relais (elle commence par https://).';return}
m.textContent='Test en cours…';
AGENT.test().then(function(ok){m.textContent=ok?'Connexion réussie : l’agent IA est prêt.':'Le relais répond, mais pas comme prévu.'}).catch(function(err){m.textContent='Échec : '+(err&&err.message||'erreur')+'. Vérifiez l’adresse et la liaison « AI » du Worker.'});
});

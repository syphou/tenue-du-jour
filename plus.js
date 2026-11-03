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
function favList(){
var rows=favs.map(function(f,k){
var n=f.ids.map(name).filter(Boolean);
if(!n.length)return '';
return '<li style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)"><span>'+esc(n.join(', '))+'</span><button type="button" class="btn" data-fd="'+k+'" aria-label="Retirer des favoris">Retirer</button></li>';
}).join('');
return rows?'<ul style="list-style:none;margin:0;padding:0">'+rows+'</ul>':'<p class="note">Aucune pour l’instant. Touchez « Mettre en favori » sous une proposition de l’onglet Tenue.</p>';
}
window.addFav=function(ids){
var key=ids.slice().sort().join(',');
if(favs.some(function(f){return f.ids.slice().sort().join(',')===key}))return false;
favs.push({ids:ids.slice()});try{localStorage.setItem(FK,JSON.stringify(favs))}catch(e){}return true;
};
window.renderPlus=function(){
$('favs').innerHTML=favList();
$('stats').innerHTML=stats();
};
$('favs').addEventListener('click',function(e){
var b=e.target.closest('[data-fd]');if(!b)return;
favs.splice(+b.dataset.fd,1);try{localStorage.setItem(FK,JSON.stringify(favs))}catch(x){}
window.renderPlus();
});
})();

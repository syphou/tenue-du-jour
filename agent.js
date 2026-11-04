/* Agent IA styliste. Il choisit la tenue à partir de la situation complète ; le code contrôle ensuite sa réponse
   (pièces existantes, tenue complète, formalité, isolation). Seuls des textes décrivant les vêtements sont envoyés : jamais les photos. */
(function(){
var URL_KEY='agent-url-v1',ON_KEY='agent-on-v1';
var DEFAULT_URL=''; /* adresse du relais Cloudflare : à renseigner une fois déployé (sinon réglable dans Plus) */
var SYS=[
'You are an expert personal stylist. Choose ONE complete outfit for the user from THEIR wardrobe (the "wardrobe" list in the JSON you receive).',
'HARD RULES:',
'1. Use ONLY ids that appear in "wardrobe". Never invent a garment.',
'2. The outfit needs: either one dress (category "robe"), or one top (category "haut", not a sweater) + one bottom (category "bas"). Add one pair of shoes (category "pied") if the wardrobe has any.',
'3. Optional: one sweater (type "pull") worn over the top as an extra layer; one outer layer (category "ext") when it is cold, windy or rainy.',
'4. Respect "min_formality" strictly (sport < casual < smart < dressy) and aim for "target_formality" (1 sport, 2 casual, 3 smart, 3.7+ formal). Never mix sport pieces with dressy pieces.',
'5. Warmth: the sum of the "clo" of the chosen pieces + base_insulation_clo should be close to "target_insulation_clo" (tolerance -0.4 to +0.6). Do the addition.',
'6. Rain: prefer rain_resistant outer layers and shoes. Wind: add a layer.',
'7. Colours: neutral base (black, white, grey, beige, navy, khaki), at most one accent colour, never black with brown, avoid two strong colours that clash.',
'8. Avoid pieces with worn_days_ago 1 or 2. Follow the taste shown by "favourite_outfits" when it does not break a rule above.',
'9. All ids in "locked_ids" MUST be in your outfit. Do not repeat anything listed in "already_proposed" (each entry is a list of ids): propose a clearly different outfit.',
'10. Accessories (category "acc") are optional, only from the wardrobe, max 3, one per type, and only when useful: beanie/scarf/gloves when cold, cap/sunglasses when sunny and dry, belt with smart trousers.',
'"rule_based_suggestions" are valid starting points from a simple algorithm: you may improve on them or choose differently.',
'Answer with ONLY a JSON object, no other text: {"items":[ids],"accessories":[ids],"why":"2 or 3 short sentences IN FRENCH explaining the choice (weather, occasion, colours)","tip":"one short tip IN FRENCH, or null"}'
].join('\n');

function url(){try{return localStorage.getItem(URL_KEY)||DEFAULT_URL}catch(e){return DEFAULT_URL}}
function on(){try{var v=localStorage.getItem(ON_KEY);return v===null?true:v==='1'}catch(e){return true}}
function enabled(){var u=url();return !!u&&on()&&/^https:\/\//.test(u)}
window.AGENT={
enabled:enabled,
url:url,
setUrl:function(v){try{localStorage.setItem(URL_KEY,(v||'').trim())}catch(e){}},
setOn:function(b){try{localStorage.setItem(ON_KEY,b?'1':'0')}catch(e){}},
isOn:on,
/* Appelle le relais et renvoie le texte brut du modèle */
raw:async function(messages,ms){
var ctl=new AbortController(),t=setTimeout(function(){ctl.abort()},ms||30000);
try{
var r=await fetch(url(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:messages,max_tokens:450}),signal:ctl.signal});
var j=await r.json().catch(function(){return{}});
if(!r.ok)throw new Error(j&&j.error||('http '+r.status));
if(typeof j.text!=='string')throw new Error('vide');
return j.text;
}finally{clearTimeout(t)}
},
parse:function(text){
var a=text.indexOf('{'),b=text.lastIndexOf('}');
if(a<0||b<=a)return null;
try{return JSON.parse(text.slice(a,b+1))}catch(e){return null}
},
/* Demande une tenue ; renvoie la tenue validée par le code, ou lève une erreur (le code de l'appli utilisera alors ses règles) */
ask:async function(ectx,o){
var c=ENGINE.agentContext(ectx,o);
var text=await this.raw([{role:'system',content:SYS},{role:'user',content:JSON.stringify(c)}]);
var res=this.parse(text);
var v=ENGINE.validateAgent(res,ectx);
if(!v.ok){var e=new Error('invalide');e.reason=v.reason;throw e}
return v;
},
test:async function(){
var text=await this.raw([{role:'system',content:'Reply with only the JSON {"ok":true}.'},{role:'user',content:'ping'}],20000);
return /ok/.test(text);
}
};
})();

const BASE="https://raw.githubusercontent.com/POIenexis/POI-zoeker/main/",VER="4.5";
const SRC=[["poi_e_station.csv","Station"],["poi_e_verdeelkast.csv","Verdeelkast"],["poi_g_gasstation.csv","Gasstation"],["poi_g_grondafsluiter.csv","Grondafsluiter"],["poi_e_toiletten.csv","Toilet"]],CATS=["Alles","Station","Verdeelkast","Gasstation","Grondafsluiter","Toilet"];
let D=[],cat="Alles",P=null,mode="normal",timer;const $=s=>document.querySelector(s),q=$("#q"),get=k=>JSON.parse(localStorage.getItem(k)||"[]"),save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function csv(s){let a=[],v="",z=false;for(let i=0;i<s.length;i++){let c=s[i];if(c=='"'){if(z&&s[i+1]=='"'){v+='"';i++}else z=!z}else if(c==";"&&!z){a.push(v);v=""}else v+=c}a.push(v);return a}
function coord(v,k){v=String(v??"").trim().replace(/\s/g,"").replace(",",".");let n=Number(v),ok=x=>k=="lat"?x>=50&&x<=54:x>=3&&x<=8;if(ok(n))return n;let d=v.replace(/[^\d-]/g,""),neg=d[0]=="-",x=d.replace("-","");for(let p=1;p<=2;p++){let n=Number((neg?"-":"")+x.slice(0,p)+"."+x.slice(p));if(ok(n))return n}return NaN}
function key(i){return`${i.type}|${i.code}|${i.lat.toFixed(6)}|${i.lon.toFixed(6)}`}
function normalize(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[.\s\-_/]/g,"")}
async function load(){D=[];$("#status").textContent="POI-data laden…";let fail=0;await Promise.allSettled(SRC.map(async([f,t])=>{try{let r=await fetch(BASE+f,{cache:"no-cache"});if(!r.ok)throw Error();let ls=(await r.text()).split(/\r?\n/).filter(Boolean),h=csv(ls.shift()),ni=h.findIndex(x=>/naam/i.test(x)),ai=h.findIndex(x=>/^(latitude|lat)$/i.test(x.trim())),oi=h.findIndex(x=>/^(longitude|lon)$/i.test(x.trim()));for(let l of ls){let c=csv(l),lat=coord(c[ai],"lat"),lon=coord(c[oi],"lon");if(!isFinite(lat)||!isFinite(lon))continue;let raw=c[ni]||"",p=raw.split(",").map(x=>x.trim()),i={type:t,raw,code:p[0]||"",name:p[1]||"",street:p[2]||"",house:p[3]||"",zip:p[4]||"",city:p[5]||"",lat,lon};i.k=key(i);i.search=normalize(raw+" "+t+" "+f);D.push(i)}}catch(e){fail++}}));const before=D.length, unique=new Map();for(const i of D){const dedupeKey=`${i.type}|${normalize(i.code)}|${i.lat.toFixed(6)}|${i.lon.toFixed(6)}`;if(!unique.has(dedupeKey))unique.set(dedupeKey,i)}D=[...unique.values()];const removed=before-D.length;localStorage.setItem("lastUpdate",new Date().toISOString());$("#status").textContent=`${D.length.toLocaleString("nl-NL")} unieke locaties · ${removed.toLocaleString("nl-NL")} dubbelen verwijderd · bijgewerkt ${new Date().toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}${fail?` · ${fail} bronfout`:""}`;render()}
function hav(a,b,c,d){let R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,z=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(z))}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function smartQuery(term){const compact=normalize(term),sk=compact.match(/^sk0*(\d+)$/i),digits=compact.match(/^0*(\d+)$/);return{compact,sk:sk?String(Number(sk[1])):null,digits:digits?String(Number(digits[1])):null}}
function numericTail(s){const m=normalize(s).match(/(\d+)$/);return m?String(Number(m[1])):""}
function scoreItem(i,x){
 const code=normalize(i.code),raw=normalize(i.raw);let n=0;
 if(code===x.compact)n+=100000;else if(code.endsWith(x.compact))n+=45000;else if(code.includes(x.compact))n+=25000;else if(raw.includes(x.compact))n+=10000;else return -Infinity;
 if(x.sk!==null){const m=code.match(/sk0*(\d+)$/i);if(m&&String(Number(m[1]))===x.sk)n+=70000}
 if(x.digits!==null&&numericTail(i.code)===x.digits)n+=35000;
 if(isFinite(i.dist)){if(i.dist<.25)n+=30000;else if(i.dist<1)n+=24000;else if(i.dist<5)n+=18000;else if(i.dist<15)n+=12000;else if(i.dist<50)n+=5000;n-=Math.min(i.dist,500)*25}
 if(get("favs").includes(i.k))n+=800;let ri=get("recent").findIndex(r=>r.k===i.k);if(ri>=0)n+=Math.max(0,500-ri*20);return n
}
function items(){
 let x=smartQuery(q.value),a=D.filter(i=>cat=="Alles"||i.type==cat);
 if(mode=="recent"){let m=new Map(D.map(i=>[i.k,i]));a=get("recent").map(o=>{let i=m.get(o.k);if(i)i.when=o.when;return i}).filter(Boolean).filter(i=>cat=="Alles"||i.type==cat)}
 if(mode=="fav"){let f=new Set(get("favs"));a=a.filter(i=>f.has(i.k))}
 if(P)a.forEach(i=>i.dist=hav(P.latitude,P.longitude,i.lat,i.lon));
 if(x.compact){a=a.map(i=>({i,n:scoreItem(i,x)})).filter(v=>isFinite(v.n)).sort((a,b)=>b.n-a.n||((a.i.dist??1e9)-(b.i.dist??1e9))).map(v=>v.i)}
 else{let z=$("#sort").value;if(z=="distance"||(z=="auto"&&P&&mode=="normal"))a.sort((a,b)=>(a.dist??1e9)-(b.dist??1e9));else if(z=="name")a.sort((a,b)=>(a.code+a.name).localeCompare(b.code+b.name,"nl",{numeric:true}))}
 return a
}
function render(){$("#near")?.classList.toggle("selected",mode=="normal"&&!!P);$("#recentBtn")?.classList.toggle("selected",mode=="recent");$("#favBtn")?.classList.toggle("selected",mode=="fav");let a=items();$("#count").textContent=`${a.length.toLocaleString("nl-NL")} resultaten`;$("#out").innerHTML=a.slice(0,200).map(i=>`<article class="card" data-k="${esc(i.k)}"><div><div class="code">${esc(i.code||i.name||"POI")}</div><div class="name">${esc(i.name)}</div><div class="addr">${esc([i.street,i.house,i.zip,i.city].filter(Boolean).join(" "))}</div>${i.when?`<div class="addr">${new Date(i.when).toLocaleString("nl-NL",{dateStyle:"short",timeStyle:"short"})}</div>`:""}</div><div><div class="badge">${i.type}</div>${isFinite(i.dist)?`<div class="dist">${i.dist<1?Math.round(i.dist*1000)+" m":i.dist.toFixed(1)+" km"}</div>`:""}</div></article>`).join("")||`<div class="empty">${mode=="recent"?"Nog geen recent bezochte locaties.":mode=="fav"?"Nog geen favorieten.":"Geen locaties gevonden."}</div>`;document.querySelectorAll(".card").forEach(x=>x.onclick=()=>detail(D.find(i=>i.k===x.dataset.k)))}
function recent(i){let a=get("recent").filter(x=>x.k!==i.k);a.unshift({k:i.k,when:new Date().toISOString()});save("recent",a.slice(0,20))}
function links(i){let lat=i.lat,lon=i.lon,enc=encodeURIComponent([i.street,i.house,i.zip,i.city].filter(Boolean).join(" "));return{apple:`https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`,google:`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,waze:`https://waze.com/ul?ll=${lat}%2C${lon}&navigate=yes`,flits:`flitsmeister://`,tomtom:`tomtomgo://x-callback-url/navigate?destination=${lat},${lon}`,geo:`geo:${lat},${lon}?q=${lat},${lon}(${enc})`}}
function navURL(i){let pref=localStorage.getItem("navPref")||"auto",L=links(i),ios=/iPhone|iPad|iPod/.test(navigator.userAgent);if(pref=="auto")return ios?L.apple:L.google;return L[pref]||L.google}
function detail(i){if(!i)return;recent(i);let fav=get("favs").includes(i.k),L=links(i);$("#detail").innerHTML=`<div class="badge">${i.type}</div><h2>${esc(i.code||i.name||"POI")}</h2><p class="meta">${esc(i.name)}<br>${esc([i.street,i.house,i.zip,i.city].filter(Boolean).join(" "))}<br>${i.lat.toFixed(6)}, ${i.lon.toFixed(6)}</p><a class="navbtn primary" href="${navURL(i)}">NAVIGEER</a><details><summary class="navbtn minor">Andere navigatie-app</summary><a class="navbtn minor" href="${L.apple}">Apple Maps</a><a class="navbtn minor" href="${L.google}">Google Maps</a><a class="navbtn minor" href="${L.waze}">Waze</a><a class="navbtn minor" href="${L.flits}">Flitsmeister</a><a class="navbtn minor" href="${L.tomtom}">TomTom GO</a><a class="navbtn minor" href="${L.geo}">Andere app</a></details><div class="actions"><button id="share">↗ Delen</button><button id="copy">⧉ Kopiëren</button></div><button class="navbtn secondary" id="fav">${fav?"★ Verwijder favoriet":"☆ Favoriet"}</button>`;$("#share").onclick=()=>share(i);$("#copy").onclick=()=>navigator.clipboard.writeText(`${i.code} ${i.name}\n${[i.street,i.house,i.zip,i.city].filter(Boolean).join(" ")}\n${i.lat}, ${i.lon}`).then(()=>toast("Gekopieerd"));$("#fav").onclick=()=>{let a=get("favs");a=fav?a.filter(x=>x!==i.k):[i.k,...a.filter(x=>x!==i.k)].slice(0,50);save("favs",a);toast(fav?"Favoriet verwijderd":"Favoriet toegevoegd");$("#detailDlg").close();render()};$("#detailDlg").showModal()}
async function share(i){let text=`${i.code} ${i.name}\n${[i.street,i.house,i.zip,i.city].filter(Boolean).join(" ")}\n${links(i).google}`;if(navigator.share)await navigator.share({title:"Enexis POI",text});else navigator.clipboard.writeText(text).then(()=>toast("Deellink gekopieerd"))}
let lastRenderPos=null;
function movedEnough(a,b){if(!a||!b)return true;return hav(a.latitude,a.longitude,b.latitude,b.longitude)>.03}
function setPos(p,silent=false,force=false){
 const next=p.coords,shouldRender=force||movedEnough(lastRenderPos,next);
 P=next;localStorage.setItem("locationEnabled","1");
 if(!q.value)$("#sort").value="distance";
 if(shouldRender){lastRenderPos={latitude:P.latitude,longitude:P.longitude};render()}
 if(!silent)toast("Locatie actief")
}
function locate(){if(!navigator.geolocation)return toast("Locatie niet beschikbaar");$("#status").textContent="Locatie bepalen…";navigator.geolocation.getCurrentPosition(p=>{mode="normal";setPos(p,false,true)},()=>{toast("Geef locatie-toegang in je browser");render()},{enableHighAccuracy:true,timeout:12000,maximumAge:30000})}
function startSmartLocation(){if(!navigator.geolocation||localStorage.getItem("locationEnabled")!=="1")return;navigator.geolocation.getCurrentPosition(p=>setPos(p,true,true),()=>{},{enableHighAccuracy:true,timeout:8000,maximumAge:60000});navigator.geolocation.watchPosition(p=>setPos(p,true,false),()=>{},{enableHighAccuracy:true,maximumAge:30000,timeout:15000})}
function toast(t){let x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1700)}
CATS.forEach(c=>{let b=document.createElement("button");b.className="chip"+(c=="Alles"?" on":"");b.textContent=c;b.onclick=()=>{cat=c;document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b));render()};$("#cats").append(b)});
q.oninput=()=>{mode="normal";clearTimeout(timer);timer=setTimeout(render,100)};$("#clear").onclick=()=>{q.value="";mode="normal";render()};$("#sort").onchange=render;$("#near").onclick=locate;$("#recentBtn").onclick=()=>{mode="recent";q.value="";render()};$("#favBtn").onclick=()=>{mode="fav";q.value="";render()};
document.querySelectorAll(".close").forEach(b=>b.onclick=()=>b.closest("dialog").close());$("#settings").onclick=()=>{$("#navPref").value=localStorage.getItem("navPref")||"auto";$("#dark").checked=localStorage.getItem("dark")=="1";$("#settingsDlg").showModal()};$("#navPref").onchange=e=>{localStorage.setItem("navPref",e.target.value);toast("Navigatievoorkeur opgeslagen")};$("#dark").onchange=e=>{localStorage.setItem("dark",e.target.checked?"1":"0");document.body.classList.toggle("dark",e.target.checked)};$("#clearRecent").onclick=()=>{save("recent",[]);toast("Recente locaties gewist");render()};$("#refresh").onclick=()=>load();
if(localStorage.getItem("dark")=="1")document.body.classList.add("dark");else document.body.classList.add("autoDark");
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").then(r=>r.update()));
function applyTheme(v){
 const resolved=v==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):v;
 document.body.classList.toggle("light",resolved==="light");
 document.body.classList.toggle("dark",resolved==="dark");
 document.querySelector('meta[name="theme-color"]')?.setAttribute("content",resolved==="light"?"#edf3f5":"#07131b");
}
const themePref=$("#themePref");
if(themePref){
 themePref.value=localStorage.getItem("themePref")||"dark";
 applyTheme(themePref.value);
 themePref.onchange=()=>{localStorage.setItem("themePref",themePref.value);applyTheme(themePref.value)};
 matchMedia("(prefers-color-scheme: light)").addEventListener?.("change",()=>{if(themePref.value==="system")applyTheme("system")});
}
load();startSmartLocation();
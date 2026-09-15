const BASE="https://raw.githubusercontent.com/POIenexis/POI-zoeker/main/";
const SOURCES=[["poi_e_station.csv","Station"],["poi_e_verdeelkast.csv","Verdeelkast"],["poi_g_gasstation.csv","Gasstation"],["poi_g_grondafsluiter.csv","Grondafsluiter"],["poi_e_toiletten.csv","Toilet"]];
const CATS=["Alles","Station","Verdeelkast","Gasstation","Grondafsluiter","Toilet"];
let data=[],cat="Alles",pos=null,mode="normal",timer;
const $=s=>document.querySelector(s), q=$("#q");
const recent=()=>JSON.parse(localStorage.getItem("poiRecent")||"[]"), favs=()=>JSON.parse(localStorage.getItem("poiFavs")||"[]");
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function csvLine(s){let a=[],v="",quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c=='"'){if(quoted&&s[i+1]=='"'){v+='"';i++}else quoted=!quoted}else if(c==";"&&!quoted){a.push(v);v=""}else v+=c}a.push(v);return a}
function coord(v,kind){
 v=String(v??"").trim().replace(/\s/g,"").replace(",","."); if(!v)return NaN;
 let n=Number(v);
 const valid=x=>kind==="lat"?(x>=50&&x<=54):(x>=3&&x<=8);
 if(valid(n))return n;
 const digits=v.replace(/[^\d-]/g,""), neg=digits.startsWith("-"), d=digits.replace("-","");
 // Source sometimes stores 51.76943216 as 5.176.943.216 and 4.96696964 as 496.696.964.
 for(let dec=1;dec<=2;dec++){let x=Number((neg?"-":"")+d.slice(0,dec)+"."+d.slice(dec));if(valid(x))return x}
 return NaN
}
function key(i){return `${i.type}|${i.code}|${i.lat.toFixed(6)}|${i.lon.toFixed(6)}`}
async function load(){
 data=[]; $("#status").textContent="POI-data laden…";let ok=0,fail=0;
 await Promise.allSettled(SOURCES.map(async([file,type])=>{try{
  let r=await fetch(BASE+file,{cache:"no-cache"});if(!r.ok)throw Error(r.status);let lines=(await r.text()).split(/\r?\n/).filter(Boolean),h=csvLine(lines.shift());
  let ni=h.findIndex(x=>/naam/i.test(x)),lai=h.findIndex(x=>/^(latitude|lat)$/i.test(x.trim())),loi=h.findIndex(x=>/^(longitude|lon)$/i.test(x.trim()));
  for(const l of lines){let c=csvLine(l),lat=coord(c[lai],"lat"),lon=coord(c[loi],"lon");if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
   let raw=c[ni]||"",p=raw.split(",").map(x=>x.trim()),o={type,file,raw,code:p[0]||"",name:p[1]||"",street:p[2]||"",house:p[3]||"",zip:p[4]||"",city:p[5]||"",lat,lon};o.k=key(o);o.search=(raw+" "+type+" "+file).toLowerCase();data.push(o)
  }ok++}catch(e){fail++;console.warn(file,e)}}));
 $("#status").textContent=`${data.length.toLocaleString("nl-NL")} locaties geladen${fail?` · ${fail} bron niet geladen`:""}`;render()
}
function hav(a,b,c,d){const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,z=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(z))}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function getItems(){
 let term=q.value.trim().toLowerCase(),a=data.filter(i=>(cat==="Alles"||i.type===cat)&&(!term||i.search.includes(term)));
 if(mode==="recent"){let m=new Map(data.map(x=>[x.k,x]));a=recent().map(k=>m.get(k)).filter(Boolean).filter(i=>cat==="Alles"||i.type===cat)}
 if(mode==="fav"){let set=new Set(favs());a=a.filter(i=>set.has(i.k))}
 if(pos)a.forEach(i=>i.dist=hav(pos.latitude,pos.longitude,i.lat,i.lon));
 let sort=$("#sort").value;if(sort==="distance"||((sort==="auto")&&pos&&!term&&mode==="normal"))a.sort((x,y)=>(x.dist??1e9)-(y.dist??1e9));else if(sort==="name")a.sort((x,y)=>(x.code+x.name).localeCompare(y.code+y.name,"nl",{numeric:true}));
 return a
}
function render(){let a=getItems();$("#count").textContent=`${a.length.toLocaleString("nl-NL")} resultaten`;$("#out").innerHTML=a.slice(0,200).map(i=>`<article class="card" data-k="${esc(i.k)}"><div><div class="code">${esc(i.code||i.name||"POI")}</div><div class="name">${esc(i.name)}</div><div class="addr">${esc([i.street,i.house,i.zip,i.city].filter(Boolean).join(" "))}</div></div><div><div class="badge">${i.type}</div>${Number.isFinite(i.dist)?`<div class="dist">${i.dist<1?Math.round(i.dist*1000)+" m":i.dist.toFixed(1)+" km"}</div>`:""}</div></article>`).join("")||`<div class="empty">${mode==="recent"?"Nog geen recent bezochte locaties.":mode==="fav"?"Nog geen favorieten.":"Geen locaties gevonden."}</div>`;document.querySelectorAll(".card").forEach(el=>el.onclick=()=>detail(data.find(x=>x.k===el.dataset.k)))}
function addRecent(i){let a=recent().filter(x=>x!==i.k);a.unshift(i.k);save("poiRecent",a.slice(0,20))}
function detail(i){if(!i)return;addRecent(i);let isFav=favs().includes(i.k),isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent),main=isIOS?`https://maps.apple.com/?daddr=${i.lat},${i.lon}&dirflg=d`:`https://www.google.com/maps/dir/?api=1&destination=${i.lat},${i.lon}`,alt=isIOS?`https://www.google.com/maps/dir/?api=1&destination=${i.lat},${i.lon}`:`https://maps.apple.com/?daddr=${i.lat},${i.lon}&dirflg=d`;
 $("#detail").innerHTML=`<div class="badge detailbadge">${i.type}</div><h2>${esc(i.code||i.name||"POI")}</h2><p class="meta">${esc(i.name)}<br>${esc([i.street,i.house,i.zip,i.city].filter(Boolean).join(" "))}<br>${i.lat.toFixed(6)}, ${i.lon.toFixed(6)}</p><a class="nav primary" href="${main}">NAVIGEER</a><a class="nav secondary" href="${alt}">${isIOS?"Google Maps":"Apple Maps"}</a><button class="fav" id="toggleFav">${isFav?"★ Verwijder uit favorieten":"☆ Voeg toe aan favorieten"}</button>`;
 $("#toggleFav").onclick=()=>{let a=favs();a=isFav?a.filter(x=>x!==i.k):[i.k,...a.filter(x=>x!==i.k)].slice(0,50);save("poiFavs",a);toast(isFav?"Favoriet verwijderd":"Toegevoegd aan favorieten");$("#dlg").close();render()};$("#dlg").showModal()
}
function toast(t){let x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1600)}
CATS.forEach(c=>{let b=document.createElement("button");b.className="chip"+(c==="Alles"?" on":"");b.textContent=c;b.onclick=()=>{cat=c;document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b));render()};$("#cats").append(b)});
q.oninput=()=>{mode="normal";clearTimeout(timer);timer=setTimeout(render,120)};$("#clear").onclick=()=>{q.value="";mode="normal";render();q.focus()};$("#sort").onchange=render;
$("#near").onclick=()=>{mode="normal";if(!navigator.geolocation)return toast("Locatie niet beschikbaar");$("#status").textContent="Locatie bepalen…";navigator.geolocation.getCurrentPosition(p=>{pos=p.coords;$("#sort").value="distance";$("#near").textContent="✓ Dichtstbij";render();toast("Gesorteerd op afstand")},()=>{toast("Geef locatie-toegang in je browser");render()},{enableHighAccuracy:true,timeout:12000,maximumAge:30000})};
$("#recentBtn").onclick=()=>{mode="recent";q.value="";render()};$("#favBtn").onclick=()=>{mode="fav";q.value="";render()};$("#close").onclick=()=>$("#dlg").close();$("#refresh").onclick=()=>{if("caches"in window)caches.keys().then(a=>Promise.all(a.map(k=>caches.delete(k)))).finally(load);else load()};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));load();
"use strict";
(() => {
  const KEY="hammyOnlineV1";
  const CODE=/^[A-Z2-9]{8}$/;
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  const normalize=s=>String(s||"").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,8);
  const read=()=>{try{return {apiUrl:"",visibility:"unlisted",friends:[],...JSON.parse(localStorage.getItem(KEY)||"{}")} }catch{return {apiUrl:"",visibility:"unlisted",friends:[]}}};
  const write=value=>localStorage.setItem(KEY,JSON.stringify(value));
  const base=()=>{const s=read(),configured=String(s.apiUrl||"").trim().replace(/\/+$/,"");return configured||((location.protocol==="http:"||location.protocol==="https:")?location.origin:"http://localhost:8080")};
  const api=async(path,options={})=>{const r=await fetch(base()+path,{method:options.method||"GET",headers:{"Content-Type":"application/json",...(window.HammyCloud?.authHeaders?.()||{}),...(options.headers||{})},body:options.body===undefined?undefined:JSON.stringify(options.body),cache:"no-store"});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||`Server error ${r.status}`);e.status=r.status;e.data=d;throw e}return d};
  const status=(message,type="")=>{const box=el("onlineStatus");if(box){box.textContent=message;box.className="online-status"+(type?" "+type:"")}};
  const names={bed:"Cozy Bed",sofa:"Tiny Sofa",desk:"Study Desk",plant:"Berry Plant",aquarium:"Aquarium",tunnel:"Play Tunnel",toybox:"Toy Box",bookshelf:"Book Shelf",lamp:"Moon Lamp",rug:"Cloud Rug",wheel:"Deluxe Wheel",snack:"Snack Table",music:"Music Player",castle:"Hamster Castle",giantWheel:"Giant Wheel",bunkBed:"Bunk Bed",gamingDesk:"Gaming Desk",pool:"Indoor Pool",bubbleBath:"Bubble Bath",cinema:"Mini Cinema",musicStage:"Music Stage",capsuleBed:"Capsule Bed",treehouse:"Treehouse",aquariumTunnel:"Aquarium Tunnel",kitchenSet:"Mini Kitchen",trainSet:"Train Set",clawMachine:"Claw Machine",playground:"Playground",portal:"Magic Portal"};
  const rooms={home:"Home",bedroom:"Bedroom",kitchen:"Kitchen",bathroom:"Bathroom",study:"Study Room",music:"Music Room",game:"Game Room",garden:"Garden",rooftop:"Rooftop",aquarium:"Aquarium Room",space:"Space Room",winter:"Winter Cabin",beach:"Beach House"};
  const demos=[
   {
    code:"DEMO2468",nickname:"MapleHammy",visibility:"public",skinColors:{fur:"#f4c2d2",patch:"#e891ad"},
    costume:"Star Pajamas",premium:true,stats:{practiceDays:34,totalFocusMinutes:1280,streak:8,lootLevel:7,sessionCount:52},
    homeBase:{room:"home",wall:"#f6e4ed",floor:"#d9b98e",items:[
      {type:"bed",x:18,y:72,scale:.78,rotation:0,color:"#e4a8c0"},
      {type:"desk",x:21,y:42,scale:.72,rotation:0,color:"#b9895f"},
      {type:"plant",x:82,y:72,scale:.68,rotation:0,color:"#75b879"}
    ]},
    premiumRooms:[
      {room:"garden",wall:"#dff5e9",floor:"#d4b98d",items:[{type:"treehouse",x:24,y:49,scale:.82,rotation:-2,color:"#8c6c4b"},{type:"playground",x:70,y:68,scale:.76,rotation:1,color:"#7ab9d2"}]},
      {room:"bedroom",wall:"#f3dfea",floor:"#d7b286",items:[{type:"bunkBed",x:26,y:55,scale:.82,rotation:-2,color:"#bd7f9e"},{type:"cinema",x:72,y:35,scale:.56,rotation:1,color:"#8c72b8"}]}
    ],
    updatedAt:new Date().toISOString(),demo:true
   },
   {
    code:"DEMO3579",nickname:"FocusNova",visibility:"public",skinColors:{fur:"#554086",patch:"#273d76"},
    costume:"Galaxy Hoodie",premium:true,stats:{practiceDays:81,totalFocusMinutes:3265,streak:19,lootLevel:14,sessionCount:128},
    homeBase:{room:"home",wall:"#e5e1fa",floor:"#cbb18a",items:[
      {type:"sofa",x:30,y:73,scale:.78,rotation:0,color:"#7669b7"},
      {type:"wheel",x:72,y:63,scale:.72,rotation:0,color:"#6e9ed0"},
      {type:"music",x:78,y:42,scale:.66,rotation:0,color:"#7656bd"}
    ]},
    premiumRooms:[
      {room:"space",wall:"#323655",floor:"#5d4760",items:[{type:"capsuleBed",x:25,y:54,scale:.8,rotation:-1,color:"#a7bbd8"},{type:"portal",x:77,y:49,scale:.72,rotation:0,color:"#7d64d8"}]},
      {room:"rooftop",wall:"#b8d7f0",floor:"#9c8d9f",items:[{type:"giantWheel",x:29,y:57,scale:.84,rotation:0,color:"#7c72ca"},{type:"portal",x:75,y:49,scale:.72,rotation:0,color:"#825ed5"}]}
    ],
    updatedAt:new Date().toISOString(),demo:true
   },
   {
    code:"DEMO4682",nickname:"BerryBuilder",visibility:"public",skinColors:{fur:"#ffffff",patch:"transparent"},
    costume:"Garden Overalls",premium:false,stats:{practiceDays:16,totalFocusMinutes:640,streak:5,lootLevel:4,sessionCount:31},
    homeBase:{room:"home",wall:"#eee4ff",floor:"#e6c59d",items:[
      {type:"bed",x:18,y:72,scale:.8,rotation:0,color:"#d7a7c4"},
      {type:"desk",x:20,y:41,scale:.75,rotation:0,color:"#b7895e"},
      {type:"plant",x:83,y:72,scale:.72,rotation:0,color:"#75b879"},
      {type:"wheel",x:70,y:63,scale:.72,rotation:0,color:"#7aaed4"}
    ]},
    premiumRooms:[],updatedAt:new Date().toISOString(),demo:true
   }
  ];
  let page=0,hasMore=true,loading=false,profiles=[];
  function avatar(p){const c=p.skinColors||{};return `<div class="online-avatar" style="--avatar-fur:${esc(c.fur||"#fff")};--avatar-patch:${esc(c.patch||"transparent")};--avatar-bg:${p.premium?"#d7c5fa":"#e7def3"}"><span class="ear left"></span><span class="ear right"></span><span class="face"></span><span class="patch"></span><span class="eye left"></span><span class="eye right"></span><span class="nose"></span></div>`}
  function homeBase(p){
    if(p.homeBase&&p.homeBase.room==="home")return p.homeBase;
    if(p.base&&p.base.room==="home")return p.base;
    return {room:"home",wall:"#eee4ff",floor:"#e6c59d",items:[]};
  }
  function premiumRooms(p){
    return p.premium&&Array.isArray(p.premiumRooms)?p.premiumRooms.filter(room=>room&&room.room!=="home"):[];
  }
  function baseView(p,override=null){
    const b=override||homeBase(p);
    const items=(b.items||[]).slice(0,30).map(i=>names[i.type]?`<div class="online-base-item" style="left:${clamp(i.x,4,96)}%;top:${clamp(i.y,12,92)}%;--rotation:${clamp(i.rotation,-180,180)}deg;--scale:${clamp(i.scale,.5,1.6)};--item-color:${/^#[0-9a-f]{6}$/i.test(i.color||"")?i.color:"#a88fd5"}"><span>${esc(names[i.type])}</span></div>`:"").join("");
    return `<div class="online-base" style="--base-wall:${/^#[0-9a-f]{6}$/i.test(b.wall||"")?b.wall:"#eadffc"};--base-floor:${/^#[0-9a-f]{6}$/i.test(b.floor||"")?b.floor:"#dfbf91"}"><div class="online-base-window"></div>${items}<div class="online-base-hamster">${avatar(p)}</div></div>`;
  }
  function shareUrl(code){const u=new URL(location.href);u.searchParams.set("profile",normalize(code));u.hash="";return u.toString()}
  async function share(p){const url=shareUrl(p.code),data={title:`${p.nickname}'s Hammy Focus House`,text:`Visit ${p.nickname}'s hamster stats and base.`,url};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(url);status("Profile link copied.","success")}}catch(e){if(e.name!=="AbortError")status("Could not share the link.","error")}}
  function open(p){window.HammyOnlineRooms?.showProfile?.(p,false)}
  async function saveFriend(p){
    const s=read();s.friends=Array.isArray(s.friends)?s.friends:[];if(!s.friends.includes(p.code))s.friends.push(p.code);
    s.cachedFriends=Array.isArray(s.cachedFriends)?s.cachedFriends:[];s.cachedFriends=[...s.cachedFriends.filter(x=>x.code!==p.code),p];write(s);
    try{
      if(!p.demo){
        if(!window.HammyCloud?.isSignedIn?.())throw new Error("Create or restore a cloud account first.");
        await api("/api/friends",{method:"POST",body:{code:p.code}});
      }
      status(`${p.nickname} saved as a friend.`,"success");
      open(p);
    }catch(error){status(error.message||"Could not save this friend.","error")}
  }
  function card(p){
    const s=p.stats||{},roomsForPremium=premiumRooms(p),article=document.createElement("article");
    article.className="online-friend-card gallery-profile-card";article.dataset.galleryCode=p.code;
    article.innerHTML=`<div class="online-mini-profile">${avatar(p)}<div><strong>${esc(p.nickname)}</strong><p class="muted">${esc(p.costume||"No costume")}${p.premium?" · Premium":""}</p><div class="online-mini-stats"><div class="online-mini-stat"><strong>${clamp(s.practiceDays,0,999999)}</strong><span>Days</span></div><div class="online-mini-stat"><strong>${clamp(s.streak,0,999999)}</strong><span>Streak</span></div><div class="online-mini-stat"><strong>${clamp(s.lootLevel,1,999999)}</strong><span>Loot Lv.</span></div></div></div></div>
      ${roomsForPremium.length?'<div class="premium-avatar-hint gallery-avatar-hint">Tap either hamster for Premium rooms</div>':""}
      <div class="gallery-room-title">Normal Home Room</div>
      <div class="gallery-base-peek">${baseView(p,homeBase(p))}</div>
      ${p.demo?"":`<div class="gallery-reaction-summary">♥ ${clamp(p.reactions?.heart,0,999999)} · ★ ${clamp(p.reactions?.star,0,999999)} · ⌂ ${clamp(p.reactions?.cozy,0,999999)} · ✦ ${clamp(p.reactions?.creative,0,999999)}</div>`}
      <div class="online-actions"></div>`;

    if(roomsForPremium.length){
      const openPremium=event=>{
        event?.stopPropagation();
        window.HammyOnlineRooms?.showPremiumRooms(p);
      };
      article.querySelectorAll(".online-avatar").forEach(avatarEl=>{
        avatarEl.classList.add("premium-avatar-button");
        avatarEl.setAttribute("role","button");
        avatarEl.setAttribute("tabindex","0");
        avatarEl.setAttribute("aria-label",`Open ${p.nickname}'s Premium rooms`);
        avatarEl.setAttribute("title","Tap to view Premium rooms");
        const badge=document.createElement("span");
        badge.className="premium-room-avatar-badge";
        badge.textContent="★";
        badge.setAttribute("aria-hidden","true");
        avatarEl.appendChild(badge);
        avatarEl.addEventListener("click",openPremium);
        avatarEl.addEventListener("keydown",event=>{
          if(event.key==="Enter"||event.key===" "){event.preventDefault();openPremium(event)}
        });
      });
    }

    const actions=article.querySelector(".online-actions");
    const alreadySaved=(read().friends||[]).includes(p.code);
    [["View Home Room","primary",()=>open(p)],["Share","secondary",()=>share(p)],[alreadySaved?"Saved":"Save friend","secondary",()=>{if(!alreadySaved)saveFriend(p)}]].forEach(([text,className,handler])=>{
      const button=document.createElement("button");button.textContent=text;button.className=className;button.addEventListener("click",handler);actions.appendChild(button);
    });
    return article;
  }
  function render(){const g=el("publicGalleryGrid");if(!g)return;g.innerHTML="";if(!profiles.length){g.innerHTML='<div class="online-empty">No public profiles yet. Publish yours as Public to appear here.</div>';return}profiles.forEach(p=>g.appendChild(card(p)))}
  async function load(reset=false){if(loading||(!hasMore&&!reset))return;if(reset){page=0;hasMore=true;profiles=[];render()}loading=true;el("galleryLoading").classList.remove("hidden");try{const sort=el("gallerySort").value;const d=await api(`/api/gallery?page=${page}&limit=12&sort=${encodeURIComponent(sort)}`);const incoming=Array.isArray(d.profiles)?d.profiles:[];const seen=new Set(profiles.map(p=>p.code));incoming.forEach(p=>{if(!seen.has(p.code)){profiles.push(p);seen.add(p.code)}});page++;hasMore=Boolean(d.hasMore);render();status(`Loaded ${profiles.length} public profile${profiles.length===1?"":"s"}.`,"success")}catch(e){if(page===0){profiles=[...demos];hasMore=false;render();status("Showing demo gallery because the online server is not connected.","")}else status(e.message||"Could not load gallery.","error")}finally{loading=false;el("galleryLoading").classList.add("hidden");el("loadMoreGallery").classList.toggle("hidden",!hasMore)}}
  async function openLink(){const code=normalize(new URL(location.href).searchParams.get("profile"));if(!CODE.test(code))return;document.querySelector('[data-page="online"]')?.click();el("friendCodeInput").value=code;setTimeout(()=>el("viewFriendCode").click(),100)}
  function replaceProfile(updated){
    const index=profiles.findIndex(profile=>profile.code===updated.code);
    if(index>=0){profiles[index]=updated;render()}
  }
  function removeProfile(code){
    profiles=profiles.filter(profile=>profile.code!==code);
    render();
  }
  function init(){
    if(!el("publicGalleryGrid"))return;
    const s=read();
    el("onlineVisibility").value=s.visibility||"unlisted";
    el("onlineVisibility").addEventListener("change",()=>{const x=read();x.visibility=el("onlineVisibility").value;write(x)});
    el("shareMyProfile").addEventListener("click",()=>{const x=read();if(x.code)share({code:x.code,nickname:x.nickname||"My Hamster"})});
    el("refreshGallery").addEventListener("click",()=>load(true));
    el("gallerySort").addEventListener("change",()=>load(true));
    el("loadMoreGallery").addEventListener("click",()=>load(false));
    const observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)&&hasMore)load(false)},{rootMargin:"220px"});
    observer.observe(el("gallerySentinel"));
    document.querySelector('[data-page="online"]')?.addEventListener("click",()=>{if(!profiles.length)load(true)});
    window.addEventListener("hammy-profile-filtered",event=>removeProfile(event.detail?.code));
    window.addEventListener("hammy-profile-updated",event=>{if(event.detail?.profile)replaceProfile(event.detail.profile)});
    window.addEventListener("hammy-gallery-refresh",()=>load(true));
    window.addEventListener("hammy-cloud-account",()=>load(true));
    load(true);openLink();
  }
  init();
})();

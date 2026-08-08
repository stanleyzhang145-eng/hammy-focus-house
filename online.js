"use strict";
(() => {
  const ONLINE_KEY="hammyOnlineV1";
  const SAFE_NAME=/^[A-Za-z0-9][A-Za-z0-9 ]{1,14}[A-Za-z0-9]$/;
  const FRIEND_CODE=/^[A-Z2-9]{8}$/;
  const freeFurniturePositions={
    bed:[18,72],sofa:[38,74],desk:[19,39],plant:[82,72],aquarium:[82,38],
    tunnel:[16,57],toybox:[68,74],bookshelf:[90,43],lamp:[48,71],rug:[53,81],
    wheel:[72,62],snack:[61,46],music:[76,41],castle:[39,43]
  };
  const itemNames={
    bed:"Cozy Bed",sofa:"Tiny Sofa",desk:"Study Desk",plant:"Berry Plant",aquarium:"Aquarium",
    tunnel:"Play Tunnel",toybox:"Toy Box",bookshelf:"Book Shelf",lamp:"Moon Lamp",rug:"Cloud Rug",
    wheel:"Deluxe Wheel",snack:"Snack Table",music:"Music Player",castle:"Hamster Castle",
    giantWheel:"Giant Wheel",bunkBed:"Bunk Bed",gamingDesk:"Gaming Desk",pool:"Indoor Pool",
    bubbleBath:"Bubble Bath",cinema:"Mini Cinema",musicStage:"Music Stage",capsuleBed:"Capsule Bed",
    treehouse:"Treehouse",aquariumTunnel:"Aquarium Tunnel",kitchenSet:"Mini Kitchen",
    trainSet:"Train Set",clawMachine:"Claw Machine",playground:"Playground",portal:"Magic Portal"
  };
  const roomNames={
    bedroom:"Bedroom",kitchen:"Kitchen",bathroom:"Bathroom",study:"Study Room",music:"Music Room",
    game:"Game Room",garden:"Garden",rooftop:"Rooftop",aquarium:"Aquarium Room",space:"Space Room",
    winter:"Winter Cabin",beach:"Beach House",home:"Home"
  };
  const demoProfiles=[
    {
      code:"DEMO2468",nickname:"MapleHammy",skin:"sakura",skinColors:{fur:"#f4c2d2",fur2:"#fff0f5",patch:"#e891ad"},
      costume:"Star Pajamas",premium:true,stats:{practiceDays:34,totalFocusMinutes:1280,streak:8,lootLevel:7,sessionCount:52},
      base:{room:"garden",wall:"#dff5e9",floor:"#d4b98d",items:[
        {type:"treehouse",x:24,y:49,scale:.82,rotation:-2,color:"#8c6c4b"},
        {type:"playground",x:70,y:68,scale:.76,rotation:1,color:"#7ab9d2"},
        {type:"trainSet",x:48,y:80,scale:.58,rotation:0,color:"#d78666"}
      ]},updatedAt:new Date().toISOString(),demo:true
    },
    {
      code:"DEMO3579",nickname:"FocusNova",skin:"galaxy",skinColors:{fur:"#554086",fur2:"#cbbaf5",patch:"#273d76"},
      costume:"Galaxy Hoodie",premium:true,stats:{practiceDays:81,totalFocusMinutes:3265,streak:19,lootLevel:14,sessionCount:128},
      base:{room:"space",wall:"#323655",floor:"#5d4760",items:[
        {type:"capsuleBed",x:25,y:54,scale:.8,rotation:-1,color:"#a7bbd8"},
        {type:"portal",x:77,y:49,scale:.72,rotation:0,color:"#7d64d8"},
        {type:"gamingDesk",x:51,y:68,scale:.62,rotation:0,color:"#566f91"}
      ]},updatedAt:new Date().toISOString(),demo:true
    },
    {
      code:"DEMO4682",nickname:"BerryBuilder",skin:"white",skinColors:{fur:"#ffffff",fur2:"#f7f5f1",patch:"transparent"},
      costume:"Garden Overalls",premium:false,stats:{practiceDays:16,totalFocusMinutes:640,streak:5,lootLevel:4,sessionCount:31},
      base:{room:"home",wall:"#eee4ff",floor:"#e6c59d",items:[
        {type:"bed",x:18,y:72,scale:.8,rotation:0,color:"#d7a7c4"},
        {type:"desk",x:20,y:41,scale:.75,rotation:0,color:"#b7895e"},
        {type:"plant",x:83,y:72,scale:.72,rotation:0,color:"#75b879"},
        {type:"wheel",x:70,y:63,scale:.72,rotation:0,color:"#7aaed4"}
      ]},updatedAt:new Date().toISOString(),demo:true
    }
  ];


  // v18 demo profiles always show a normal Home room first.
  demoProfiles[0].homeBase={room:"home",wall:"#f6e4ed",floor:"#d9b98e",items:[
    {type:"bed",x:18,y:72,scale:.78,rotation:0,color:"#e4a8c0"},
    {type:"desk",x:21,y:42,scale:.72,rotation:0,color:"#b9895f"},
    {type:"plant",x:82,y:72,scale:.68,rotation:0,color:"#75b879"},
    {type:"rug",x:51,y:81,scale:.82,rotation:0,color:"#d9c5f2"}
  ]};
  demoProfiles[0].premiumRooms=[demoProfiles[0].base,{
    room:"bedroom",wall:"#f3dfea",floor:"#d7b286",items:[
      {type:"bunkBed",x:26,y:55,scale:.82,rotation:-2,color:"#bd7f9e"},
      {type:"cinema",x:72,y:35,scale:.56,rotation:1,color:"#8c72b8"}
    ]
  }];
  demoProfiles[0].base=demoProfiles[0].homeBase;

  demoProfiles[1].homeBase={room:"home",wall:"#e5e1fa",floor:"#cbb18a",items:[
    {type:"sofa",x:30,y:73,scale:.78,rotation:0,color:"#7669b7"},
    {type:"wheel",x:72,y:63,scale:.72,rotation:0,color:"#6e9ed0"},
    {type:"music",x:78,y:42,scale:.66,rotation:0,color:"#7656bd"},
    {type:"lamp",x:48,y:71,scale:.64,rotation:0,color:"#e8ca5d"}
  ]};
  demoProfiles[1].premiumRooms=[demoProfiles[1].base,{
    room:"rooftop",wall:"#b8d7f0",floor:"#9c8d9f",items:[
      {type:"giantWheel",x:29,y:57,scale:.84,rotation:0,color:"#7c72ca"},
      {type:"portal",x:75,y:49,scale:.72,rotation:0,color:"#825ed5"}
    ]
  }];
  demoProfiles[1].base=demoProfiles[1].homeBase;

  demoProfiles[2].homeBase=demoProfiles[2].base;
  demoProfiles[2].premiumRooms=[];
  demoProfiles[2].base=demoProfiles[2].homeBase;

  let onlineState;
  try{
    onlineState={apiUrl:"",nickname:"HammyFan",visibility:"unlisted",code:null,token:null,friends:[],...JSON.parse(localStorage.getItem(ONLINE_KEY)||"{}")};
  }catch{
    onlineState={apiUrl:"",nickname:"HammyFan",visibility:"unlisted",code:null,token:null,friends:[]};
  }
  if(!Array.isArray(onlineState.friends))onlineState.friends=[];
  if(!["public","unlisted"].includes(onlineState.visibility))onlineState.visibility="unlisted";

  const el=id=>document.getElementById(id);
  const saveOnline=()=>localStorage.setItem(ONLINE_KEY,JSON.stringify(onlineState));
  const normalizeCode=value=>String(value||"").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,8);
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const apiBase=()=>{
    const configured=String(onlineState.apiUrl||"").trim().replace(/\/+$/,"");
    if(configured)return configured;
    if(location.protocol==="http:"||location.protocol==="https:")return location.origin;
    return "http://localhost:8080";
  };
  function apiUrl(path){return apiBase()+path}
  function setStatus(message,type=""){
    const box=el("onlineStatus");if(!box)return;
    box.textContent=message;box.className="online-status"+(type?" "+type:"");
  }
  function setConnection(state,label){
    const chip=el("onlineConnectionChip");if(!chip)return;
    chip.className="online-chip "+state;chip.textContent=label;
  }
  async function apiRequest(path,options={}){
    const cloudHeaders=window.HammyCloud?.authHeaders?.()||{};
    const response=await fetch(apiUrl(path),{
      method:options.method||"GET",
      headers:{"Content-Type":"application/json",...cloudHeaders,...(options.headers||{})},
      body:options.body===undefined?undefined:JSON.stringify(options.body),
      cache:"no-store",
      signal:options.signal
    });
    let data={};
    try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Server error ${response.status}`);
    return data;
  }
  async function checkConnection(showMessage=true){
    setConnection("connecting","Connecting");
    try{
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
      const result=await apiRequest("/api/health",{signal:controller.signal});clearTimeout(timeout);
      if(result.databaseReady!==true){
        setConnection("offline","Database setup needed");
        if(showMessage)setStatus("The website is online, but Render PostgreSQL is not connected yet. Gallery demos still work.","error");
        return false;
      }
      setConnection("online","Online");
      if(showMessage)setStatus(`Connected to ${result.name||"Hammy Cloud server"}.`,"success");
      return true;
    }catch(error){
      setConnection("offline","Offline");
      if(showMessage)setStatus("The online server is not connected yet. Demo profiles still work, but real friend codes need the included server to be hosted.","error");
      return false;
    }
  }

  function currentSkinColors(){
    const s=(typeof skins!=="undefined"&&skins[state.skin])||{};
    if(state.skin==="custom"&&state.customSkin)return {fur:state.customSkin.fur||"#fff",fur2:state.customSkin.fur2||"#f7f5f1",patch:state.customSkin.patch||"transparent"};
    return {fur:s.fur||"#fff",fur2:s.fur2||"#f7f5f1",patch:s.patch||"transparent"};
  }
  function currentCostumeName(){
    if(!state.equipped)return "No costume";
    return typeof clothes!=="undefined"&&clothes[state.equipped]?clothes[state.equipped].name:"Costume";
  }
  function collectFreeBase(){
    const items=[];
    Object.entries(state.placedFurniture||{}).forEach(([type,placed])=>{
      if(!placed)return;
      const pos=freeFurniturePositions[type]||[50,65];
      items.push({type,x:pos[0],y:pos[1],scale:.72,rotation:0,color:(state.premiumFurnitureColors||{})[type]||"#a88fd5"});
    });
    return {room:"home",wall:"#eee4ff",floor:"#e6c59d",items:items.slice(0,20)};
  }
  function cleanSharedBase(room,source,wall="#e7ddf8",floor="#d4b98d"){
    const items=Object.values(source||{}).filter(Boolean).slice(0,20).map(item=>({
      type:String(item.type||"").slice(0,32),
      x:clamp(item.x,4,96),y:clamp(item.y,12,92),
      scale:clamp(item.scale,.5,1.6),rotation:clamp(item.rotation,-180,180),
      color:/^#[0-9a-f]{6}$/i.test(item.color||"")?item.color:"#8b63d9"
    })).filter(item=>itemNames[item.type]);
    return {room,wall, floor,items};
  }
  function collectPremiumRooms(){
    const result=[];
    const decor=state.premiumDecor&&typeof state.premiumDecor==="object"?state.premiumDecor:{};
    Object.keys(roomNames).filter(room=>room!=="home").forEach(room=>{
      const source=decor[room];
      if(!source||typeof source!=="object")return;
      const colors=(state.roomColors&&state.roomColors[room])||{};
      result.push(cleanSharedBase(room,source,colors.wall||"#e7ddf8",colors.floor||"#d4b98d"));
    });
    return result.slice(0,12);
  }
  function snapshotProfile(){
    const premium=Boolean(state.premium||state.premiumDemoEntitlement);
    const nickname=String(el("onlineNickname")?.value||onlineState.nickname||"").trim().replace(/\s+/g," ");
    if(!SAFE_NAME.test(nickname))throw new Error("Use a nickname with 3–16 letters, numbers, or spaces.");
    onlineState.nickname=nickname;
    const totalMinutes=Math.round(Number(state.totalFocusMinutes)||0);
    const lootLevel=typeof getLootLevel==="function"?getLootLevel():Math.max(1,Math.floor(totalMinutes/120)+1);
    const homeBase=collectFreeBase();
    return {
      nickname,
      visibility:el("onlineVisibility")?.value==="public"?"public":"unlisted",
      skin:String(state.skin||"white").slice(0,32),
      skinColors:currentSkinColors(),
      costume:currentCostumeName().slice(0,40),
      premium,
      stats:{
        practiceDays:clamp(state.practiceDays,0,100000),
        totalFocusMinutes:clamp(totalMinutes,0,10000000),
        streak:clamp(state.streak,0,100000),
        lootLevel:clamp(lootLevel,1,100000),
        sessionCount:clamp(state.sessionCount,0,1000000)
      },
      homeBase,
      base:homeBase,
      premiumRooms:premium?collectPremiumRooms():[]
    };
  }
  function avatarMarkup(profile){
    const colors=profile.skinColors||{};
    const special=["galaxy","golden","sakura","frost","rainbow"].includes(profile.skin)?"<span class='sparkle'>✦</span>":"";
    return `<div class="online-avatar" style="--avatar-fur:${escapeHtml(colors.fur||"#fff")};--avatar-patch:${escapeHtml(colors.patch||"transparent")};--avatar-bg:${profile.premium?"#d7c5fa":"#e7def3"}">
      <span class="ear left"></span><span class="ear right"></span><span class="face"></span><span class="patch"></span>
      <span class="eye left"></span><span class="eye right"></span><span class="nose"></span>${special}
    </div>`;
  }
  function miniProfileMarkup(profile){
    const stats=profile.stats||{};
    return `<div class="online-mini-profile">
      ${avatarMarkup(profile)}
      <div><strong data-i18n-skip="true">${escapeHtml(profile.nickname||"Hammy Friend")}</strong><p class="muted">${escapeHtml(profile.costume||"No costume")}${profile.premium?" · Premium":""}</p>
       <div class="online-mini-stats">
        <div class="online-mini-stat"><strong>${clamp(stats.practiceDays,0,999999)}</strong><span>Days</span></div>
        <div class="online-mini-stat"><strong>${clamp(stats.streak,0,999999)}</strong><span>Streak</span></div>
        <div class="online-mini-stat"><strong>${clamp(stats.lootLevel,1,999999)}</strong><span>Loot Lv.</span></div>
       </div>
      </div>
    </div>`;
  }
  function renderMyPreview(){
    const box=el("myOnlinePreview");if(!box)return;
    let profile;
    try{profile=snapshotProfile()}catch{profile={nickname:onlineState.nickname||"HammyFan",skin:state.skin||"white",skinColors:currentSkinColors(),costume:currentCostumeName(),premium:Boolean(state.premium),stats:{practiceDays:state.practiceDays||0,streak:state.streak||0,lootLevel:typeof getLootLevel==="function"?getLootLevel():1}}}
    box.innerHTML=miniProfileMarkup(profile);
    const hasCode=Boolean(onlineState.code);
    el("myFriendCodeBox").classList.toggle("hidden",!hasCode);
    el("myFriendCode").textContent=onlineState.code||"--------";
    el("copyFriendCode").disabled=!hasCode;
    if(el("shareMyProfile"))el("shareMyProfile").disabled=!hasCode;
    if(el("removeFromGallery"))el("removeFromGallery").disabled=!hasCode||onlineState.visibility!=="public";
    el("deleteOnlineProfile").disabled=!hasCode;
    el("publishOnlineProfile").textContent=hasCode?"Update shared profile":"Publish profile";
  }

  function homeBaseFor(profile){
    if(profile.homeBase&&profile.homeBase.room==="home")return profile.homeBase;
    if(profile.base&&profile.base.room==="home")return profile.base;
    return {room:"home",wall:"#eee4ff",floor:"#e6c59d",items:[]};
  }
  function premiumRoomsFor(profile){
    if(!profile.premium||!Array.isArray(profile.premiumRooms))return [];
    return profile.premiumRooms.filter(base=>base&&base.room&&base.room!=="home").slice(0,12);
  }
  function baseMarkup(profile,baseOverride=null){
    const base=baseOverride||homeBaseFor(profile);
    const items=(Array.isArray(base.items)?base.items:[]).slice(0,30).map(item=>{
      const type=String(item.type||"");
      if(!itemNames[type])return "";
      return `<div class="online-base-item" style="left:${clamp(item.x,4,96)}%;top:${clamp(item.y,12,92)}%;--rotation:${clamp(item.rotation,-180,180)}deg;--scale:${clamp(item.scale,.5,1.6)};--item-color:${/^#[0-9a-f]{6}$/i.test(item.color||"")?item.color:"#a88fd5"}"><span>${escapeHtml(itemNames[type])}</span></div>`;
    }).join("");
    return `<div class="online-base" style="--base-wall:${/^#[0-9a-f]{6}$/i.test(base.wall||"")?base.wall:"#eadffc"};--base-floor:${/^#[0-9a-f]{6}$/i.test(base.floor||"")?base.floor:"#dfbf91"}">
      <div class="online-base-window"></div>${items}
      <div class="online-base-hamster">${avatarMarkup(profile)}</div>
    </div>`;
  }
  function showPremiumRooms(profile){
    const premiumRooms=premiumRoomsFor(profile);
    if(!premiumRooms.length)return;
    const modal=el("onlineProfileModal"),content=el("onlineModalContent");
    let activeIndex=0;
    el("onlineModalTitle").textContent=`${profile.nickname||"Hammy Friend"}'s Premium House`;

    const renderRoom=()=>{
      const room=premiumRooms[activeIndex];
      content.innerHTML=`<div class="premium-room-owner">
        ${avatarMarkup(profile)}
        <div><strong data-i18n-skip="true">${escapeHtml(profile.nickname||"Hammy Friend")}</strong><p class="muted">Premium room collection</p></div>
       </div>
       <div id="premiumRoomTabs" class="premium-room-tabs"></div>
       <h3 id="premiumRoomTitle" class="premium-room-title">${escapeHtml(roomNames[room.room]||"Premium Room")}</h3>
       <div id="premiumRoomCanvas">${baseMarkup(profile,room)}</div>
       <p class="muted premium-room-note">These rooms are shown only because this player has Premium. Their normal Home room remains the main public base.</p>
       <button id="backToHomeProfile" class="secondary">Back to Home room</button>`;

      const tabs=content.querySelector("#premiumRoomTabs");
      premiumRooms.forEach((base,index)=>{
        const button=document.createElement("button");
        button.className=index===activeIndex?"active":"";
        button.textContent=roomNames[base.room]||"Premium Room";
        button.addEventListener("click",()=>{activeIndex=index;renderRoom()});
        tabs.appendChild(button);
      });
      content.querySelector("#backToHomeProfile").addEventListener("click",()=>showProfile(profile,false));
    };
    renderRoom();
    modal.classList.remove("hidden");
  }
  function attachPremiumAvatarAction(container,profile){
    const rooms=premiumRoomsFor(profile);
    if(!rooms.length)return;
    const avatars=[...container.querySelectorAll(".online-avatar")];
    avatars.forEach(avatar=>{
      if(avatar.dataset.premiumRoomBound==="1")return;
      avatar.dataset.premiumRoomBound="1";
      avatar.classList.add("premium-avatar-button");
      avatar.setAttribute("role","button");
      avatar.setAttribute("tabindex","0");
      avatar.setAttribute("aria-label",`Open ${profile.nickname||"this player's"} Premium rooms`);
      avatar.setAttribute("title","Tap to view Premium rooms");
      const badge=document.createElement("span");
      badge.className="premium-room-avatar-badge";
      badge.textContent="★";
      badge.setAttribute("aria-hidden","true");
      avatar.appendChild(badge);
      const openRooms=event=>{
        event?.stopPropagation();
        showPremiumRooms(profile);
      };
      avatar.addEventListener("click",openRooms);
      avatar.addEventListener("keydown",event=>{
        if(event.key==="Enter"||event.key===" "){event.preventDefault();openRooms(event)}
      });
    });
  }
  function reactionCounts(profile){
    return {heart:0,star:0,cozy:0,creative:0,...(profile.reactions||{})};
  }
  function reactionMarkup(profile){
    const counts=reactionCounts(profile);
    const options=[
      ["heart","♥","Heart"],["star","★","Star"],["cozy","⌂","Cozy"],["creative","✦","Creative"]
    ];
    return `<div class="reaction-strip">${options.map(([key,icon,label])=>
      `<button class="reaction-button ${profile.myReaction===key?"selected":""}" data-reaction="${key}">${icon} ${label} <span>${clamp(counts[key],0,999999)}</span></button>`
    ).join("")}</div>`;
  }
  async function saveFriendToCloud(profile){
    if(profile.demo||!FRIEND_CODE.test(profile.code||""))return;
    try{
      await apiRequest("/api/friends",{method:"POST",body:{code:profile.code}});
    }catch(error){
      setStatus(error.message||"Could not save this friend to the cloud.","error");
    }
  }
  async function updateReaction(profile,reaction){
    if(!window.HammyCloud?.isSignedIn?.())return setStatus("Create or restore a cloud account before reacting.","error");
    try{
      const next=profile.myReaction===reaction?null:reaction;
      const data=await apiRequest(`/api/profiles/${profile.code}/reaction`,{method:"POST",body:{reaction:next}});
      showProfile(data.profile,false);
      setStatus(next?"Reaction saved.":"Reaction removed.","success");
      window.dispatchEvent(new CustomEvent("hammy-profile-updated",{detail:{profile:data.profile}}));
    }catch(error){setStatus(error.message||"Could not save the reaction.","error")}
  }
  async function reportProfile(profile,reason){
    try{
      await apiRequest(`/api/profiles/${profile.code}/report`,{method:"POST",body:{reason}});
      setStatus("Report sent to the moderation list. Thank you.","success");
    }catch(error){setStatus(error.message||"Could not send the report.","error")}
  }
  async function filterProfile(profile,kind){
    const action=kind==="block"?"block":"hide";
    if(kind==="block"&&!confirm(`Block ${profile.nickname}? Their profile will disappear from your gallery and saved-friend list.`))return;
    try{
      await apiRequest(`/api/profiles/${profile.code}/${action}`,{method:"POST",body:{}});
      if(kind==="block"){
        onlineState.friends=onlineState.friends.filter(code=>code!==profile.code);
        onlineState.cachedFriends=(onlineState.cachedFriends||[]).filter(item=>item.code!==profile.code);
        saveOnline();renderFriends();
      }
      el("onlineProfileModal").classList.add("hidden");
      window.dispatchEvent(new CustomEvent("hammy-profile-filtered",{detail:{code:profile.code}}));
      setStatus(kind==="block"?"Profile blocked.":"Profile hidden from your gallery.","success");
    }catch(error){setStatus(error.message||`Could not ${action} the profile.`,"error")}
  }
  function bindProfileActions(content,profile){
    content.querySelectorAll("[data-reaction]").forEach(button=>{
      button.addEventListener("click",()=>updateReaction(profile,button.dataset.reaction));
    });
    const report=content.querySelector("#reportViewedProfile");
    if(report)report.addEventListener("click",()=>{
      const reason=content.querySelector("#profileReportReason")?.value||"other";
      reportProfile(profile,reason);
    });
    content.querySelector("#hideViewedProfile")?.addEventListener("click",()=>filterProfile(profile,"hide"));
    content.querySelector("#blockViewedProfile")?.addEventListener("click",()=>filterProfile(profile,"block"));
  }
  function showProfile(profile,saveFriend=false){
    const modal=el("onlineProfileModal"),content=el("onlineModalContent");
    const stats=profile.stats||{},premiumRooms=premiumRoomsFor(profile);
    const own=Boolean(onlineState.code&&profile.code===onlineState.code);
    el("onlineModalTitle").textContent=`${profile.nickname||"Hammy Friend"}'s profile`;
    content.innerHTML=`<div id="onlineProfileSummary">${miniProfileMarkup(profile)}</div>
      ${premiumRooms.length?'<p class="premium-avatar-hint">Tap either hamster avatar—the profile picture or the hamster inside the Home room—to visit this player’s Premium rooms.</p>':""}
      <div class="online-profile-stats">
       <div class="online-profile-stat"><strong>${clamp(stats.practiceDays,0,999999)}</strong><span>Practice days</span></div>
       <div class="online-profile-stat"><strong>${clamp(stats.totalFocusMinutes,0,99999999)}</strong><span>Focus minutes</span></div>
       <div class="online-profile-stat"><strong>${clamp(stats.streak,0,999999)}</strong><span>Current streak</span></div>
       <div class="online-profile-stat"><strong>${clamp(stats.sessionCount,0,999999)}</strong><span>Sessions</span></div>
      </div>
      <h3 style="margin-top:13px">Normal Home Room</h3>
      ${baseMarkup(profile,homeBaseFor(profile))}
      ${profile.demo?"":`<h3 style="margin-top:13px">Preset reactions</h3>${reactionMarkup(profile)}`}
      ${profile.demo||own?"":`<div class="profile-safety-panel">
       <strong>Safety controls</strong>
       <p class="muted">There is no chat or custom report message.</p>
       <div class="profile-safety-actions">
        <select id="profileReportReason" aria-label="Report reason">
         <option value="inappropriate_nickname">Inappropriate nickname</option>
         <option value="personal_information">Personal information</option>
         <option value="unsafe_content">Unsafe content</option>
         <option value="spam">Spam</option>
         <option value="other">Other preset reason</option>
        </select>
        <button id="reportViewedProfile" class="secondary">Report</button>
        <button id="hideViewedProfile" class="secondary">Hide</button>
        <button id="blockViewedProfile" class="secondary danger-button">Block</button>
       </div>
      </div>`}
      <p class="muted" style="margin-top:8px">Updated ${profile.demo?"in demo mode":new Date(profile.updatedAt||Date.now()).toLocaleDateString()} · No chat, age, school, contact, or location details are shared.</p>`;
    attachPremiumAvatarAction(content,profile);
    bindProfileActions(content,profile);
    modal.classList.remove("hidden");
    if(saveFriend&&!profile.demo&&FRIEND_CODE.test(profile.code||"")){
      if(!onlineState.friends.includes(profile.code))onlineState.friends.push(profile.code);
      onlineState.cachedFriends=[...(onlineState.cachedFriends||[]).filter(item=>item.code!==profile.code),profile];
      onlineState.friends=onlineState.friends.slice(-30);
      saveOnline();renderFriends();saveFriendToCloud(profile);
    }
  }

  window.HammyOnlineRooms={
    showPremiumRooms,
    showProfile,
    premiumRoomsFor,
    homeBaseFor,
    baseMarkup,
    apiRequest
  };

  async function publishProfile(){
    try{
      const connected=await checkConnection(false);
      if(!connected)throw new Error("Connect the Hammy cloud database before publishing.");
      await window.HammyCloud?.ensureAccount?.();
      if(!window.HammyCloud?.isSignedIn?.())throw new Error("Create or restore a cloud account first.");
      const profile=snapshotProfile();
      setStatus("Publishing your safe hamster profile…");
      const data=await apiRequest("/api/profile",{method:"POST",body:{profile}});
      onlineState.code=data.code;
      onlineState.token=null;
      onlineState.visibility=profile.visibility;
      onlineState.nickname=profile.nickname;
      saveOnline();
      renderMyPreview();
      setStatus(`Profile published. Your friend code is ${data.code}.`,"success");
    }catch(error){setStatus(error.message||"Could not publish the profile.","error")}
  }
  async function fetchProfile(code){
    const normalized=normalizeCode(code);
    if(!FRIEND_CODE.test(normalized))throw new Error("Enter an 8-character friend code.");
    const demo=demoProfiles.find(p=>p.code===normalized);
    if(demo)return demo;
    const data=await apiRequest(`/api/profile/${normalized}`);
    return data.profile;
  }
  async function viewCode(){
    const code=normalizeCode(el("friendCodeInput").value);
    el("friendCodeInput").value=code;
    try{
      setStatus(`Looking for ${code}…`);
      const profile=await fetchProfile(code);
      profile.code=code;showProfile(profile,true);setStatus(`${profile.nickname}'s profile loaded.`,"success");
    }catch(error){setStatus(error.message||"Profile not found.","error")}
  }
  async function refreshFriends(){
    setStatus("Refreshing saved Hammy friends…");
    try{
      if(window.HammyCloud?.isSignedIn?.()){
        const data=await apiRequest("/api/friends");
        const real=Array.isArray(data.profiles)?data.profiles:[];
        const demos=demoProfiles.filter(profile=>onlineState.friends.includes(profile.code));
        onlineState.cachedFriends=[...real,...demos];
        onlineState.friends=[...new Set([...real.map(profile=>profile.code),...demos.map(profile=>profile.code)])];
        saveOnline();renderFriends();
        setStatus(`Refreshed ${real.length} cloud friend profile${real.length===1?"":"s"}.`,"success");
        return;
      }
      const results=[];
      for(const code of [...onlineState.friends]){
        try{const profile=await fetchProfile(code);profile.code=code;results.push(profile)}catch{}
      }
      onlineState.cachedFriends=results;saveOnline();renderFriends();
      setStatus(`Refreshed ${results.length} local friend profile${results.length===1?"":"s"}.`,"success");
    }catch(error){setStatus(error.message||"Could not refresh saved friends.","error")}
  }
  function renderFriends(){
    const grid=el("onlineFriendsGrid");if(!grid)return;grid.innerHTML="";
    const cached=Array.isArray(onlineState.cachedFriends)?onlineState.cachedFriends:[];
    const profiles=[
      ...cached.filter(p=>onlineState.friends.includes(p.code)),
      ...demoProfiles.filter(p=>onlineState.friends.includes(p.code))
    ];
    const unique=[];const seen=new Set();
    profiles.forEach(p=>{if(!seen.has(p.code)){seen.add(p.code);unique.push(p)}});
    el("friendCount").textContent=`${onlineState.friends.length} friend${onlineState.friends.length===1?"":"s"}`;
    if(!unique.length){
      grid.innerHTML='<div class="online-empty">No saved friends yet. Enter a friend code or open the demo profiles.</div>';
      return;
    }
    unique.forEach(profile=>{
      const card=document.createElement("article");card.className="online-friend-card";
      card.innerHTML=miniProfileMarkup(profile);
      const actions=document.createElement("div");actions.className="online-actions";
      const view=document.createElement("button");view.className="primary";view.textContent="View base";view.addEventListener("click",()=>showProfile(profile,false));
      const remove=document.createElement("button");remove.className="secondary";remove.textContent="Remove";remove.addEventListener("click",async()=>{
        onlineState.friends=onlineState.friends.filter(code=>code!==profile.code);
        onlineState.cachedFriends=(onlineState.cachedFriends||[]).filter(item=>item.code!==profile.code);
        saveOnline();renderFriends();
        if(!profile.demo&&window.HammyCloud?.isSignedIn?.()){
          try{await apiRequest(`/api/friends/${profile.code}`,{method:"DELETE"})}catch{}
        }
      });
      actions.append(view,remove);card.appendChild(actions);grid.appendChild(card);
    });
  }
  function showDemoFriends(){
    demoProfiles.forEach(profile=>{
      if(!onlineState.friends.includes(profile.code))onlineState.friends.push(profile.code);
    });
    onlineState.cachedFriends=[...(onlineState.cachedFriends||[]),...demoProfiles];
    saveOnline();renderFriends();showProfile(demoProfiles[0],false);
    setStatus("Demo profiles added. Real profiles need the online server.","success");
  }
  async function copyCode(){
    if(!onlineState.code)return;
    try{
      await navigator.clipboard.writeText(onlineState.code);
      setStatus(`Friend code ${onlineState.code} copied.`,"success");
    }catch{
      el("friendCodeInput").value=onlineState.code;
      setStatus("Copy was blocked, so the code was placed in the friend-code box.","error");
    }
  }
  async function removeFromGallery(){
    if(!onlineState.code)return;
    try{
      const data=await apiRequest("/api/profile/visibility",{method:"PATCH",body:{visibility:"unlisted"}});
      onlineState.visibility="unlisted";
      el("onlineVisibility").value="unlisted";
      saveOnline();renderMyPreview();
      setStatus("Your profile is now unlisted and has been removed from the public gallery.","success");
      window.dispatchEvent(new CustomEvent("hammy-gallery-refresh"));
    }catch(error){setStatus(error.message||"Could not remove the profile from the gallery.","error")}
  }
  async function deleteProfile(){
    if(!onlineState.code)return;
    if(!confirm("Delete your shared online profile and friend code? Your cloud game save will remain."))return;
    try{
      await apiRequest("/api/profile",{method:"DELETE",body:{}});
      onlineState.code=null;onlineState.token=null;onlineState.visibility="unlisted";
      saveOnline();renderMyPreview();
      setStatus("Your online profile was deleted. Cloud game progress was not changed.","success");
      window.dispatchEvent(new CustomEvent("hammy-gallery-refresh"));
    }catch(error){setStatus(error.message||"Could not delete the online profile.","error")}
  }
  function saveServer(){
    onlineState.apiUrl=String(el("onlineServerUrl").value||"").trim().replace(/\/+$/,"");
    saveOnline();setStatus("Server address saved. Testing connection…");checkConnection(true);
  }
  function init(){
    if(!el("onlinePage"))return;
    el("onlineNickname").value=onlineState.nickname||"HammyFan";
    el("onlineVisibility").value=onlineState.visibility||"unlisted";
    el("onlineServerUrl").value=onlineState.apiUrl||"";
    el("friendCodeInput").addEventListener("input",e=>{e.target.value=normalizeCode(e.target.value)});
    el("onlineNickname").addEventListener("input",()=>{onlineState.nickname=el("onlineNickname").value;saveOnline();renderMyPreview()});
    el("publishOnlineProfile").addEventListener("click",publishProfile);
    el("copyFriendCode").addEventListener("click",copyCode);
    el("removeFromGallery").addEventListener("click",removeFromGallery);
    el("deleteOnlineProfile").addEventListener("click",deleteProfile);
    el("viewFriendCode").addEventListener("click",viewCode);
    el("refreshFriends").addEventListener("click",refreshFriends);
    el("showDemoFriends").addEventListener("click",showDemoFriends);
    el("saveOnlineServer").addEventListener("click",saveServer);
    el("testOnlineServer").addEventListener("click",()=>checkConnection(true));
    el("closeOnlineModal").addEventListener("click",()=>el("onlineProfileModal").classList.add("hidden"));
    el("onlineProfileModal").addEventListener("click",e=>{if(e.target===el("onlineProfileModal"))el("onlineProfileModal").classList.add("hidden")});
    document.querySelector('[data-page="online"]')?.addEventListener("click",()=>{renderMyPreview();renderFriends();checkConnection(false)});
    window.addEventListener("hammy-cloud-account",event=>{
      const profile=event.detail?.profile;
      if(profile){
        onlineState.code=profile.code;
        onlineState.nickname=profile.nickname||onlineState.nickname;
        onlineState.visibility=profile.visibility||"unlisted";
        onlineState.token=null;
        saveOnline();
        el("onlineNickname").value=onlineState.nickname;
        el("onlineVisibility").value=onlineState.visibility;
        renderMyPreview();
      }
    });
    renderMyPreview();renderFriends();checkConnection(false);
  }
  init();
})();

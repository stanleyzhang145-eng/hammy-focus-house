"use strict";
(() => {
  const CLOUD_KEY="hammyCloudV1";
  const ONLINE_KEY="hammyOnlineV1";
  const SAVE_KEY="hammyV8";
  const DEVICE_KEY="hammyDeviceIdV1";
  const PREVIOUS_ACCOUNTS_KEY="hammyPreviousCloudAccountsV1";
  const PENDING_REPLACEMENT_KEY="hammyPendingCloudReplacementV1";
  const el=id=>document.getElementById(id);

  let meta=readMeta();
  let saveTimer=null;
  let syncing=false;
  let pendingConflict=null;
  let initialized=false;
  let activeEvent=null;
  let activeAnnouncement=null;
  let eventCountdownTimer=null;
  let backgroundTimer=null;
  let backgroundRefreshing=false;
  let ensureAccountPromise=null;
  let healthPromise=null;
  let pullLatestPromise=null;
  let syncPromise=null;
  let accountRefreshPromise=null;
  const requestFlights=new Map();
  const AUTO_REFRESH_MS=45000;

  const exclusiveCatalog={
    solar_crown:{name:"Solar Crown",icon:"♛",description:"A glowing crown above Hammy.",equippable:true,visual:"crown"},
    aurora_aura:{name:"Aurora Aura",icon:"✦",description:"A moving colourful aura around Hammy.",equippable:true,visual:"aura"},
    star_trail:{name:"Star Trail",icon:"★",description:"Several sparkling stars orbit around Hammy.",equippable:true,visual:"stars"},
    crystal_badge:{name:"Crystal Founder Badge",icon:"◆",description:"A glowing crystal badge worn by Hammy.",equippable:true,visual:"badge"},
    golden_trophy:{name:"Golden Focus Trophy",icon:"🏆",description:"A golden trophy displayed inside Hammy's room.",equippable:true,visual:"trophy"},
    neon_frame:{name:"Neon Profile Frame",icon:"▣",description:"A bright animated frame surrounding Hammy.",equippable:true,visual:"frame"}
  };

  function fallbackExclusive(id){
    const label=String(id||"special_item")
      .replace(/[_-]+/g," ")
      .replace(/\b\w/g,letter=>letter.toUpperCase());
    return {
      name:label||"Admin Special Item",
      icon:"✦",
      description:"A special admin-delivered Hammy collectible.",
      equippable:true,
      visual:"custom"
    };
  }
  function exclusiveItem(id){
    return exclusiveCatalog[id]||fallbackExclusive(id);
  }

  function readMeta(){
    try{
      return {
        playerId:null,accessToken:null,recoveryCode:null,revision:0,lastSyncAt:null,
        dirty:false,localUpdatedAt:null,stateHash:null,deviceName:deviceLabel(),
        ...JSON.parse(localStorage.getItem(CLOUD_KEY)||"{}")
      };
    }catch{
      return {playerId:null,accessToken:null,recoveryCode:null,revision:0,lastSyncAt:null,dirty:false,deviceName:deviceLabel()};
    }
  }
  function writeMeta(){
    localStorage.setItem(CLOUD_KEY,JSON.stringify(meta));
    render();
  }
  function deviceLabel(){
    const ua=navigator.userAgent||"";
    if(/iPad/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1))return "iPad";
    if(/iPhone/i.test(ua))return "iPhone";
    if(/Android/i.test(ua))return "Android device";
    if(/Mac/i.test(ua))return "Mac";
    if(/Windows/i.test(ua))return "Windows device";
    return "This device";
  }
  function deviceId(){
    let id=localStorage.getItem(DEVICE_KEY);
    if(!id){
      id=(crypto.randomUUID?crypto.randomUUID():`device-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(DEVICE_KEY,id);
    }
    return id;
  }
  function onlineSettings(){
    try{return JSON.parse(localStorage.getItem(ONLINE_KEY)||"{}")}catch{return {}}
  }
  function baseUrl(){
    const configured=String(onlineSettings().apiUrl||"").trim().replace(/\/+$/,"");
    if(configured)return configured;
    if(location.protocol==="http:"||location.protocol==="https:")return location.origin;
    return "http://localhost:8080";
  }
  function authHeaders(){
    return meta.accessToken?{"Authorization":`Bearer ${meta.accessToken}`}:{};
  }
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  async function performApi(path,options={},attempt=0){
    const method=String(options.method||"GET").toUpperCase();
    let response;
    try{
      response=await fetch(baseUrl()+path,{
        method,
        headers:{"Content-Type":"application/json",...authHeaders(),...(options.headers||{})},
        body:options.body===undefined?undefined:JSON.stringify(options.body),
        cache:"no-store",
        signal:options.signal,
        redirect:"error"
      });
    }catch(error){
      if(method==="GET"&&attempt<2&&error?.name!=="AbortError"){
        await wait(500*(attempt+1));
        return performApi(path,options,attempt+1);
      }
      const friendly=new Error(
        error?.name==="AbortError"
          ?"The cloud request timed out. Your device progress is still safe."
          :"The cloud server could not be reached. Your device progress is still safe."
      );
      friendly.status=0;
      friendly.cause=error;
      throw friendly;
    }

    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{}}catch{
      data={error:raw&&raw.length<240?raw:`Server error ${response.status}`};
    }

    if(!response.ok){
      const retryAfter=Math.max(
        1,
        Math.min(
          8,
          Number(data.retryAfterSeconds||response.headers.get("Retry-After"))||1
        )
      );
      const safeRetry=response.status===429||
        (method==="GET"&&[502,503,504].includes(response.status));

      if(safeRetry&&attempt<2&&options.retry!==false){
        setChip("syncing",`Cloud busy · retrying in ${retryAfter}s`);
        await wait(retryAfter*1000);
        return performApi(path,options,attempt+1);
      }

      const oldLimiterMessage=
        /too many requests/i.test(String(data.error||raw||""));
      const error=new Error(
        oldLimiterMessage
          ?"The deployed cloud server is an older build. Your local progress is safe; deploy v24.4 and try again."
          :(data.error||`Cloud server error ${response.status}`)
      );
      error.status=response.status;
      error.data=data;
      throw error;
    }
    return data;
  }

  function api(path,options={}){
    const method=String(options.method||"GET").toUpperCase();
    const canShare=method==="GET"&&!options.signal;
    const key=canShare?`${method}:${path}`:null;

    if(key&&requestFlights.has(key))return requestFlights.get(key);

    const promise=performApi(path,options).finally(()=>{
      if(key)requestFlights.delete(key);
    });
    if(key)requestFlights.set(key,promise);
    return promise;
  }
  async function apiWithToken(path,token,options={}){
    let response;
    try{
      response=await fetch(baseUrl()+path,{
        method:options.method||"GET",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${token}`,
          ...(options.headers||{})
        },
        body:options.body===undefined?undefined:JSON.stringify(options.body),
        cache:"no-store",
        redirect:"error"
      });
    }catch(error){
      const friendly=new Error(
        "The cloud server could not be reached. No account changes were completed."
      );
      friendly.status=0;
      friendly.cause=error;
      throw friendly;
    }

    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{}}catch{
      data={error:raw||`Server error ${response.status}`};
    }
    if(!response.ok){
      const error=new Error(data.error||`Server error ${response.status}`);
      error.status=response.status;
      error.data=data;
      throw error;
    }
    return data;
  }

  function snapshot(){
    try{
      if(window.HammyGameState?.snapshot){
        return window.HammyGameState.snapshot();
      }
      return JSON.parse(JSON.stringify(state));
    }catch{
      return JSON.parse(localStorage.getItem(SAVE_KEY)||"{}");
    }
  }

  function replaceRunningGameState(nextState,{render=true}={}){
    const normalized=JSON.parse(JSON.stringify(nextState||{}));
    if(window.HammyGameState?.replace){
      return window.HammyGameState.replace(normalized,{render});
    }
    try{
      state=normalized;
    }catch{}
    localStorage.setItem(SAVE_KEY,JSON.stringify(normalized));
    return normalized;
  }
  function stateHash(value){
    const text=JSON.stringify(value||{});
    let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
    return (hash>>>0).toString(16).padStart(8,"0");
  }
  function premiumMode(){
    if(!state?.premium)return "none";
    if(state.premiumDemoEntitlement||localStorage.getItem("hammyPremiumEntitlement")==="demo")return "demo";
    return "store";
  }
  function formatTime(value){
    if(!value)return "Never";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return "Never";
    return date.toLocaleString();
  }
  function progressSummary(value){
    const s=value||{};
    return `${Number(s.practiceDays||0)} practice days · ${Math.floor(Number(s.totalFocusMinutes||0))} focus min · ${Number(s.coins||0)} coins · ${s.premium?"Premium":"Free"}`;
  }
  function setChip(kind,text){
    const chip=el("cloudConnectionChip");if(!chip)return;
    chip.className=`cloud-chip ${kind}`;chip.textContent=text;
  }
  function setCloudActionStatus(message,type=""){
    const box=el("cloudActionMessage");
    if(!box)return;
    box.textContent=message;
    box.className=`cloud-action-message${type?" "+type:""}`;
  }
  function setConflictButtons(disabled){
    ["useCloudSave","keepDeviceSave","cancelCloudConflict"].forEach(id=>{
      if(el(id))el(id).disabled=Boolean(disabled);
    });
  }
  function toast(message,type=""){
    let box=document.querySelector(".cloud-toast");
    if(!box){box=document.createElement("div");box.className="cloud-toast";document.body.appendChild(box)}
    box.className=`cloud-toast${type?" "+type:""}`;box.textContent=message;
    clearTimeout(box._timer);box._timer=setTimeout(()=>box.remove(),3600);
  }
  function syncOnlineProfile(account){
    if(!account?.profile)return;
    const settings=onlineSettings();
    settings.code=account.profile.code;
    settings.nickname=account.profile.nickname||settings.nickname||"HammyFan";
    settings.visibility=account.profile.visibility||"unlisted";
    settings.token=null;
    localStorage.setItem(ONLINE_KEY,JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("hammy-cloud-account",{detail:account}));
  }

  function exclusiveIds(){
    if(!Array.isArray(state?.adminExclusives))return [];
    return [...new Set(
      state.adminExclusives
        .map(id=>String(id||"").trim())
        .filter(Boolean)
    )];
  }
  function ensureExclusiveVisuals(){
    const hamster=document.getElementById("hamster");
    const room=document.getElementById("room");
    if(!hamster||!room)return null;

    let hamsterVisual=document.getElementById("adminExclusiveVisual");
    if(!hamsterVisual){
      hamsterVisual=document.createElement("span");
      hamsterVisual.id="adminExclusiveVisual";
      hamsterVisual.className="admin-exclusive-visual hidden";
      hamsterVisual.setAttribute("aria-hidden","true");
      hamster.appendChild(hamsterVisual);
    }

    let roomVisual=document.getElementById("adminExclusiveRoomVisual");
    if(!roomVisual){
      roomVisual=document.createElement("div");
      roomVisual.id="adminExclusiveRoomVisual";
      roomVisual.className="admin-exclusive-room-visual hidden";
      roomVisual.setAttribute("aria-hidden","true");
      room.appendChild(roomVisual);
    }

    return {hamster,room,hamsterVisual,roomVisual};
  }

  function exclusiveVisualMarkup(id){
    if(id==="solar_crown"){
      return {
        hamster:'<span class="exclusive-crown-gem">♛</span>',
        room:""
      };
    }
    if(id==="aurora_aura"){
      return {
        hamster:"",
        room:'<span class="exclusive-aura-ring ring-a"></span><span class="exclusive-aura-ring ring-b"></span><span class="exclusive-aura-spark s1">✦</span><span class="exclusive-aura-spark s2">✦</span><span class="exclusive-aura-spark s3">✦</span>'
      };
    }
    if(id==="star_trail"){
      return {
        hamster:"",
        room:'<span class="exclusive-orbit-star st1">★</span><span class="exclusive-orbit-star st2">★</span><span class="exclusive-orbit-star st3">★</span><span class="exclusive-orbit-star st4">★</span>'
      };
    }
    if(id==="crystal_badge"){
      return {
        hamster:'<span class="exclusive-crystal-badge">◆</span>',
        room:""
      };
    }
    if(id==="golden_trophy"){
      return {
        hamster:"",
        room:'<span class="exclusive-room-trophy">🏆</span><span class="exclusive-trophy-shine">✦</span>'
      };
    }
    if(id==="neon_frame"){
      return {
        hamster:"",
        room:'<span class="exclusive-neon-frame"></span><span class="exclusive-neon-dot d1"></span><span class="exclusive-neon-dot d2"></span><span class="exclusive-neon-dot d3"></span>'
      };
    }
    return {
      hamster:'<span class="exclusive-custom-item">✦</span>',
      room:""
    };
  }

  function applyExclusiveVisual(){
    const refs=ensureExclusiveVisuals();
    if(!refs)return;

    const owned=exclusiveIds();
    if(!owned.includes(state.equippedAdminExclusive)){
      state.equippedAdminExclusive=null;
    }
    if(
      !state.equippedAdminExclusive &&
      owned.length &&
      state.adminExclusiveDisplayDisabled!==true
    ){
      state.equippedAdminExclusive=owned[owned.length-1];
      localStorage.setItem(SAVE_KEY,JSON.stringify(state));
    }

    const id=String(state.equippedAdminExclusive||"");
    const markup=exclusiveVisualMarkup(id);
    refs.hamster.dataset.adminExclusive=id;
    refs.room.dataset.adminExclusive=id;
    refs.hamsterVisual.dataset.item=id;
    refs.roomVisual.dataset.item=id;
    refs.hamsterVisual.innerHTML=markup.hamster;
    refs.roomVisual.innerHTML=markup.room;
    refs.hamsterVisual.classList.toggle("hidden",!id||!markup.hamster);
    refs.roomVisual.classList.toggle("hidden",!id||!markup.room);
  }

  function equipExclusive(id){
    if(!exclusiveIds().includes(id))return;
    const item=exclusiveItem(id);
    const removing=state.equippedAdminExclusive===id;
    state.equippedAdminExclusive=removing?null:id;
    state.adminExclusiveDisplayDisabled=removing;
    save();
    renderExclusiveCollection();
    applyExclusiveVisual();
    toast(
      state.equippedAdminExclusive
        ?`${item.name} equipped and visible in Hammy's room.`
        :"Exclusive effect removed.",
      "success"
    );
  }

  function renderExclusiveCollection(){
    const grid=el("exclusiveCollection");
    if(!grid)return;
    const ids=exclusiveIds();
    el("exclusiveCount").textContent=String(ids.length);
    grid.innerHTML="";

    if(!ids.length){
      grid.innerHTML='<div class="exclusive-empty">No exclusive items yet. Admin gifts and live events can unlock them.</div>';
      applyExclusiveVisual();
      return;
    }

    ids.forEach(id=>{
      const item=exclusiveItem(id);
      const card=document.createElement("article");
      card.className=`exclusive-item${state.equippedAdminExclusive===id?" equipped":""}`;
      card.dataset.exclusiveId=id;
      card.innerHTML=`<span class="exclusive-item-icon">${item.icon}</span>
        <div><strong>${item.name}</strong><p>${item.description}</p></div>`;

      const button=document.createElement("button");
      button.className=state.equippedAdminExclusive===id?"primary":"secondary";
      button.textContent=state.equippedAdminExclusive===id?"Unequip":"Equip & show";
      button.addEventListener("click",()=>equipExclusive(id));
      card.appendChild(button);
      grid.appendChild(card);
    });

    applyExclusiveVisual();
  }

  function announcementDismissKey(id){return `hammyAnnouncementDismissed:${id}`}
  function renderAnnouncement(){
    const banner=el("playerAnnouncement");
    if(!banner)return;
    const visible=activeAnnouncement&&activeAnnouncement.status==="active"&&
      new Date(activeAnnouncement.startsAt).getTime()<=Date.now()&&
      new Date(activeAnnouncement.endsAt).getTime()>Date.now()&&
      localStorage.getItem(announcementDismissKey(activeAnnouncement.id))!=="1";
    banner.classList.toggle("hidden",!visible);
    if(!visible)return;
    banner.dataset.priority=activeAnnouncement.priority||"normal";
    el("announcementPriorityLabel").textContent={
      important:"IMPORTANT HAMMY NEWS",
      celebration:"HAMMY CELEBRATION",
      normal:"HAMMY NEWS"
    }[activeAnnouncement.priority]||"HAMMY NEWS";
    el("announcementTitle").textContent=activeAnnouncement.title;
    el("announcementText").textContent=activeAnnouncement.message;
  }
  async function loadAnnouncement(){
    try{
      const data=await api("/api/announcements/active");
      activeAnnouncement=data.announcement||null;
      renderAnnouncement();
    }catch{
      activeAnnouncement=null;
      renderAnnouncement();
    }
  }
  function dismissAnnouncement(){
    if(activeAnnouncement)localStorage.setItem(announcementDismissKey(activeAnnouncement.id),"1");
    renderAnnouncement();
  }

  function eventIcon(type){
    return ({
      coin_shower:"🪙",fruit_festival:"🍓",cozy_weekend:"🛏️",
      star_drop:"⭐",aurora_night:"🌌",focus_festival:"🎯",custom:"🎉"
    })[type]||"🎉";
  }
  function formatReward(reward){
    const parts=[];
    if(Number(reward?.coins)>0)parts.push(`${Number(reward.coins)} coins`);
    const fruitNames={apple:"apple",banana:"banana",berry:"berry",mango:"mango"};
    Object.entries(reward?.fruits||{}).forEach(([key,value])=>{
      if(Number(value)>0)parts.push(`${Number(value)} ${fruitNames[key]||key}${Number(value)===1?"":"s"}`);
    });
    if(reward?.exclusiveId)parts.push(exclusiveItem(reward.exclusiveId).name);
    return parts.join(" · ")||"Special reward";
  }
  function eventTimeRemaining(){
    if(!activeEvent)return "";
    const remaining=new Date(activeEvent.endsAt).getTime()-Date.now();
    if(remaining<=0)return "Ended";
    const minutes=Math.floor(remaining/60000);
    const hours=Math.floor(minutes/60);
    const days=Math.floor(hours/24);
    if(days>0)return `${days}d ${hours%24}h`;
    if(hours>0)return `${hours}h ${minutes%60}m`;
    return `${Math.max(1,minutes)}m`;
  }
  function renderActiveEvent(){
    const card=el("liveEventCard");
    if(!card)return;
    const valid=activeEvent&&activeEvent.status==="active"&&new Date(activeEvent.endsAt).getTime()>Date.now();
    card.classList.toggle("hidden",!valid);
    clearInterval(eventCountdownTimer);
    if(!valid)return;
    el("liveEventTitle").textContent=activeEvent.title;
    el("liveEventDescription").textContent=activeEvent.description;
    el("liveEventIcon").textContent=eventIcon(activeEvent.eventType);
    el("liveEventReward").textContent=formatReward(activeEvent.reward);
    el("liveEventTime").textContent=eventTimeRemaining();
    const button=el("claimLiveEvent");
    button.disabled=Boolean(activeEvent.claimed);
    button.textContent=activeEvent.claimed?"Reward claimed":"Claim event reward";
    el("liveEventMessage").textContent=activeEvent.claimed?"This account already claimed the event reward.":"Claim once before the event ends.";
    eventCountdownTimer=setInterval(()=>{
      if(!activeEvent)return clearInterval(eventCountdownTimer);
      el("liveEventTime").textContent=eventTimeRemaining();
      if(new Date(activeEvent.endsAt).getTime()<=Date.now()){
        clearInterval(eventCountdownTimer);
        activeEvent=null;
        renderActiveEvent();
      }
    },30000);
  }
  async function loadActiveEvent(){
    try{
      const data=await api("/api/events/active");
      activeEvent=data.event||null;
      renderActiveEvent();
    }catch(error){
      activeEvent=null;
      renderActiveEvent();
    }
  }
  async function claimActiveEvent(){
    if(!activeEvent)return;
    const button=el("claimLiveEvent");
    if(button)button.disabled=true;
    el("liveEventMessage").textContent="Syncing progress and claiming the event reward…";
    try{
      await ensureAccount();
      await syncNow();
      const result=await api(`/api/events/${activeEvent.id}/claim`,{
        method:"POST",body:{deviceId:deviceId()}
      });
      sessionStorage.setItem("hammyLiveEventNotice",JSON.stringify({
        message:`${activeEvent.title}: ${formatReward(activeEvent.reward)} claimed!`
      }));
      applyCloudState(result.save);
    }catch(error){
      if(error.status===409&&error.data?.alreadyClaimed){
        activeEvent.claimed=true;
        renderActiveEvent();
        el("liveEventMessage").textContent="This account already claimed the event reward.";
      }else{
        el("liveEventMessage").textContent=error.message||"The event reward could not be claimed.";
      }
    }finally{
      if(button&&!activeEvent?.claimed)button.disabled=false;
    }
  }
  function showPendingEventNotice(){
    try{
      const notice=JSON.parse(sessionStorage.getItem("hammyLiveEventNotice")||"null");
      if(!notice)return;
      sessionStorage.removeItem("hammyLiveEventNotice");
      setTimeout(()=>toast(notice.message,"success"),450);
    }catch{sessionStorage.removeItem("hammyLiveEventNotice")}
  }
  async function refreshServerUpdates(){
    if(accountRefreshPromise)return accountRefreshPromise;
    accountRefreshPromise=(async()=>{
      try{
        if(meta.accessToken)await pullLatest({auto:true});
        await Promise.all([loadActiveEvent(),loadAnnouncement()]);
      }catch(error){
        setChip("offline","Cloud retry available");
        return null;
      }
      return true;
    })();
    try{return await accountRefreshPromise}
    finally{accountRefreshPromise=null}
  }

  function render(){
    if(!el("accountPage"))return;
    el("cloudPlayerId").textContent=meta.playerId||"Not created yet";
    el("cloudRecoveryCode").textContent=meta.recoveryCode||"Saved on the device where this account was created";
    el("cloudRevision").textContent=String(meta.revision||0);
    el("cloudLastSync").textContent=formatTime(meta.lastSyncAt);
    el("cloudDeviceName").textContent=meta.deviceName||deviceLabel();
    el("copyPlayerId").disabled=!meta.playerId;
    el("copyRecoveryCode").disabled=!meta.recoveryCode;
    el("copyAccountBackup").disabled=!(meta.playerId&&meta.recoveryCode);
    el("cloudAccountType").textContent=meta.playerId?"Cloud guest":"Offline";
    el("cloudAccountMessage").textContent=meta.playerId
      ?(meta.dirty?"Progress changed on this device and is waiting to sync.":"This device is connected to your Hammy cloud account.")
      :"A guest account will be created when the cloud database is available.";
    el("cloudConflictPanel").classList.toggle("hidden",!pendingConflict);
    if(pendingConflict){
      const local=pendingConflict.localState||snapshot(),remote=pendingConflict.remoteSave?.state||{};
      el("localConflictSummary").textContent=progressSummary(local);
      el("remoteConflictSummary").textContent=progressSummary(remote);
      setChip("conflict","Choose a save");
    }
    renderPreviousAccountBackup();
    renderExclusiveCollection();
    renderActiveEvent();
  }
  async function checkHealthInternal(){
    setChip("syncing","Checking cloud");
    try{
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);
      const health=await api("/api/health",{signal:controller.signal});clearTimeout(timeout);
      const ready=health.databaseReady===true;
      el("cloudSetupWarning")?.classList.toggle("hidden",ready);
      if(!ready){
        setChip("offline","Database setup needed");
        return {ready:false,health};
      }
      setChip(meta.dirty?"syncing":"online",meta.dirty?"Waiting to sync":"Cloud online");
      return {ready:true,health};
    }catch(error){
      el("cloudSetupWarning")?.classList.remove("hidden");
      setChip("offline","Cloud offline");
      return {ready:false,error};
    }
  }
  async function checkHealth(){
    if(healthPromise)return healthPromise;
    healthPromise=checkHealthInternal();
    try{return await healthPromise}
    finally{healthPromise=null}
  }
  async function ensureAccountInternal(){
    if(meta.accessToken&&meta.playerId){
      try{
        const result=await api("/api/account/me");
        syncOnlineProfile(result.account);
        meta.playerId=result.account.playerId;
        if(!Number.isFinite(Number(meta.revision)))meta.revision=0;
        writeMeta();
        return result.account;
      }catch(error){
        if(error.status!==401)throw error;
        if(meta.playerId&&meta.recoveryCode){
          const restored=await api("/api/account/sign-in",{
            method:"POST",
            body:{playerId:meta.playerId,recoveryCode:meta.recoveryCode,deviceId:deviceId()}
          });
          meta.accessToken=restored.accessToken;
          syncOnlineProfile(restored.account);
          writeMeta();
          return restored.account;
        }
        meta.accessToken=null;meta.playerId=null;meta.revision=0;writeMeta();
      }
    }
    if(meta.playerId&&meta.recoveryCode){
      try{
        const restored=await api("/api/account/sign-in",{
          method:"POST",
          body:{
            playerId:meta.playerId,
            recoveryCode:meta.recoveryCode,
            deviceId:deviceId()
          }
        });
        meta.accessToken=restored.accessToken;
        meta.playerId=restored.account.playerId;
        syncOnlineProfile(restored.account);
        writeMeta();
        return restored.account;
      }catch(error){
        if(error.status===401){
          setCloudActionStatus(
            "The saved Player ID and recovery code were rejected. Re-enter them in Restore an account.",
            "error"
          );
          throw error;
        }
        throw error;
      }
    }

    const health=await checkHealth();
    if(!health.ready)return null;
    const localState=snapshot();
    const result=await api("/api/account/guest",{
      method:"POST",
      body:{deviceId:deviceId(),state:localState,premiumMode:premiumMode()}
    });
    meta={
      ...meta,
      playerId:result.account.playerId,
      accessToken:result.accessToken,
      recoveryCode:result.recoveryCode,
      revision:Number(result.account.cloud?.revision||result.account.save?.revision||1),
      lastSyncAt:result.account.cloud?.updatedAt||new Date().toISOString(),
      dirty:false,
      localUpdatedAt:new Date().toISOString(),
      stateHash:stateHash(localState),
      deviceName:deviceLabel()
    };
    syncOnlineProfile(result.account);
    writeMeta();
    toast("Cloud account created. Save the recovery code somewhere private.","success");
    return result.account;
  }
  async function ensureAccount(){
    if(ensureAccountPromise)return ensureAccountPromise;
    ensureAccountPromise=ensureAccountInternal();
    try{return await ensureAccountPromise}
    finally{ensureAccountPromise=null}
  }
  function commandIds(value){
    return new Set(
      (Array.isArray(value?.adminCommands)?value.adminCommands:[])
        .map(command=>String(command?.id||""))
        .filter(Boolean)
    );
  }
  function applyAdminCommand(targetInput,command){
    const target=JSON.parse(JSON.stringify(targetInput||{}));
    const payload=command?.payload||{};
    if(command?.type==="grantReward"){
      const reward=payload.reward||{};
      target.coins=Math.max(0,Number(target.coins)||0)+Math.max(0,Number(reward.coins)||0);
      target.foods={
        apple:0,banana:0,berry:0,mango:0,
        ...(target.foods||{})
      };
      for(const key of ["apple","banana","berry","mango"]){
        target.foods[key]=Math.max(0,Number(target.foods[key])||0)+
          Math.max(0,Number(reward.fruits?.[key])||0);
      }
      if(!Array.isArray(target.adminExclusives))target.adminExclusives=[];
      if(reward.exclusiveId&&!target.adminExclusives.includes(reward.exclusiveId)){
        target.adminExclusives.push(reward.exclusiveId);
      }
      if(reward.exclusiveId){
        target.equippedAdminExclusive=reward.exclusiveId;
        target.adminExclusiveDisplayDisabled=false;
      }
      if(!Array.isArray(target.adminGiftHistory))target.adminGiftHistory=[];
      target.adminGiftHistory.unshift({
        source:"automatic-admin-delivery",
        title:String(command.title||reward.title||"Admin Gift").slice(0,80),
        coins:Math.max(0,Number(reward.coins)||0),
        fruits:{...(reward.fruits||{})},
        exclusiveId:reward.exclusiveId||null,
        grantedAt:command.createdAt||new Date().toISOString()
      });
      target.adminGiftHistory=target.adminGiftHistory.slice(0,30);
    }
    if(command?.type==="setCoins"){
      target.coins=Math.max(0,Number(payload.coins)||0);
    }
    if(command?.type==="setPremium"){
      target.premium=payload.active===true;
      target.premiumDemoEntitlement=payload.active===true;
      if(!payload.active&&target.skin&&target.skin!=="normal_white")target.skin="normal_white";
    }
    if(command?.type==="removeExclusive"){
      const id=String(payload.exclusiveId||"");
      target.adminExclusives=(Array.isArray(target.adminExclusives)
        ?target.adminExclusives:[]).filter(item=>item!==id);
      if(target.equippedAdminExclusive===id)target.equippedAdminExclusive=null;
    }
    return target;
  }
  function mergeAdminDeliveries(remoteState,localState){
    const remoteCommands=Array.isArray(remoteState?.adminCommands)
      ?remoteState.adminCommands:[];
    const seen=commandIds(localState);
    const missing=remoteCommands.filter(command=>command?.id&&!seen.has(String(command.id)));
    if(!missing.length)return null;

    let merged=JSON.parse(JSON.stringify(localState||{}));
    for(const command of missing){
      merged=applyAdminCommand(merged,command);
    }

    const allCommands=[];
    const used=new Set();
    for(const command of [
      ...(Array.isArray(localState?.adminCommands)?localState.adminCommands:[]),
      ...remoteCommands
    ]){
      const id=String(command?.id||"");
      if(!id||used.has(id))continue;
      used.add(id);allCommands.push(command);
    }
    merged.adminCommands=allCommands.slice(-100);
    return {state:merged,commands:missing};
  }
  function deliverySummary(commands){
    if(!commands?.length)return "Admin delivery received.";
    if(commands.length>1)return `${commands.length} admin deliveries received.`;
    const command=commands[0];
    if(command.type==="grantReward"){
      const reward=command.payload?.reward||{};
      const parts=[];
      if(Number(reward.coins)>0)parts.push(`${Number(reward.coins)} coins`);
      if(reward.exclusiveId)parts.push("an exclusive item");
      const fruitCount=Object.values(reward.fruits||{})
        .reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
      if(fruitCount)parts.push(`${fruitCount} fruit`);
      return `${command.title||"Admin Gift"}${parts.length?`: ${parts.join(", ")}`:""} received.`;
    }
    return `${command.title||"Admin delivery"} received.`;
  }
  function expectedDeliveryResult(beforeInput,commands){
    let expected=JSON.parse(JSON.stringify(beforeInput||{}));
    for(const command of commands||[]){
      expected=applyAdminCommand(expected,command);
    }
    return expected;
  }

  function verifyAdminDeliveries(beforeInput,afterInput,commands){
    const before=beforeInput||{};
    const after=afterInput||{};
    const expected=expectedDeliveryResult(before,commands);
    const failures=[];

    for(const command of commands||[]){
      const payload=command?.payload||{};
      if(command?.type==="grantReward"){
        const reward=payload.reward||{};
        if(Number(after.coins||0)<Number(expected.coins||0)){
          failures.push("coins");
        }
        for(const key of ["apple","banana","berry","mango"]){
          if(Number(after.foods?.[key]||0)<Number(expected.foods?.[key]||0)){
            failures.push(key);
          }
        }
        if(
          reward.exclusiveId &&
          !(Array.isArray(after.adminExclusives)&&
            after.adminExclusives.includes(reward.exclusiveId))
        ){
          failures.push("exclusive item");
        }
      }
      if(command?.type==="setCoins"&&
        Number(after.coins||0)!==Number(payload.coins||0)
      ){
        failures.push("coin correction");
      }
      if(command?.type==="setPremium"&&
        Boolean(after.premium)!==Boolean(payload.active)
      ){
        failures.push("Premium");
      }
      if(command?.type==="removeExclusive"&&
        Array.isArray(after.adminExclusives)&&
        after.adminExclusives.includes(payload.exclusiveId)
      ){
        failures.push("exclusive removal");
      }
    }

    const deliveredIds=new Set(
      (Array.isArray(after.adminCommands)?after.adminCommands:[])
        .map(command=>String(command?.id||""))
        .filter(Boolean)
    );
    for(const command of commands||[]){
      if(command?.id&&!deliveredIds.has(String(command.id))){
        failures.push("delivery receipt");
      }
    }

    return {
      ok:failures.length===0,
      failures:[...new Set(failures)],
      expected
    };
  }

  async function acceptAdminDeliveries(remoteSave,delivery){
    clearTimeout(saveTimer);

    const before=snapshot();
    const merged=replaceRunningGameState(delivery.state,{render:true});
    const localCheck=verifyAdminDeliveries(before,merged,delivery.commands);

    if(!localCheck.ok){
      throw new Error(
        `Admin delivery could not be applied locally: ${localCheck.failures.join(", ")}.`
      );
    }

    meta.revision=Number(remoteSave.revision)||0;
    meta.lastSyncAt=remoteSave.updatedAt||new Date().toISOString();
    meta.localUpdatedAt=new Date().toISOString();
    meta.stateHash=stateHash(merged);
    meta.dirty=true;
    writeMeta();

    let saved;
    try{
      saved=await syncNow({
        force:true,
        baseRevision:Number(remoteSave.revision)||0,
        stateOverride:merged
      });
    }catch(error){
      // Keep the verified local gift and retry later instead of claiming success
      // for a state that disappeared from the running game.
      meta.dirty=true;
      writeMeta();
      setCloudActionStatus(
        "Gift applied on this device. Cloud confirmation will retry automatically.",
        "working"
      );
      scheduleSave("admin delivery confirmation");
      saved=null;
    }

    const finalState=saved?.state||snapshot();
    replaceRunningGameState(finalState,{render:true});
    const finalCheck=verifyAdminDeliveries(before,finalState,delivery.commands);

    if(!finalCheck.ok){
      meta.dirty=true;
      writeMeta();
      throw new Error(
        `Admin delivery verification failed: ${finalCheck.failures.join(", ")}.`
      );
    }

    const message=deliverySummary(delivery.commands);
    setCloudActionStatus(message,"success");
    toast(message,"success");
    sessionStorage.removeItem("hammyAdminDeliveryNotice");
    return finalState;
  }

  function applyCloudState(remoteSave){
    if(!remoteSave?.state)return;
    meta.revision=Number(remoteSave.revision)||0;
    meta.lastSyncAt=remoteSave.updatedAt||new Date().toISOString();
    meta.dirty=false;
    meta.stateHash=stateHash(remoteSave.state);
    replaceRunningGameState(remoteSave.state,{render:true});
    writeMeta();
    return remoteSave.state;
  }
  function showConflict(remoteSave,type="save",pendingAuth=null){
    pendingConflict={type,remoteSave,localState:snapshot(),pendingAuth};
    render();
    document.querySelector('[data-page="account"]')?.click();
    el("cloudConflictPanel")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
  async function pullLatestInternal({auto=false}={}){
    if(!meta.accessToken)return null;
    const result=await api("/api/cloud/save");
    const remote=result.save;
    if(!remote)return null;
    const remoteHash=stateHash(remote.state);
    const localHash=stateHash(snapshot());
    if(remoteHash===localHash){
      meta.revision=Number(remote.revision)||0;
      meta.lastSyncAt=remote.updatedAt;
      meta.dirty=false;
      meta.stateHash=remoteHash;
      writeMeta();
      return remote;
    }

    if(Number(remote.revision)>Number(meta.revision||0)){
      const delivery=mergeAdminDeliveries(remote.state,snapshot());
      if(delivery){
        await acceptAdminDeliveries(remote,delivery);
        return remote;
      }
    }

    if(auto&&!meta.dirty&&Number(remote.revision)>Number(meta.revision||0)){
      applyCloudState(remote);return remote;
    }
    if(Number(remote.revision)>Number(meta.revision||0)||meta.dirty){
      if(!auto)showConflict(remote,"save");
    }
    return remote;
  }
  async function pullLatest(options={}){
    if(pullLatestPromise)return pullLatestPromise;
    pullLatestPromise=pullLatestInternal(options);
    try{return await pullLatestPromise}
    finally{pullLatestPromise=null}
  }
  async function syncNowInternal({force=false,baseRevision=null,stateOverride=null}={}){
    syncing=true;setChip("syncing","Syncing");
    try{
      const account=await ensureAccount();
      if(!account)throw new Error("Connect the Render PostgreSQL database before cloud syncing.");
      const localState=stateOverride||snapshot();
      const result=await api("/api/cloud/save",{
        method:"PUT",
        body:{
          baseRevision:baseRevision===null?Number(meta.revision||0):Number(baseRevision),
          deviceId:deviceId(),state:localState,force,premiumMode:premiumMode()
        }
      });
      meta.revision=Number(result.save.revision)||0;
      meta.lastSyncAt=result.save.updatedAt||new Date().toISOString();
      meta.localUpdatedAt=new Date().toISOString();
      const syncedState=JSON.parse(JSON.stringify(localState||{}));
      if(result.premium?.active&&!syncedState.premium){
        syncedState.premium=true;
        syncedState.premiumDemoEntitlement=result.premium.source==="demo";
      }
      const confirmedState=result.save?.state
        ?JSON.parse(JSON.stringify(result.save.state))
        :syncedState;
      meta.stateHash=stateHash(confirmedState);
      meta.dirty=false;
      replaceRunningGameState(confirmedState,{render:true});
      writeMeta();
      setChip("online","Cloud online");
      toast("Hammy progress synced.","success");
      return result.save;
    }catch(error){
      if(error.status===409&&error.data?.save){
        showConflict(error.data.save,"save");
        toast("A newer save was found. Choose which one to keep.","error");
      }else{
        setChip("offline","Sync failed");
        toast(error.message||"Cloud sync failed.","error");
      }
      throw error;
    }finally{syncing=false;render()}
  }
  async function syncNow(options={}){
    if(syncPromise){
      const needsOwnUpload=
        options.force===true||
        options.stateOverride!==undefined||
        options.baseRevision!==undefined;
      if(!needsOwnUpload)return syncPromise;
      try{await syncPromise}catch{}
      return syncNow(options);
    }
    syncPromise=syncNowInternal(options);
    try{return await syncPromise}
    finally{syncPromise=null}
  }
  function scheduleSave(reason="progress changed"){
    meta.dirty=true;meta.localUpdatedAt=new Date().toISOString();writeMeta();
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>syncNow().catch(()=>{}),1800);
  }
  async function restoreAccount(){
    const playerId=String(el("restorePlayerId")?.value||"").trim();
    const recoveryCode=String(el("restoreRecoveryCode")?.value||"").trim();
    const message=el("restoreAccountMessage");
    const button=el("restoreCloudAccount");

    if(!playerId||!recoveryCode){
      if(message)message.textContent="Enter both the Player ID and recovery code.";
      setCloudActionStatus("Account restore needs both codes.","error");
      return;
    }

    if(button)button.disabled=true;
    if(message)message.textContent="Checking the account…";
    setCloudActionStatus("Checking the cloud account…","working");

    try{
      const result=await api("/api/account/sign-in",{
        method:"POST",
        body:{playerId,recoveryCode,deviceId:deviceId()}
      });
      const remote=result.account.save;
      const pendingAuth={
        playerId:result.account.playerId,
        accessToken:result.accessToken,
        recoveryCode:recoveryCode.toUpperCase(),
        account:result.account
      };

      if(!remote){
        commitAuth(pendingAuth,0);
        await syncNow({force:true,baseRevision:0});
        if(message)message.textContent="Signed in and uploaded this device’s progress.";
        setCloudActionStatus("Cloud account restored successfully.","success");
        return;
      }

      const local=snapshot();
      if(stateHash(local)===stateHash(remote.state)){
        commitAuth(pendingAuth,remote.revision,remote.updatedAt);
        if(message)message.textContent="Signed in. Both saves already match.";
        setCloudActionStatus("Cloud account restored. Both saves match.","success");
        return;
      }

      showConflict(remote,"sign-in",pendingAuth);
      if(message)message.textContent="Signed in. Choose which save to keep below.";
      setCloudActionStatus("Two saves were found. Choose one below.","working");
    }catch(error){
      const friendly=error.status===401
        ?"The Player ID and recovery code do not match. Check both codes and try again."
        :(error.message||"Could not sign in.");
      if(message)message.textContent=friendly;
      setCloudActionStatus(friendly,"error");
      toast(friendly,"error");
    }finally{
      if(button)button.disabled=false;
    }
  }

  function commitAuth(pendingAuth,revision=0,lastSyncAt=null){
    meta={
      ...meta,
      playerId:pendingAuth.playerId,
      accessToken:pendingAuth.accessToken,
      recoveryCode:pendingAuth.recoveryCode||meta.recoveryCode,
      revision:Number(revision)||0,
      lastSyncAt:lastSyncAt||meta.lastSyncAt,
      dirty:false,
      deviceName:deviceLabel()
    };
    syncOnlineProfile(pendingAuth.account);
    writeMeta();
  }

  async function chooseCloud(){
    if(!pendingConflict)return;
    setConflictButtons(true);
    setCloudActionStatus("Loading the cloud save…","working");
    try{
      const conflict=pendingConflict;
      if(conflict.pendingAuth){
        commitAuth(
          conflict.pendingAuth,
          conflict.remoteSave.revision,
          conflict.remoteSave.updatedAt
        );
      }
      const remote=conflict.remoteSave;
      pendingConflict=null;
      render();
      sessionStorage.setItem(
        "hammyCloudChoiceNotice",
        "Cloud save loaded successfully."
      );
      applyCloudState(remote);
    }catch(error){
      setConflictButtons(false);
      setCloudActionStatus(
        error.message||"The cloud save could not be loaded. Try again.",
        "error"
      );
    }
  }

  async function chooseDevice(){
    if(!pendingConflict)return;
    const conflict=pendingConflict;
    setConflictButtons(true);
    setCloudActionStatus("Uploading this device’s save…","working");

    try{
      if(conflict.pendingAuth){
        commitAuth(
          conflict.pendingAuth,
          conflict.remoteSave.revision,
          conflict.remoteSave.updatedAt
        );
      }
      await syncNow({
        force:true,
        baseRevision:conflict.remoteSave.revision,
        stateOverride:conflict.localState
      });
      pendingConflict=null;
      render();
      setCloudActionStatus("This device’s save is now in the cloud.","success");
    }catch(error){
      pendingConflict=conflict;
      render();
      setCloudActionStatus(
        error.message||"The device save could not be uploaded. Try again.",
        "error"
      );
    }finally{
      setConflictButtons(false);
    }
  }

  async function copyText(text,message){
    try{await navigator.clipboard.writeText(text);toast(message,"success")}
    catch{toast("Copy was blocked by the browser.","error")}
  }
  function copyBackup(){
    if(!meta.playerId||!meta.recoveryCode)return;
    copyText(JSON.stringify({playerId:meta.playerId,recoveryCode:meta.recoveryCode},null,2),"Account backup copied.");
  }
  function readPreviousAccounts(){
    try{
      const value=JSON.parse(localStorage.getItem(PREVIOUS_ACCOUNTS_KEY)||"[]");
      return Array.isArray(value)?value:[];
    }catch{
      return [];
    }
  }

  function writePreviousAccounts(accounts){
    localStorage.setItem(
      PREVIOUS_ACCOUNTS_KEY,
      JSON.stringify(accounts.slice(0,5))
    );
  }

  function storePreviousAccountBackup(accountMeta){
    if(!accountMeta?.playerId)return;
    const accounts=readPreviousAccounts().filter(
      account=>account.playerId!==accountMeta.playerId
    );
    accounts.unshift({
      playerId:accountMeta.playerId,
      recoveryCode:accountMeta.recoveryCode||null,
      savedAt:new Date().toISOString(),
      deviceName:accountMeta.deviceName||deviceLabel()
    });
    writePreviousAccounts(accounts);
  }

  function renderPreviousAccountBackup(){
    const summary=el("previousCloudAccountSummary");
    const copyButton=el("copyPreviousCloudBackup");
    if(!summary||!copyButton)return;

    const accounts=readPreviousAccounts();
    const latest=accounts[0];
    if(!latest){
      summary.textContent="No previous account backup is stored on this device.";
      copyButton.disabled=true;
      return;
    }

    summary.textContent=latest.recoveryCode
      ?`Previous account saved: ${latest.playerId} · ${formatTime(latest.savedAt)}`
      :`Previous Player ID saved: ${latest.playerId}. Its recovery code was not available on this device.`;
    copyButton.disabled=!latest.recoveryCode;
  }

  function copyPreviousCloudBackup(){
    const latest=readPreviousAccounts()[0];
    if(!latest?.recoveryCode){
      setCloudActionStatus(
        "No complete previous account backup is available on this device.",
        "error"
      );
      return;
    }
    copyText(
      JSON.stringify({
        playerId:latest.playerId,
        recoveryCode:latest.recoveryCode
      },null,2),
      "Previous account backup copied."
    );
  }

  function newDeviceIdentifier(){
    return crypto.randomUUID
      ?crypto.randomUUID()
      :`device-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  async function createNewCloudAccount(){
    const button=el("createNewCloudAccount");
    const message=el("newCloudAccountMessage");
    const answer=prompt(
      'Type NEW to create a completely new Player ID, recovery code, and cloud save. Your current device progress will be copied to the new account.'
    );
    if(answer!=="NEW")return;

    if(button)button.disabled=true;
    if(message){
      message.textContent="Creating a brand-new cloud account…";
      message.className="cloud-action-message working";
    }
    setCloudActionStatus("Creating a new cloud identity…","working");
    setChip("syncing","Creating new account");

    try{
      clearTimeout(saveTimer);
      clearInterval(backgroundTimer);

      // Finish an earlier save before separating from the old account.
      if(syncPromise){
        try{await syncPromise}catch{}
      }

      const previousMeta={...meta};
      const localState=snapshot();
      const newDeviceId=newDeviceIdentifier();

      const result=await api("/api/account/guest",{
        method:"POST",
        body:{
          deviceId:newDeviceId,
          state:localState,
          premiumMode:premiumMode()
        }
      });

      if(!result?.account?.playerId||!result?.accessToken||!result?.recoveryCode){
        throw new Error("The server did not return the new account information.");
      }

      storePreviousAccountBackup(previousMeta);
      localStorage.setItem(DEVICE_KEY,newDeviceId);
      localStorage.removeItem(ONLINE_KEY);

      meta={
        playerId:result.account.playerId,
        accessToken:result.accessToken,
        recoveryCode:result.recoveryCode,
        revision:Number(
          result.account.cloud?.revision||
          result.account.save?.revision||
          1
        ),
        lastSyncAt:
          result.account.cloud?.updatedAt||
          result.account.save?.updatedAt||
          new Date().toISOString(),
        dirty:false,
        localUpdatedAt:new Date().toISOString(),
        stateHash:stateHash(result.account.save?.state||localState),
        deviceName:deviceLabel()
      };

      syncOnlineProfile(result.account);
      writeMeta();
      renderPreviousAccountBackup();

      sessionStorage.setItem(
        "hammyNewCloudAccountNotice",
        JSON.stringify({
          playerId:result.account.playerId,
          recoveryCode:result.recoveryCode
        })
      );

      if(result.account.save){
        applyCloudState(result.account.save);
        return;
      }

      startBackgroundDelivery();
      render();
      if(message){
        message.textContent=`New cloud account created: ${result.account.playerId}`;
        message.className="cloud-action-message success";
      }
      setCloudActionStatus("Brand-new cloud account created.","success");
      toast("New Hammy cloud account created.","success");
    }catch(error){
      startBackgroundDelivery();
      setChip(meta.accessToken?"online":"offline",meta.accessToken?"Cloud online":"Cloud unavailable");
      const friendly=error.message||
        "The new cloud account could not be created. Your current account and progress were not changed.";
      if(message){
        message.textContent=friendly;
        message.className="cloud-action-message error";
      }
      setCloudActionStatus(friendly,"error");
      toast(friendly,"error");
    }finally{
      if(button)button.disabled=false;
    }
  }

  function showNewCloudAccountNotice(){
    try{
      const notice=JSON.parse(
        sessionStorage.getItem("hammyNewCloudAccountNotice")||"null"
      );
      if(!notice)return;
      sessionStorage.removeItem("hammyNewCloudAccountNotice");
      setTimeout(()=>{
        const message=`New cloud account created: ${notice.playerId}. Copy the new recovery code now.`;
        setCloudActionStatus(message,"success");
        const box=el("newCloudAccountMessage");
        if(box){
          box.textContent=message;
          box.className="cloud-action-message success";
        }
        toast("Brand-new cloud account created.","success");
      },450);
    }catch{
      sessionStorage.removeItem("hammyNewCloudAccountNotice");
    }
  }

  function freshAccountState(){
    let fresh;
    try{
      fresh=typeof defaults!=="undefined"
        ?JSON.parse(JSON.stringify(defaults))
        :null;
    }catch{
      fresh=null;
    }

    if(!fresh){
      fresh={
        coins:40,streak:0,practiceDays:0,totalFocusMinutes:0,
        sessionCount:0,lastPracticeDate:"",
        happy:70,hunger:30,energy:85,
        premium:false,premiumDemoEntitlement:false,
        skin:"normal_white",theme:"lavender",
        foods:{apple:2,banana:1,berry:0,mango:0,peach:0,grape:0,kiwi:0,watermelon:0},
        clothes:["shirt","hoodie"],equipped:null,
        marketInventory:{cozyCocoa:0,joyCookie:0,snackPack:0,coinBooster:0,fruitCharm:0},
        activeBoosters:{coinBooster:0,fruitCharm:0},
        ownedDecorations:{starGarland:false,rainbowBanner:false,flowerPot:false,miniFountain:false,cloudBeanbag:false},
        placedDecorations:{starGarland:false,rainbowBanner:false,flowerPot:false,miniFountain:false,cloudBeanbag:false},
        ownedMarketThemes:{forest:false,candy:false,space:false},
        ownedFurniture:{
          bed:false,sofa:false,desk:false,plant:false,aquarium:false,
          tunnel:false,toybox:false,bookshelf:false,lamp:false,rug:false,
          wheel:false,snack:false,music:false,castle:false
        },
        placedFurniture:{
          bed:false,sofa:false,desk:false,plant:false,aquarium:false,
          tunnel:false,toybox:false,bookshelf:false,lamp:false,rug:false,
          wheel:false,snack:false,music:false,castle:false
        }
      };
    }

    fresh.premium=false;
    fresh.premiumDemoEntitlement=false;
    fresh.skin="white";
    fresh.adminExclusives=[];
    fresh.equippedAdminExclusive=null;
    fresh.adminGiftHistory=[];
    fresh.adminCommands=[];
    return fresh;
  }

  function setReplacementMessage(message,type=""){
    const box=el("replaceCloudAccountMessage");
    if(!box)return;
    box.textContent=message;
    box.className=`cloud-action-message${type?" "+type:""}`;
  }

  function finalizeReplacement(pending){
    const fresh=pending.freshState||freshAccountState();
    const created=pending.newAccount;

    localStorage.setItem(SAVE_KEY,JSON.stringify(fresh));
    localStorage.setItem(DEVICE_KEY,pending.newDeviceId);
    localStorage.removeItem(ONLINE_KEY);
    localStorage.removeItem("hammyPremiumEntitlement");
    localStorage.removeItem(PREVIOUS_ACCOUNTS_KEY);

    meta={
      playerId:created.playerId,
      accessToken:created.accessToken,
      recoveryCode:created.recoveryCode,
      revision:Number(created.revision)||1,
      lastSyncAt:created.updatedAt||new Date().toISOString(),
      dirty:false,
      localUpdatedAt:new Date().toISOString(),
      stateHash:stateHash(fresh),
      deviceName:deviceLabel()
    };
    localStorage.setItem(CLOUD_KEY,JSON.stringify(meta));
    localStorage.removeItem(PENDING_REPLACEMENT_KEY);

    sessionStorage.setItem(
      "hammyReplacedCloudAccountNotice",
      JSON.stringify({
        playerId:created.playerId,
        recoveryCode:created.recoveryCode
      })
    );
    location.reload();
  }

  async function replaceCloudAccount(){
    const button=el("replaceCloudAccount");
    const answer=prompt(
      'This permanently deletes the connected cloud account and all of its progress. Type REPLACE to create a completely fresh account.'
    );
    if(answer!=="REPLACE")return;

    const secondConfirm=confirm(
      "Final warning: the old Player ID, recovery code, cloud save, friends, profile, rooms, coins, rewards, and Premium entitlement will be permanently deleted. Continue?"
    );
    if(!secondConfirm)return;

    if(button)button.disabled=true;
    setReplacementMessage("Verifying the old cloud account…","working");
    setCloudActionStatus("Preparing a safe account replacement…","working");
    setChip("syncing","Replacing account");

    try{
      clearTimeout(saveTimer);
      clearInterval(backgroundTimer);
      await ensureAccount();

      if(!meta.accessToken||!meta.playerId){
        throw new Error("The current cloud account could not be verified.");
      }

      if(syncPromise){
        try{await syncPromise}catch{}
      }

      const oldAccount={
        playerId:meta.playerId,
        accessToken:meta.accessToken
      };
      const fresh=freshAccountState();
      const newDeviceId=newDeviceIdentifier();

      setReplacementMessage("Creating and checking the fresh cloud account…","working");
      const created=await api("/api/account/guest",{
        method:"POST",
        body:{
          deviceId:newDeviceId,
          state:fresh,
          premiumMode:"none"
        }
      });

      if(!created?.account?.playerId||!created?.accessToken||!created?.recoveryCode){
        throw new Error("The server did not return complete new-account information.");
      }

      await apiWithToken("/api/account/me",created.accessToken);

      const pending={
        version:1,
        phase:"newVerified",
        createdAt:new Date().toISOString(),
        oldAccount,
        newDeviceId,
        freshState:fresh,
        newAccount:{
          playerId:created.account.playerId,
          accessToken:created.accessToken,
          recoveryCode:created.recoveryCode,
          revision:Number(
            created.account.cloud?.revision||
            created.account.save?.revision||
            1
          ),
          updatedAt:
            created.account.cloud?.updatedAt||
            created.account.save?.updatedAt||
            new Date().toISOString()
        }
      };
      localStorage.setItem(PENDING_REPLACEMENT_KEY,JSON.stringify(pending));

      setReplacementMessage("Fresh account verified. Permanently deleting the old account…","working");
      try{
        await apiWithToken("/api/account",oldAccount.accessToken,{
          method:"DELETE",
          body:{confirm:"DELETE"}
        });
      }catch(deleteError){
        // Roll back by deleting the unused new account. The old account remains.
        try{
          await apiWithToken("/api/account",created.accessToken,{
            method:"DELETE",
            body:{confirm:"DELETE"}
          });
          localStorage.removeItem(PENDING_REPLACEMENT_KEY);
        }catch{
          pending.phase="cleanupRequired";
          localStorage.setItem(PENDING_REPLACEMENT_KEY,JSON.stringify(pending));
        }
        throw new Error(
          deleteError.message||
          "The old account could not be deleted. The current account was not replaced."
        );
      }

      pending.phase="oldDeleted";
      localStorage.setItem(PENDING_REPLACEMENT_KEY,JSON.stringify(pending));
      finalizeReplacement(pending);
    }catch(error){
      startBackgroundDelivery();
      setChip(meta.accessToken?"online":"offline",meta.accessToken?"Cloud online":"Cloud unavailable");
      const friendly=error.message||
        "The account replacement could not finish. The old account remains connected.";
      setReplacementMessage(friendly,"error");
      setCloudActionStatus(friendly,"error");
      toast(friendly,"error");
    }finally{
      if(button)button.disabled=false;
    }
  }

  async function resumePendingReplacement(){
    let pending;
    try{
      pending=JSON.parse(
        localStorage.getItem(PENDING_REPLACEMENT_KEY)||"null"
      );
    }catch{
      localStorage.removeItem(PENDING_REPLACEMENT_KEY);
      return false;
    }
    if(!pending?.newAccount?.accessToken)return false;

    if(pending.phase==="oldDeleted"){
      finalizeReplacement(pending);
      return true;
    }

    if(pending.phase==="cleanupRequired"){
      setReplacementMessage(
        "A previous replacement was interrupted. Press the replacement button again after the cloud connection is stable.",
        "error"
      );
      return false;
    }

    // Detect the tiny interruption window after the old deletion completed.
    try{
      await apiWithToken("/api/account/me",pending.oldAccount.accessToken);
      // The old account still exists. Remove the unused new account and keep old.
      await apiWithToken("/api/account",pending.newAccount.accessToken,{
        method:"DELETE",
        body:{confirm:"DELETE"}
      });
      localStorage.removeItem(PENDING_REPLACEMENT_KEY);
      return false;
    }catch(error){
      if(error.status===401){
        pending.phase="oldDeleted";
        localStorage.setItem(PENDING_REPLACEMENT_KEY,JSON.stringify(pending));
        finalizeReplacement(pending);
        return true;
      }
      setReplacementMessage(
        "An interrupted account replacement is waiting for the cloud server. No additional account changes were made.",
        "error"
      );
      return false;
    }
  }

  function showReplacedAccountNotice(){
    try{
      const notice=JSON.parse(
        sessionStorage.getItem("hammyReplacedCloudAccountNotice")||"null"
      );
      if(!notice)return;
      sessionStorage.removeItem("hammyReplacedCloudAccountNotice");
      setTimeout(()=>{
        const message=`Fresh cloud account created: ${notice.playerId}. Copy the new recovery code now.`;
        setReplacementMessage(message,"success");
        setCloudActionStatus(message,"success");
        toast("Old account deleted. Fresh cloud account ready.","success");
      },450);
    }catch{
      sessionStorage.removeItem("hammyReplacedCloudAccountNotice");
    }
  }

  async function resetLocal(){
    const answer=prompt('Type RESET to clear Hammy data only on this device.');
    if(answer!=="RESET")return;
    [
      SAVE_KEY,"hammyV5","hammyCloudV1","hammyOnlineV1","hammyPremiumEntitlement",
      "hammyFocusFailed","hammyDeviceIdV1"
    ].forEach(key=>localStorage.removeItem(key));
    location.reload();
  }
  async function deleteAccount(){
    if(!meta.playerId){
      setCloudActionStatus("No cloud account is connected on this device.","error");
      return;
    }
    const answer=prompt(
      'Type DELETE to permanently delete the cloud account and all shared data.'
    );
    if(answer!=="DELETE")return;

    const button=el("deleteCloudAccount");
    if(button)button.disabled=true;
    setCloudActionStatus("Verifying and deleting the cloud account…","working");

    try{
      await ensureAccount();
      if(!meta.accessToken)throw new Error("The cloud account could not be verified.");
      await api("/api/account",{method:"DELETE",body:{confirm:"DELETE"}});
      [
        SAVE_KEY,"hammyV5","hammyCloudV1","hammyOnlineV1",
        "hammyPremiumEntitlement","hammyDeviceIdV1"
      ].forEach(key=>localStorage.removeItem(key));
      alert("The cloud account was deleted.");
      location.reload();
    }catch(error){
      const friendly=error.status===401
        ?"This device could not verify the saved account. Restore it with the Player ID and recovery code, then delete it."
        :(error.message||"Could not delete the account.");
      setCloudActionStatus(friendly,"error");
      toast(friendly,"error");
    }finally{
      if(button)button.disabled=false;
    }
  }
  function showPendingAdminDeliveryNotice(){
    try{
      const notice=JSON.parse(
        sessionStorage.getItem("hammyAdminDeliveryNotice")||"null"
      );
      if(!notice)return;
      sessionStorage.removeItem("hammyAdminDeliveryNotice");
      setTimeout(()=>toast(notice.message||"Admin delivery received.","success"),450);
    }catch{
      sessionStorage.removeItem("hammyAdminDeliveryNotice");
    }
  }
  function showCloudChoiceNotice(){
    const notice=sessionStorage.getItem("hammyCloudChoiceNotice");
    if(!notice)return;
    sessionStorage.removeItem("hammyCloudChoiceNotice");
    setTimeout(()=>{
      setCloudActionStatus(notice,"success");
      toast(notice,"success");
    },350);
  }

  async function manualSync(){
    const button=el("syncCloudNow");
    if(button)button.disabled=true;
    setCloudActionStatus("Syncing this device with the cloud…","working");
    try{
      await ensureAccount();
      await syncNow();
      setCloudActionStatus("Cloud sync completed successfully.","success");
    }catch(error){
      setCloudActionStatus(
        error.message||"Cloud sync could not finish. Your device progress is safe.",
        "error"
      );
    }finally{
      if(button)button.disabled=false;
    }
  }

  async function retryCloudConnection(){
    const button=el("retryCloudConnection");
    if(button)button.disabled=true;
    setCloudActionStatus("Checking the cloud server again…","working");
    setChip("syncing","Checking cloud");
    try{
      const health=await checkHealth();
      if(!health.ready){
        throw new Error("The cloud database is not ready yet.");
      }
      await ensureAccount();
      await refreshServerUpdates();
      el("cloudSetupWarning")?.classList.add("hidden");
      setChip(meta.dirty?"syncing":"online",meta.dirty?"Waiting to sync":"Cloud online");
      setCloudActionStatus("Cloud connection restored.","success");
    }catch(error){
      el("cloudSetupWarning")?.classList.remove("hidden");
      setChip("offline","Cloud unavailable");
      setCloudActionStatus(
        error.message||"The cloud is still unavailable. Device progress remains safe.",
        "error"
      );
    }finally{
      if(button)button.disabled=false;
    }
  }

  async function backgroundRefresh(){
    if(
      backgroundRefreshing||syncing||!meta.accessToken||
      document.visibilityState==="hidden"
    )return;
    backgroundRefreshing=true;
    try{
      await refreshServerUpdates();
      setChip(meta.dirty?"syncing":"online",meta.dirty?"Waiting to sync":"Cloud online");
    }catch{
      setChip("offline","Retry available");
    }finally{
      backgroundRefreshing=false;
    }
  }
  function startBackgroundDelivery(){
    clearInterval(backgroundTimer);
    backgroundTimer=setInterval(()=>backgroundRefresh(),AUTO_REFRESH_MS);
    window.addEventListener("focus",()=>backgroundRefresh());
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible")backgroundRefresh();
    });
  }

  async function initialize(){
    if(initialized)return;initialized=true;render();
    const health=await checkHealth();
    if(!health.ready)return;
    try{
      await ensureAccount();
      await refreshServerUpdates();
      startBackgroundDelivery();
      setChip(meta.dirty?"syncing":"online",meta.dirty?"Waiting to sync":"Cloud online");
      setCloudActionStatus("Cloud account connected.","success");
    }catch(error){
      setChip("offline","Cloud error");
      toast(error.message||"Cloud account could not start.","error");
    }
  }

  function setRewardMessage(message,type=""){
    const box=el("rewardCodeMessage");if(!box)return;
    box.textContent=message;
    box.className=`reward-code-message${type?" "+type:""}`;
  }
  function normalizeRewardInput(value){
    return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,24);
  }
  async function redeemRewardCode(){
    const input=el("rewardCodeInput");
    const button=el("redeemRewardCode");
    const code=normalizeRewardInput(input?.value);
    if(input)input.value=code;
    if(!code){
      setRewardMessage("Enter a reward code first.","error");
      return;
    }
    if(syncing){
      setRewardMessage("Wait for the current cloud sync to finish.","working");
      return;
    }

    if(button)button.disabled=true;
    setRewardMessage("Checking the reward code securely…","working");

    try{
      const account=await ensureAccount();
      if(!account||!meta.accessToken)throw new Error("Connect your Hammy cloud account first.");

      // Upload unsynced progress before the server adds the reward.
      await syncNow();

      const result=await api("/api/rewards/redeem",{
        method:"POST",
        body:{code,deviceId:deviceId()}
      });

      sessionStorage.setItem("hammyRewardNotice",JSON.stringify({
        message:`${result.reward.title}: +${result.reward.coins} coins!`,
        type:"success"
      }));

      if(input)input.value="";
      applyCloudState(result.save);
    }catch(error){
      if(error.status===409&&error.data?.alreadyRedeemed){
        setRewardMessage("You already redeemed this code on this Hammy account.","error");
      }else{
        setRewardMessage(error.message||"The reward code could not be redeemed.","error");
      }
    }finally{
      if(button)button.disabled=false;
    }
  }
  function showPendingRewardNotice(){
    try{
      const notice=JSON.parse(sessionStorage.getItem("hammyRewardNotice")||"null");
      if(!notice)return;
      sessionStorage.removeItem("hammyRewardNotice");
      setTimeout(()=>{
        setRewardMessage(notice.message,notice.type||"success");
        toast(notice.message,notice.type||"success");
      },350);
    }catch{
      sessionStorage.removeItem("hammyRewardNotice");
    }
  }


  let secretAdminTapCount=0;
  let secretAdminTapTimer=null;
  function setSecretAdminMessage(message,type=""){
    const box=el("secretAdminMessage");if(!box)return;
    box.textContent=message;
    box.className=`secret-admin-message${type?" "+type:""}`;
  }
  function revealSecretAdmin(){
    const section=el("secretAdminSection");
    if(!section)return;
    section.classList.remove("hidden");
    setSecretAdminMessage("Enter the private server-side admin code.","");
    setTimeout(()=>el("secretAdminCode")?.focus(),80);
    section.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function handleSecretAdminTap(){
    secretAdminTapCount++;
    clearTimeout(secretAdminTapTimer);
    secretAdminTapTimer=setTimeout(()=>{secretAdminTapCount=0},2500);
    if(secretAdminTapCount>=7){
      secretAdminTapCount=0;
      revealSecretAdmin();
    }
  }
  async function unlockSecretAdmin(){
    const code=String(el("secretAdminCode")?.value||"");
    const button=el("unlockSecretAdmin");
    if(!code){
      setSecretAdminMessage("Enter the top secret admin code.","error");
      return;
    }
    if(button)button.disabled=true;
    setSecretAdminMessage("Checking the top secret code…","working");
    try{
      const result=await api("/api/admin/login",{method:"POST",body:{code}});
      sessionStorage.setItem("hammyAdminSessionV1",result.sessionToken);
      sessionStorage.setItem("hammyAdminSessionExpiresV1",String(Date.now()+(Number(result.expiresInSeconds||1800)*1000)));
      if(el("secretAdminCode"))el("secretAdminCode").value="";
      setSecretAdminMessage("Admin access unlocked. Opening the private panel…","success");
      setTimeout(()=>{location.href="./admin.html"},450);
    }catch(error){
      setSecretAdminMessage(error.message||"The admin code is incorrect.","error");
    }finally{
      if(button)button.disabled=false;
    }
  }

  function bind(){
    if(!el("accountPage"))return;

    // Keep every account control inside the single-page app.
    document.querySelectorAll("#accountPage button").forEach(button=>{
      button.type="button";
    });

    el("copyPlayerId")?.addEventListener("click",()=>copyText(meta.playerId,"Player ID copied."));
    el("copyRecoveryCode")?.addEventListener("click",()=>copyText(meta.recoveryCode,"Recovery code copied."));
    el("copyAccountBackup")?.addEventListener("click",copyBackup);
    el("createNewCloudAccount")?.addEventListener("click",createNewCloudAccount);
    el("copyPreviousCloudBackup")?.addEventListener("click",copyPreviousCloudBackup);
    el("replaceCloudAccount")?.addEventListener("click",replaceCloudAccount);
    el("syncCloudNow")?.addEventListener("click",manualSync);
    el("retryCloudConnection")?.addEventListener("click",retryCloudConnection);
    el("restoreCloudAccount")?.addEventListener("click",restoreAccount);
    el("useCloudSave")?.addEventListener("click",chooseCloud);
    el("keepDeviceSave")?.addEventListener("click",chooseDevice);
    el("cancelCloudConflict")?.addEventListener("click",()=>{
      pendingConflict=null;
      render();
      setConflictButtons(false);
      setChip(meta.dirty?"syncing":"online",meta.dirty?"Waiting to sync":"Cloud online");
      setCloudActionStatus("Save choice postponed. Device progress remains safe.");
    });
    el("resetLocalHammy")?.addEventListener("click",resetLocal);
    el("deleteCloudAccount")?.addEventListener("click",deleteAccount);
    el("secretAdminTrigger")?.addEventListener("click",handleSecretAdminTap);
    el("unlockSecretAdmin")?.addEventListener("click",unlockSecretAdmin);
    el("secretAdminCode")?.addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();unlockSecretAdmin()}
    });
    el("hideSecretAdmin")?.addEventListener("click",()=>{
      el("secretAdminSection")?.classList.add("hidden");
      if(el("secretAdminCode"))el("secretAdminCode").value="";
      secretAdminTapCount=0;
    });
    el("redeemRewardCode")?.addEventListener("click",redeemRewardCode);
    el("rewardCodeInput")?.addEventListener("input",event=>{
      event.target.value=normalizeRewardInput(event.target.value);
    });
    el("rewardCodeInput")?.addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();redeemRewardCode()}
    });
    el("dismissAnnouncement")?.addEventListener("click",dismissAnnouncement);
    el("claimLiveEvent")?.addEventListener("click",claimActiveEvent);

    document.querySelector('[data-page="account"]')?.addEventListener("click",async()=>{
      render();
      setCloudActionStatus("Refreshing cloud account…","working");
      const ok=await refreshServerUpdates();
      setCloudActionStatus(
        ok?"Cloud account is up to date.":"Cloud refresh failed. Device progress remains safe.",
        ok?"success":"error"
      );
    });
  }

  window.HammyCloud={
    authHeaders,api,ensureAccount,scheduleSave,syncNow,getMeta:()=>({...meta}),
    isSignedIn:()=>Boolean(meta.accessToken),baseUrl,
    loadActiveEvent,loadAnnouncement,renderExclusiveCollection,
    backgroundRefresh,retryCloudConnection,createNewCloudAccount,
    replaceCloudAccount
  };

  bind();
  resumePendingReplacement()
    .then(resumed=>{
      if(!resumed){
        return initialize().then(()=>Promise.all([
          loadActiveEvent(),loadAnnouncement()
        ]));
      }
      return null;
    })
    .catch(()=>{
      initialize().then(()=>Promise.all([
        loadActiveEvent(),loadAnnouncement()
      ])).catch(()=>{});
    });
  showPendingRewardNotice();
  showPendingEventNotice();
  showPendingAdminDeliveryNotice();
  showCloudChoiceNotice();
  showNewCloudAccountNotice();
  showReplacedAccountNotice();
  renderPreviousAccountBackup();
  renderExclusiveCollection();
})();

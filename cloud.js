"use strict";
(() => {
  const CLOUD_KEY="hammyCloudV1";
  const ONLINE_KEY="hammyOnlineV1";
  const SAVE_KEY="hammyV8";
  const DEVICE_KEY="hammyDeviceIdV1";
  const el=id=>document.getElementById(id);

  let meta=readMeta();
  let saveTimer=null;
  let syncing=false;
  let pendingConflict=null;
  let initialized=false;

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
  async function api(path,options={}){
    const response=await fetch(baseUrl()+path,{
      method:options.method||"GET",
      headers:{"Content-Type":"application/json",...authHeaders(),...(options.headers||{})},
      body:options.body===undefined?undefined:JSON.stringify(options.body),
      cache:"no-store",
      signal:options.signal
    });
    let data={};
    try{data=await response.json()}catch{}
    if(!response.ok){
      const error=new Error(data.error||`Server error ${response.status}`);
      error.status=response.status;error.data=data;throw error;
    }
    return data;
  }
  function snapshot(){
    try{return JSON.parse(JSON.stringify(state))}catch{return JSON.parse(localStorage.getItem(SAVE_KEY)||"{}")}
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
  }
  async function checkHealth(){
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
  async function ensureAccount(){
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
  function applyCloudState(remoteSave){
    if(!remoteSave?.state)return;
    meta.revision=Number(remoteSave.revision)||0;
    meta.lastSyncAt=remoteSave.updatedAt||new Date().toISOString();
    meta.dirty=false;meta.stateHash=stateHash(remoteSave.state);
    localStorage.setItem(SAVE_KEY,JSON.stringify(remoteSave.state));
    writeMeta();
    location.reload();
  }
  function showConflict(remoteSave,type="save",pendingAuth=null){
    pendingConflict={type,remoteSave,localState:snapshot(),pendingAuth};
    render();
    document.querySelector('[data-page="account"]')?.click();
    el("cloudConflictPanel")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
  async function pullLatest({auto=false}={}){
    if(!meta.accessToken)return null;
    const result=await api("/api/cloud/save");
    const remote=result.save;
    if(!remote)return null;
    const remoteHash=stateHash(remote.state);
    const localHash=stateHash(snapshot());
    if(remoteHash===localHash){
      meta.revision=Number(remote.revision)||0;meta.lastSyncAt=remote.updatedAt;meta.dirty=false;meta.stateHash=remoteHash;writeMeta();
      return remote;
    }
    if(auto&&!meta.dirty&&Number(remote.revision)>Number(meta.revision||0)){
      applyCloudState(remote);return remote;
    }
    if(Number(remote.revision)>Number(meta.revision||0)||meta.dirty)showConflict(remote,"save");
    return remote;
  }
  async function syncNow({force=false,baseRevision=null,stateOverride=null}={}){
    if(syncing)return;
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
      meta.stateHash=stateHash(localState);meta.dirty=false;
      if(result.premium?.active&&!state.premium){
        state.premium=true;
        state.premiumDemoEntitlement=result.premium.source==="demo";
        localStorage.setItem(SAVE_KEY,JSON.stringify(state));
      }
      writeMeta();setChip("online","Cloud online");
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
  function scheduleSave(reason="progress changed"){
    meta.dirty=true;meta.localUpdatedAt=new Date().toISOString();writeMeta();
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>syncNow().catch(()=>{}),1800);
  }
  async function restoreAccount(){
    const playerId=String(el("restorePlayerId")?.value||"").trim();
    const recoveryCode=String(el("restoreRecoveryCode")?.value||"").trim();
    const message=el("restoreAccountMessage");
    if(message)message.textContent="Checking the account…";
    try{
      const result=await api("/api/account/sign-in",{
        method:"POST",body:{playerId,recoveryCode,deviceId:deviceId()}
      });
      const remote=result.account.save;
      const pendingAuth={
        playerId:result.account.playerId,accessToken:result.accessToken,
        recoveryCode:recoveryCode.toUpperCase(),account:result.account
      };
      if(!remote){
        commitAuth(pendingAuth,0);
        await syncNow({force:true,baseRevision:0});
        if(message)message.textContent="Signed in and uploaded this device’s progress.";
        return;
      }
      const local=snapshot();
      if(stateHash(local)===stateHash(remote.state)){
        commitAuth(pendingAuth,remote.revision,remote.updatedAt);
        if(message)message.textContent="Signed in. Both saves already match.";
        return;
      }
      showConflict(remote,"sign-in",pendingAuth);
      if(message)message.textContent="Signed in. Choose which save to keep below.";
    }catch(error){
      if(message)message.textContent=error.message||"Could not sign in.";
      toast(error.message||"Could not sign in.","error");
    }
  }
  function commitAuth(pendingAuth,revision=0,lastSyncAt=null){
    meta={
      ...meta,
      playerId:pendingAuth.playerId,
      accessToken:pendingAuth.accessToken,
      recoveryCode:pendingAuth.recoveryCode||meta.recoveryCode,
      revision:Number(revision)||0,lastSyncAt:lastSyncAt||meta.lastSyncAt,
      dirty:false,deviceName:deviceLabel()
    };
    syncOnlineProfile(pendingAuth.account);
    writeMeta();
  }
  async function chooseCloud(){
    if(!pendingConflict)return;
    if(pendingConflict.pendingAuth)commitAuth(pendingConflict.pendingAuth,pendingConflict.remoteSave.revision,pendingConflict.remoteSave.updatedAt);
    const remote=pendingConflict.remoteSave;pendingConflict=null;render();applyCloudState(remote);
  }
  async function chooseDevice(){
    if(!pendingConflict)return;
    const conflict=pendingConflict;pendingConflict=null;
    if(conflict.pendingAuth)commitAuth(conflict.pendingAuth,conflict.remoteSave.revision,conflict.remoteSave.updatedAt);
    render();
    await syncNow({force:true,baseRevision:conflict.remoteSave.revision,stateOverride:conflict.localState});
  }
  async function copyText(text,message){
    try{await navigator.clipboard.writeText(text);toast(message,"success")}
    catch{toast("Copy was blocked by the browser.","error")}
  }
  function copyBackup(){
    if(!meta.playerId||!meta.recoveryCode)return;
    copyText(JSON.stringify({playerId:meta.playerId,recoveryCode:meta.recoveryCode},null,2),"Account backup copied.");
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
    if(!meta.accessToken)return toast("No cloud account is signed in.","error");
    const answer=prompt('Type DELETE to permanently delete the cloud account and all shared data.');
    if(answer!=="DELETE")return;
    try{
      await api("/api/account",{method:"DELETE",body:{confirm:"DELETE"}});
      [SAVE_KEY,"hammyV5","hammyCloudV1","hammyOnlineV1","hammyPremiumEntitlement","hammyDeviceIdV1"].forEach(key=>localStorage.removeItem(key));
      alert("The cloud account was deleted.");
      location.reload();
    }catch(error){toast(error.message||"Could not delete the account.","error")}
  }
  async function initialize(){
    if(initialized)return;initialized=true;render();
    const health=await checkHealth();
    if(!health.ready)return;
    try{
      await ensureAccount();
      await pullLatest({auto:true});
      setChip(meta.dirty?"syncing":"online",meta.dirty?"Waiting to sync":"Cloud online");
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
    el("copyPlayerId")?.addEventListener("click",()=>copyText(meta.playerId,"Player ID copied."));
    el("copyRecoveryCode")?.addEventListener("click",()=>copyText(meta.recoveryCode,"Recovery code copied."));
    el("copyAccountBackup")?.addEventListener("click",copyBackup);
    el("syncCloudNow")?.addEventListener("click",()=>syncNow().catch(()=>{}));
    el("restoreCloudAccount")?.addEventListener("click",restoreAccount);
    el("useCloudSave")?.addEventListener("click",chooseCloud);
    el("keepDeviceSave")?.addEventListener("click",()=>chooseDevice().catch(()=>{}));
    el("cancelCloudConflict")?.addEventListener("click",()=>{pendingConflict=null;render();setChip(meta.dirty?"syncing":"online",meta.dirty?"Waiting to sync":"Cloud online")});
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
    document.querySelector('[data-page="account"]')?.addEventListener("click",render);
  }

  window.HammyCloud={
    authHeaders,api,ensureAccount,scheduleSave,syncNow,getMeta:()=>({...meta}),
    isSignedIn:()=>Boolean(meta.accessToken),baseUrl
  };

  bind();
  initialize();
  showPendingRewardNotice();
})();

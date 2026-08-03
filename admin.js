"use strict";
(() => {
  const el=id=>document.getElementById(id);
  const SESSION_KEY="hammyAdminSessionV1";
  const EXPIRY_KEY="hammyAdminSessionExpiresV1";
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const reasonLabels={
    inappropriate_nickname:"Inappropriate nickname",
    personal_information:"Personal information",
    unsafe_content:"Unsafe content",
    spam:"Spam",
    other:"Other preset reason"
  };

  let currentPlayer=null;
  let exclusives=[];
  let auditCache=[];

  function message(text,type=""){
    const box=el("adminMessage");
    box.textContent=text;
    box.className=`message${type?" "+type:""}`;
  }
  function sessionToken(){
    const expires=Number(sessionStorage.getItem(EXPIRY_KEY)||0);
    if(!expires||expires<=Date.now()){
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(EXPIRY_KEY);
      return "";
    }
    return sessionStorage.getItem(SESSION_KEY)||"";
  }
  function showLogin(){
    el("adminLoginPanel").classList.remove("hidden");
    el("adminWorkspace").classList.add("hidden");
  }
  function showWorkspace(){
    el("adminLoginPanel").classList.add("hidden");
    el("adminWorkspace").classList.remove("hidden");
  }
  function logout(text="Admin command center locked."){
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    currentPlayer=null;
    showLogin();
    message(text);
  }
  async function api(path,options={},admin=true){
    const headers={"Content-Type":"application/json"};
    if(admin){
      const token=sessionToken();
      if(!token){
        logout("Your admin session expired. Enter the code again.");
        throw new Error("Admin session expired.");
      }
      headers["X-Admin-Session"]=token;
    }
    const response=await fetch(path,{
      method:options.method||"GET",
      headers,
      body:options.body===undefined?undefined:JSON.stringify(options.body),
      cache:"no-store"
    });
    let data={};
    try{data=await response.json()}catch{}
    if(!response.ok){
      if(admin&&response.status===401)logout("Your admin session expired or is invalid.");
      const error=new Error(data.error||`Server error ${response.status}`);
      error.status=response.status;
      error.data=data;
      throw error;
    }
    return data;
  }

  function setTab(name){
    document.querySelectorAll("[data-admin-tab]").forEach(button=>{
      button.classList.toggle("active",button.dataset.adminTab===name);
    });
    document.querySelectorAll("[data-admin-page]").forEach(page=>{
      page.classList.toggle("active",page.dataset.adminPage===name);
    });
    const loader={
      dashboard:loadStats,
      events:loadEvents,
      codes:async()=>Promise.all([loadCodes(),loadAnnouncements()]),
      moderation:loadReports,
      audit:loadAudit
    }[name];
    loader?.().catch(error=>message(error.message,"error"));
  }

  async function login(){
    const code=String(el("adminCode").value||"");
    if(!code)return message("Enter the top secret admin code.","error");
    el("adminLogin").disabled=true;
    message("Checking the top secret code…");
    try{
      const result=await api("/api/admin/login",{method:"POST",body:{code}},false);
      sessionStorage.setItem(SESSION_KEY,result.sessionToken);
      sessionStorage.setItem(
        EXPIRY_KEY,
        String(Date.now()+Number(result.expiresInSeconds||1800)*1000)
      );
      el("adminCode").value="";
      showWorkspace();
      await loadAll();
      message("Admin Command Center unlocked.","success");
    }catch(error){
      message(error.message||"The admin code is incorrect.","error");
    }finally{
      el("adminLogin").disabled=false;
    }
  }
  async function verifySession(){
    if(!sessionToken())return showLogin();
    try{
      await api("/api/admin/session");
      showWorkspace();
      await loadAll();
      message("Admin session restored.","success");
    }catch{
      showLogin();
    }
  }
  async function loadAll(){
    await Promise.all([
      loadExclusives(),loadStats(),searchPlayers(true),loadEvents(),
      loadCodes(),loadAnnouncements(),loadReports(),loadAudit()
    ]);
  }
  async function refreshAll(){
    message("Refreshing command center…");
    try{
      await loadAll();
      message("Command center refreshed.","success");
    }catch(error){
      message(error.message||"Refresh failed.","error");
    }
  }

  async function loadStats(){
    const {stats={}}=await api("/api/admin/stats");
    const values={
      statUsers:stats.users,
      statPremium:stats.premiumAccounts,
      statCoins:stats.totalCoins,
      statFocus:stats.totalFocusMinutes,
      statProfiles:stats.publicProfiles,
      statReports:stats.openReports,
      statEvents:stats.activeEvents,
      statClaims:stats.totalEventClaims,
      statCodes:stats.activeRewardCodes,
      statRedemptions:stats.rewardCodeRedemptions,
      statAnnouncements:stats.activeAnnouncements,
      statActions:stats.totalAdminActions
    };
    Object.entries(values).forEach(([id,value])=>{
      el(id).textContent=Math.floor(Number(value)||0).toLocaleString();
    });
  }
  async function loadExclusives(){
    const data=await api("/api/admin/exclusives");
    exclusives=Array.isArray(data.exclusives)?data.exclusives:[];
    for(const id of ["grantExclusive","eventExclusive","codeExclusive"]){
      const select=el(id);
      const current=select.value;
      select.innerHTML='<option value="">No exclusive item</option>';
      exclusives.forEach(item=>{
        const option=document.createElement("option");
        option.value=item.id;
        option.textContent=`${item.icon} ${item.name}`;
        select.appendChild(option);
      });
      select.value=current;
    }
  }
  function rewardDescription(reward={}){
    const parts=[];
    if(Number(reward.coins)>0)parts.push(`${Number(reward.coins).toLocaleString()} coins`);
    Object.entries(reward.fruits||{}).forEach(([key,value])=>{
      if(Number(value)>0)parts.push(`${value} ${key}${Number(value)===1?"":"s"}`);
    });
    if(reward.exclusiveId){
      parts.push(exclusives.find(item=>item.id===reward.exclusiveId)?.name||reward.exclusiveId);
    }
    return parts.join(" · ")||"No reward";
  }
  function rewardFrom(prefix){
    return {
      title:String(el(`${prefix}Title`)?.value||"Special Reward").trim(),
      coins:clamp(el(`${prefix}Coins`)?.value,0,1000000),
      fruits:{
        apple:clamp(el(`${prefix}Apple`)?.value,0,100),
        banana:clamp(el(`${prefix}Banana`)?.value,0,100),
        berry:clamp(el(`${prefix}Berry`)?.value,0,100),
        mango:clamp(el(`${prefix}Mango`)?.value,0,100)
      },
      exclusiveId:el(`${prefix}Exclusive`)?.value||null
    };
  }
  function localIso(id){
    const value=el(id)?.value;
    if(!value)return null;
    const date=new Date(value);
    return Number.isNaN(date.getTime())?null:date.toISOString();
  }
  function timeText(value){
    const date=new Date(value);
    return Number.isNaN(date.getTime())?"Unknown":date.toLocaleString();
  }

  function playerMarkup(player){
    const progress=player.progress||{};
    const owned=progress.adminExclusives||[];
    return `<div class="player-summary-head">
      <div><strong>${esc(player.nickname||"Unnamed Hammy account")}</strong>
      <span>${esc(player.playerId)}</span></div>
      <span class="status-pill">${player.premium?"Premium preview":"Free"}</span>
     </div>
     <div class="player-summary-grid">
      <div><span>Friend code</span><strong>${esc(player.friendCode||"Not published")}</strong></div>
      <div><span>Coins</span><strong>${Number(progress.coins||0).toLocaleString()}</strong></div>
      <div><span>Practice days</span><strong>${Number(progress.practiceDays||0).toLocaleString()}</strong></div>
      <div><span>Focus minutes</span><strong>${Math.floor(Number(progress.totalFocusMinutes||0)).toLocaleString()}</strong></div>
      <div><span>Cloud revision</span><strong>${Number(player.revision||0).toLocaleString()}</strong></div>
      <div><span>Hamster</span><strong>${esc(progress.skin||"white")}</strong></div>
     </div>
     <p class="player-exclusives"><strong>Exclusives:</strong> ${
       owned.length
        ?owned.map(id=>esc(exclusives.find(item=>item.id===id)?.name||id)).join(", ")
        :"None"
     }</p>`;
  }
  function selectPlayer(player){
    currentPlayer=player;
    el("playerLookupResult").className="player-result";
    el("playerLookupResult").innerHTML=playerMarkup(player);
    el("setCoinBalance").value=String(player.progress?.coins||0);
    el("grantPlayerReward").disabled=false;
    el("setPlayerCoins").disabled=false;
    el("grantPremiumPreview").disabled=Boolean(player.premium);
    el("revokePremiumPreview").disabled=!player.premium;
    renderOwnedExclusives();
    message(`Selected ${player.playerId}.`,"success");
  }
  function renderOwnedExclusives(){
    const select=el("removeExclusiveSelect");
    const owned=currentPlayer?.progress?.adminExclusives||[];
    select.innerHTML="";
    if(!owned.length){
      select.innerHTML='<option value="">No owned exclusives</option>';
      el("removePlayerExclusive").disabled=true;
      return;
    }
    owned.forEach(id=>{
      const item=exclusives.find(entry=>entry.id===id);
      const option=document.createElement("option");
      option.value=id;
      option.textContent=item?`${item.icon} ${item.name}`:id;
      select.appendChild(option);
    });
    el("removePlayerExclusive").disabled=false;
  }
  function renderPlayerResults(players){
    const box=el("playerSearchResults");
    box.innerHTML="";
    if(!players.length){
      box.innerHTML='<div class="empty">No matching players found.</div>';
      return;
    }
    players.forEach(player=>{
      const button=document.createElement("button");
      button.className="player-search-card";
      button.innerHTML=`<strong>${esc(player.nickname||"Unnamed account")}</strong>
       <span>${esc(player.playerId)}</span>
       <small>${esc(player.friendCode||"No friend code")} · ${
         Number(player.progress?.coins||0).toLocaleString()
       } coins</small>`;
      button.addEventListener("click",()=>selectPlayer(player));
      box.appendChild(button);
    });
  }
  async function searchPlayers(silent=false){
    const query=String(el("playerSearchInput").value||"").trim().slice(0,40);
    if(!silent)message("Searching players…");
    try{
      const data=await api(`/api/admin/player-search?q=${encodeURIComponent(query)}`);
      renderPlayerResults(Array.isArray(data.players)?data.players:[]);
      if(!silent){
        message(`Found ${data.players?.length||0} matching account${
          data.players?.length===1?"":"s"
        }.`,"success");
      }
    }catch(error){
      renderPlayerResults([]);
      if(!silent)message(error.message||"Player search failed.","error");
    }
  }
  async function refreshSelected(){
    if(!currentPlayer)return;
    const data=await api(`/api/admin/players/${encodeURIComponent(currentPlayer.playerId)}`);
    selectPlayer(data.player);
    await searchPlayers(true);
  }
  async function grantReward(){
    if(!currentPlayer)return message("Select a player first.","error");
    const reward=rewardFrom("grant");
    if(rewardDescription(reward)==="No reward"){
      return message("Choose coins, fruit, or an exclusive.","error");
    }
    if(!confirm(`Grant ${rewardDescription(reward)} to ${currentPlayer.playerId}?`))return;
    try{
      await api(`/api/admin/players/${encodeURIComponent(currentPlayer.playerId)}/grant`,{
        method:"POST",body:{reward,note:String(el("grantNote").value||"").trim()}
      });
      ["Coins","Apple","Banana","Berry","Mango"].forEach(key=>{
        el(`grant${key}`).value="0";
      });
      el("grantExclusive").value="";
      el("grantNote").value="";
      await Promise.all([refreshSelected(),loadStats(),loadAudit()]);
      message("Player reward granted.","success");
    }catch(error){
      message(error.message||"Could not grant reward.","error");
    }
  }
  async function setCoins(){
    if(!currentPlayer)return message("Select a player first.","error");
    const coins=clamp(el("setCoinBalance").value,0,1000000000);
    if(!confirm(`Replace ${currentPlayer.playerId}'s balance with ${
      coins.toLocaleString()
    } coins?`))return;
    try{
      await api(`/api/admin/players/${encodeURIComponent(currentPlayer.playerId)}/coins`,{
        method:"PATCH",body:{coins}
      });
      await Promise.all([refreshSelected(),loadStats(),loadAudit()]);
      message("Exact coin balance updated.","success");
    }catch(error){
      message(error.message||"Could not set coin balance.","error");
    }
  }
  async function setPremium(active){
    if(!currentPlayer)return message("Select a player first.","error");
    if(!confirm(`${active?"Grant":"Revoke"} Premium preview for ${
      currentPlayer.playerId
    }?`))return;
    try{
      await api(`/api/admin/players/${encodeURIComponent(currentPlayer.playerId)}/premium`,{
        method:"PATCH",body:{active}
      });
      await Promise.all([refreshSelected(),loadStats(),loadAudit()]);
      message(`Premium preview ${active?"granted":"revoked"}.`,"success");
    }catch(error){
      message(error.message||"Could not update Premium preview.","error");
    }
  }
  async function removeExclusive(){
    if(!currentPlayer)return message("Select a player first.","error");
    const id=el("removeExclusiveSelect").value;
    if(!id)return message("Choose an exclusive item.","error");
    const name=exclusives.find(item=>item.id===id)?.name||id;
    if(!confirm(`Remove ${name} from ${currentPlayer.playerId}?`))return;
    try{
      await api(
        `/api/admin/players/${encodeURIComponent(currentPlayer.playerId)}/exclusives/${
          encodeURIComponent(id)
        }`,
        {method:"DELETE"}
      );
      await Promise.all([refreshSelected(),loadAudit()]);
      message("Exclusive item removed.","success");
    }catch(error){
      message(error.message||"Could not remove exclusive.","error");
    }
  }

  async function hostRandomEvent(){
    const durationMinutes=clamp(el("randomEventDuration").value,5,10080);
    if(!confirm(`Host a random event for ${durationMinutes} minutes?`))return;
    try{
      const data=await api("/api/admin/events/random",{
        method:"POST",body:{durationMinutes}
      });
      await Promise.all([loadEvents(),loadStats(),loadAudit()]);
      message(`${data.event.title} is now live.`,"success");
    }catch(error){
      message(error.message||"Could not host event.","error");
    }
  }
  async function createEvent(){
    const title=String(el("eventTitle").value||"").trim();
    const description=String(el("eventDescription").value||"").trim();
    const durationMinutes=clamp(el("eventDuration").value,5,10080);
    const startsAt=localIso("eventStartsAt");
    const reward=rewardFrom("event");
    if(title.length<3||description.length<3){
      return message("Enter an event title and description.","error");
    }
    if(rewardDescription(reward)==="No reward"){
      return message("The event needs a reward.","error");
    }
    if(!confirm(`${startsAt?"Schedule":"Start"} "${title}" with ${
      rewardDescription(reward)
    }?`))return;
    try{
      await api("/api/admin/events",{
        method:"POST",
        body:{eventType:"custom",title,description,durationMinutes,startsAt,reward}
      });
      el("eventTitle").value="";
      el("eventDescription").value="";
      el("eventStartsAt").value="";
      await Promise.all([loadEvents(),loadStats(),loadAudit()]);
      message("Event created.","success");
    }catch(error){
      message(error.message||"Could not create event.","error");
    }
  }
  function renderEvents(events){
    const list=el("eventsList");
    list.innerHTML="";
    if(!events.length){
      list.innerHTML='<div class="empty">No events have been created.</div>';
      return;
    }
    events.forEach(event=>{
      const scheduled=event.status==="active"&&
        new Date(event.startsAt).getTime()>Date.now();
      const card=document.createElement("article");
      card.className=`event-card ${event.status}`;
      card.innerHTML=`<div class="event-card-head">
       <div><span class="status-pill">${scheduled?"scheduled":esc(event.status)}</span>
       <h3>${esc(event.title)}</h3></div>
       <strong>${Number(event.claimCount||0).toLocaleString()} claims</strong>
      </div>
      <p>${esc(event.description)}</p>
      <div class="event-meta">
       <span><strong>Reward:</strong> ${esc(rewardDescription(event.reward||{}))}</span>
       <span><strong>Starts:</strong> ${esc(timeText(event.startsAt))}</span>
       <span><strong>Ends:</strong> ${esc(timeText(event.endsAt))}</span>
      </div><div class="actions"></div>`;
      if(event.status==="active"){
        [["End event","secondary","ended"],["Cancel event","remove","cancelled"]]
          .forEach(([label,cls,status])=>{
            const button=document.createElement("button");
            button.className=cls;
            button.textContent=label;
            button.addEventListener("click",()=>changeEvent(event.id,status));
            card.querySelector(".actions").appendChild(button);
          });
      }
      list.appendChild(card);
    });
  }
  async function loadEvents(){
    const data=await api("/api/admin/events");
    renderEvents(Array.isArray(data.events)?data.events:[]);
  }
  async function changeEvent(id,status){
    if(!confirm(`${status==="cancelled"?"Cancel":"End"} this event?`))return;
    try{
      await api(`/api/admin/events/${id}`,{method:"PATCH",body:{status}});
      await Promise.all([loadEvents(),loadStats(),loadAudit()]);
      message(`Event changed to ${status}.`,"success");
    }catch(error){
      message(error.message||"Could not update event.","error");
    }
  }

  function codeReward(){
    return {
      title:String(el("codeTitle").value||"Private Code Reward").trim(),
      coins:clamp(el("codeCoins").value,0,1000000),
      fruits:{
        apple:clamp(el("codeApple").value,0,100),
        banana:clamp(el("codeBanana").value,0,100),
        berry:clamp(el("codeBerry").value,0,100),
        mango:clamp(el("codeMango").value,0,100)
      },
      exclusiveId:el("codeExclusive").value||null
    };
  }
  async function createCode(){
    const code=String(el("codeName").value||"")
      .toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,24);
    el("codeName").value=code;
    const title=String(el("codeTitle").value||"").trim();
    const description=String(el("codeDescription").value||"").trim();
    const startsAt=localIso("codeStartsAt");
    const endsAt=localIso("codeEndsAt");
    const maxRaw=el("codeMaxUses").value;
    const maxRedemptions=maxRaw?clamp(maxRaw,1,1000000):null;
    const reward=codeReward();
    if(code.length<4)return message("Reward codes need at least four letters or numbers.","error");
    if(title.length<3||description.length<3){
      return message("Enter a title and description.","error");
    }
    if(rewardDescription(reward)==="No reward"){
      return message("The code needs a reward.","error");
    }
    if(endsAt&&startsAt&&new Date(endsAt)<=new Date(startsAt)){
      return message("End time must be after start time.","error");
    }
    if(!confirm(`Create code ${code} for ${rewardDescription(reward)}?`))return;
    try{
      await api("/api/admin/reward-codes",{
        method:"POST",
        body:{code,title,description,reward,maxRedemptions,startsAt,endsAt}
      });
      ["codeName","codeTitle","codeDescription","codeMaxUses","codeStartsAt","codeEndsAt"]
        .forEach(id=>{el(id).value=""});
      el("codeCoins").value="100";
      ["codeApple","codeBanana","codeBerry","codeMango"]
        .forEach(id=>{el(id).value="0"});
      el("codeExclusive").value="";
      await Promise.all([loadCodes(),loadStats(),loadAudit()]);
      message(`Reward code ${code} created.`,"success");
    }catch(error){
      message(error.message||"Could not create code.","error");
    }
  }
  function renderCodes(codes){
    const list=el("rewardCodesList");
    list.innerHTML="";
    if(!codes.length){
      list.innerHTML='<div class="empty">No custom reward codes yet.</div>';
      return;
    }
    codes.forEach(code=>{
      const limit=code.maxRedemptions==null
        ?"Unlimited":Number(code.maxRedemptions).toLocaleString();
      const card=document.createElement("article");
      card.className=`management-card ${code.status}`;
      card.innerHTML=`<div class="management-head">
       <div><span class="status-pill">${esc(code.status)}</span>
       <h3>${esc(code.code)}</h3></div>
       <strong>${Number(code.redemptionCount||0).toLocaleString()} / ${limit} uses</strong>
      </div>
      <p><strong>${esc(code.title)}</strong> — ${esc(code.description)}</p>
      <p class="small-text">${esc(rewardDescription(code.reward||{}))}</p>
      <p class="small-text">Starts ${esc(timeText(code.startsAt))}${
        code.endsAt?` · Ends ${esc(timeText(code.endsAt))}`:" · No end date"
      }</p><div class="actions"></div>`;
      const button=document.createElement("button");
      const next=code.status==="active"?"disabled":"active";
      button.className=code.status==="active"?"remove":"secondary";
      button.textContent=code.status==="active"?"Disable code":"Enable code";
      button.addEventListener("click",()=>changeCode(code.code,next));
      card.querySelector(".actions").appendChild(button);
      list.appendChild(card);
    });
  }
  async function loadCodes(){
    const data=await api("/api/admin/reward-codes");
    renderCodes(Array.isArray(data.codes)?data.codes:[]);
  }
  async function changeCode(code,status){
    if(!confirm(`${status==="active"?"Enable":"Disable"} ${code}?`))return;
    try{
      await api(`/api/admin/reward-codes/${encodeURIComponent(code)}`,{
        method:"PATCH",body:{status}
      });
      await Promise.all([loadCodes(),loadStats(),loadAudit()]);
      message(`Reward code ${code} updated.`,"success");
    }catch(error){
      message(error.message||"Could not update code.","error");
    }
  }

  async function publishAnnouncement(){
    const title=String(el("announcementTitle").value||"").trim();
    const announcementMessage=String(el("announcementMessage").value||"").trim();
    const priority=el("announcementPriority").value;
    const durationMinutes=clamp(el("announcementDuration").value,5,10080);
    const startsAt=localIso("announcementStartsAt");
    if(title.length<3||announcementMessage.length<3){
      return message("Enter an announcement title and message.","error");
    }
    if(!confirm(`${startsAt?"Schedule":"Publish"} "${title}"?`))return;
    try{
      await api("/api/admin/announcements",{
        method:"POST",
        body:{
          title,message:announcementMessage,priority,durationMinutes,startsAt
        }
      });
      el("announcementTitle").value="";
      el("announcementMessage").value="";
      el("announcementStartsAt").value="";
      await Promise.all([loadAnnouncements(),loadStats(),loadAudit()]);
      message("Announcement published.","success");
    }catch(error){
      message(error.message||"Could not publish announcement.","error");
    }
  }
  function renderAnnouncements(rows){
    const list=el("announcementsList");
    list.innerHTML="";
    if(!rows.length){
      list.innerHTML='<div class="empty">No announcements have been published.</div>';
      return;
    }
    rows.forEach(row=>{
      const scheduled=row.status==="active"&&
        new Date(row.startsAt).getTime()>Date.now();
      const card=document.createElement("article");
      card.className=`management-card announcement-${row.priority}`;
      card.innerHTML=`<div class="management-head">
       <div><span class="status-pill">${scheduled?"scheduled":esc(row.status)}</span>
       <h3>${esc(row.title)}</h3></div><strong>${esc(row.priority)}</strong>
      </div>
      <p>${esc(row.message)}</p>
      <p class="small-text">Starts ${esc(timeText(row.startsAt))} · Ends ${
        esc(timeText(row.endsAt))
      }</p><div class="actions"></div>`;
      if(row.status==="active"){
        const button=document.createElement("button");
        button.className="remove";
        button.textContent="End announcement";
        button.addEventListener("click",()=>endAnnouncement(row.id));
        card.querySelector(".actions").appendChild(button);
      }
      list.appendChild(card);
    });
  }
  async function loadAnnouncements(){
    const data=await api("/api/admin/announcements");
    renderAnnouncements(Array.isArray(data.announcements)?data.announcements:[]);
  }
  async function endAnnouncement(id){
    if(!confirm("End this announcement?"))return;
    try{
      await api(`/api/admin/announcements/${id}`,{
        method:"PATCH",body:{status:"ended"}
      });
      await Promise.all([loadAnnouncements(),loadStats(),loadAudit()]);
      message("Announcement ended.","success");
    }catch(error){
      message(error.message||"Could not end announcement.","error");
    }
  }

  async function loadReports(){
    const status=el("reportStatus").value;
    const data=await api(`/api/admin/reports?status=${encodeURIComponent(status)}`);
    const reports=Array.isArray(data.reports)?data.reports:[];
    const list=el("reportList");
    list.innerHTML="";
    if(!reports.length){
      list.innerHTML='<div class="empty">No reports match this filter.</div>';
      return;
    }
    reports.forEach(report=>{
      const card=document.createElement("article");
      card.className="report-card";
      card.innerHTML=`<h2>${esc(report.nickname||"Profile unavailable")}</h2>
       <div class="report-meta">
        <span class="tag">Code: ${esc(report.profile_code)}</span>
        <span class="tag">Reason: ${esc(reasonLabels[report.reason]||report.reason)}</span>
        <span class="tag">Report: ${esc(report.status)}</span>
        <span class="tag">Profile: ${esc(report.moderation_status||"missing")}</span>
       </div>
       <p style="margin-top:9px">Submitted ${esc(timeText(report.created_at))}</p>
       <div class="actions"></div>`;
      [
        ["Mark reviewed","secondary",()=>updateReport(report.id,"reviewed")],
        ["Dismiss","secondary",()=>updateReport(report.id,"dismissed")],
        ["Hide profile","hide",()=>moderate(report.profile_code,"hidden")],
        ["Remove profile","remove",()=>moderate(report.profile_code,"removed")],
        ["Restore profile","secondary",()=>moderate(report.profile_code,"active")]
      ].forEach(([label,cls,handler])=>{
        const button=document.createElement("button");
        button.className=cls;
        button.textContent=label;
        button.addEventListener("click",()=>handler().catch(error=>message(error.message,"error")));
        card.querySelector(".actions").appendChild(button);
      });
      list.appendChild(card);
    });
  }
  async function updateReport(id,status){
    await api(`/api/admin/reports/${id}`,{method:"PATCH",body:{status}});
    await Promise.all([loadReports(),loadStats()]);
  }
  async function moderate(code,status){
    const verb=status==="removed"?"remove":status==="hidden"?"hide":"restore";
    if(!confirm(`${verb} profile ${code}?`))return;
    await api(`/api/admin/profiles/${code}`,{method:"PATCH",body:{status}});
    await loadReports();
    message(`Profile ${code} changed to ${status}.`,"success");
  }

  function auditText(entry){
    const details=entry.details||{};
    if(entry.action==="player_reward_grant"){
      return `${rewardDescription(details.reward||{})}${details.note?` · ${details.note}`:""}`;
    }
    if(entry.action==="player_coins_set"){
      return `Exact balance: ${Number(details.coins||0).toLocaleString()} coins`;
    }
    if(entry.action==="player_exclusive_removed"){
      return `Removed ${details.exclusiveId||"exclusive"}`;
    }
    if(entry.action.includes("premium_preview")){
      return details.active===false?"Premium preview revoked":"Premium preview changed";
    }
    if(entry.action==="event_created"){
      return `${details.title||"Event"} · ${rewardDescription(details.reward||{})}`;
    }
    if(entry.action==="event_status_changed"){
      return `${details.eventId||"Event"} → ${details.status||"changed"}`;
    }
    if(entry.action==="reward_code_created"){
      return `${details.code||"Code"} · ${rewardDescription(details.reward||{})}`;
    }
    if(entry.action==="reward_code_status_changed"){
      return `${details.code||"Code"} → ${details.status||"changed"}`;
    }
    if(entry.action==="announcement_created"){
      return `${details.title||"Announcement"} · ${details.priority||"normal"}`;
    }
    if(entry.action==="announcement_status_changed"){
      return `${details.id||"Announcement"} → ${details.status||"changed"}`;
    }
    return JSON.stringify(details);
  }
  async function loadAudit(){
    const data=await api("/api/admin/audit?limit=200");
    auditCache=Array.isArray(data.entries)?data.entries:[];
    const list=el("auditList");
    list.innerHTML="";
    if(!auditCache.length){
      list.innerHTML='<div class="empty">No admin actions recorded.</div>';
      return;
    }
    auditCache.forEach(entry=>{
      const row=document.createElement("article");
      row.className="audit-entry";
      row.innerHTML=`<div><strong>${
        esc(String(entry.action||"admin_action").replaceAll("_"," "))
      }</strong><p>${esc(auditText(entry))}</p></div>
       <div class="audit-target"><span>${esc(entry.target_player_id||"Global")}</span>
       <time>${esc(timeText(entry.created_at))}</time></div>`;
      list.appendChild(row);
    });
  }
  function exportAudit(){
    const blob=new Blob([
      JSON.stringify({exportedAt:new Date().toISOString(),entries:auditCache},null,2)
    ],{type:"application/json"});
    const link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download=`hammy-admin-audit-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  document.querySelectorAll("[data-admin-tab]").forEach(button=>{
    button.addEventListener("click",()=>setTab(button.dataset.adminTab));
  });
  document.querySelectorAll("[data-go-tab]").forEach(button=>{
    button.addEventListener("click",()=>setTab(button.dataset.goTab));
  });
  el("adminLogin").addEventListener("click",login);
  el("adminCode").addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();login()}
  });
  el("adminLogout").addEventListener("click",()=>logout());
  el("refreshEverything").addEventListener("click",refreshAll);
  el("playerSearchInput").addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();searchPlayers()}
  });
  el("searchPlayers").addEventListener("click",()=>searchPlayers());
  el("grantPlayerReward").addEventListener("click",grantReward);
  el("setPlayerCoins").addEventListener("click",setCoins);
  el("grantPremiumPreview").addEventListener("click",()=>setPremium(true));
  el("revokePremiumPreview").addEventListener("click",()=>setPremium(false));
  el("removePlayerExclusive").addEventListener("click",removeExclusive);
  el("hostRandomEvent").addEventListener("click",hostRandomEvent);
  el("createCustomEvent").addEventListener("click",createEvent);
  el("refreshEvents").addEventListener("click",()=>{
    loadEvents().catch(error=>message(error.message,"error"));
  });
  el("codeName").addEventListener("input",event=>{
    event.target.value=String(event.target.value)
      .toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,24);
  });
  el("createRewardCode").addEventListener("click",createCode);
  el("refreshCodes").addEventListener("click",()=>{
    loadCodes().catch(error=>message(error.message,"error"));
  });
  el("publishAnnouncement").addEventListener("click",publishAnnouncement);
  el("refreshAnnouncements").addEventListener("click",()=>{
    loadAnnouncements().catch(error=>message(error.message,"error"));
  });
  el("loadReports").addEventListener("click",()=>{
    loadReports().catch(error=>message(error.message,"error"));
  });
  el("reportStatus").addEventListener("change",()=>{
    loadReports().catch(error=>message(error.message,"error"));
  });
  el("refreshAudit").addEventListener("click",()=>{
    loadAudit().catch(error=>message(error.message,"error"));
  });
  el("exportAudit").addEventListener("click",exportAudit);

  verifySession();
})();

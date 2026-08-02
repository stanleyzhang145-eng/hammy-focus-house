"use strict";
(() => {
  const el=id=>document.getElementById(id);
  const sessionKey="hammyAdminSessionV1";
  const expiryKey="hammyAdminSessionExpiresV1";
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
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

  function message(text,type=""){
    const box=el("adminMessage");
    box.textContent=text;
    box.className=`message${type?" "+type:""}`;
  }
  function sessionToken(){
    const expires=Number(sessionStorage.getItem(expiryKey)||0);
    if(!expires||expires<=Date.now()){
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(expiryKey);
      return "";
    }
    return sessionStorage.getItem(sessionKey)||"";
  }
  function showLogin(){
    el("adminLoginPanel").classList.remove("hidden");
    el("adminWorkspace").classList.add("hidden");
  }
  function showWorkspace(){
    el("adminLoginPanel").classList.add("hidden");
    el("adminWorkspace").classList.remove("hidden");
  }
  function logout(messageText="Admin panel locked."){
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(expiryKey);
    currentPlayer=null;
    showLogin();
    message(messageText);
  }
  async function publicApi(path,options={}){
    const response=await fetch(path,{
      method:options.method||"GET",
      headers:{"Content-Type":"application/json"},
      body:options.body===undefined?undefined:JSON.stringify(options.body),
      cache:"no-store"
    });
    let data={};try{data=await response.json()}catch{}
    if(!response.ok){
      const error=new Error(data.error||`Server error ${response.status}`);
      error.status=response.status;error.data=data;throw error;
    }
    return data;
  }
  async function adminApi(path,options={}){
    const token=sessionToken();
    if(!token){
      logout("Your admin session expired. Enter the code again.");
      throw new Error("Admin session expired.");
    }
    const response=await fetch(path,{
      method:options.method||"GET",
      headers:{"Content-Type":"application/json","X-Admin-Session":token},
      body:options.body===undefined?undefined:JSON.stringify(options.body),
      cache:"no-store"
    });
    let data={};try{data=await response.json()}catch{}
    if(!response.ok){
      if(response.status===401)logout("Your admin session expired or is invalid.");
      const error=new Error(data.error||`Server error ${response.status}`);
      error.status=response.status;error.data=data;throw error;
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
    if(name==="dashboard")loadStats().catch(error=>message(error.message,"error"));
    if(name==="events")loadEvents().catch(error=>message(error.message,"error"));
    if(name==="moderation")loadReports().catch(error=>message(error.message,"error"));
    if(name==="audit")loadAudit().catch(error=>message(error.message,"error"));
  }
  async function login(){
    const code=String(el("adminCode").value||"");
    if(!code)return message("Enter the top secret admin code.","error");
    el("adminLogin").disabled=true;
    message("Checking the top secret code…");
    try{
      const result=await publicApi("/api/admin/login",{method:"POST",body:{code}});
      sessionStorage.setItem(sessionKey,result.sessionToken);
      sessionStorage.setItem(expiryKey,String(Date.now()+(Number(result.expiresInSeconds||1800)*1000)));
      el("adminCode").value="";
      showWorkspace();
      message("Live Operations unlocked. Session expires automatically.","success");
      await loadInitialData();
    }catch(error){
      message(error.message||"The admin code is incorrect.","error");
    }finally{el("adminLogin").disabled=false}
  }
  async function loadInitialData(){
    await Promise.all([loadStats(),loadExclusives(),loadEvents(),loadReports(),loadAudit()]);
  }
  async function loadStats(){
    const data=await adminApi("/api/admin/stats");
    const stats=data.stats||{};
    el("statUsers").textContent=stats.users??0;
    el("statSaves").textContent=stats.cloudSaves??0;
    el("statProfiles").textContent=stats.publicProfiles??0;
    el("statReports").textContent=stats.openReports??0;
    el("statEvents").textContent=stats.activeEvents??0;
    el("statClaims").textContent=stats.totalEventClaims??0;
  }
  async function loadExclusives(){
    const data=await adminApi("/api/admin/exclusives");
    exclusives=Array.isArray(data.exclusives)?data.exclusives:[];
    for(const select of [el("grantExclusive"),el("eventExclusive")]){
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
  function normalizeIdentifier(value){
    return String(value||"").toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,24);
  }
  function playerSummaryMarkup(player){
    const progress=player.progress||{};
    const exclusiveNames=(progress.adminExclusives||[]).map(id=>exclusives.find(item=>item.id===id)?.name||id);
    return `<div class="player-summary-head">
      <div><strong>${esc(player.nickname||"Unnamed Hammy account")}</strong><span>${esc(player.playerId)}</span></div>
      <span class="status-pill">${player.premium?"Premium":"Free"}</span>
     </div>
     <div class="player-summary-grid">
      <div><span>Friend code</span><strong>${esc(player.friendCode||"Not published")}</strong></div>
      <div><span>Coins</span><strong>${clamp(progress.coins,0,999999999)}</strong></div>
      <div><span>Practice days</span><strong>${clamp(progress.practiceDays,0,999999)}</strong></div>
      <div><span>Focus minutes</span><strong>${Math.floor(clamp(progress.totalFocusMinutes,0,99999999))}</strong></div>
      <div><span>Cloud revision</span><strong>${clamp(player.revision,0,999999999)}</strong></div>
      <div><span>Selected hamster</span><strong>${esc(progress.skin||"white")}</strong></div>
     </div>
     <p class="player-exclusives"><strong>Exclusives:</strong> ${exclusiveNames.length?exclusiveNames.map(esc).join(", "):"None"}</p>`;
  }
  async function lookupPlayer(){
    const input=el("playerLookupInput");
    const identifier=normalizeIdentifier(input.value);
    input.value=identifier;
    if(!identifier)return message("Enter a Player ID or friend code.","error");
    el("lookupPlayer").disabled=true;
    el("playerLookupResult").className="player-result";
    el("playerLookupResult").textContent="Searching…";
    try{
      const data=await adminApi(`/api/admin/players/${encodeURIComponent(identifier)}`);
      currentPlayer=data.player;
      el("playerLookupResult").innerHTML=playerSummaryMarkup(currentPlayer);
      el("grantPlayerReward").disabled=false;
      message(`Selected ${currentPlayer.playerId}.`,"success");
    }catch(error){
      currentPlayer=null;
      el("grantPlayerReward").disabled=true;
      el("playerLookupResult").className="player-result empty-result";
      el("playerLookupResult").textContent=error.message||"Player not found.";
      message(error.message||"Player not found.","error");
    }finally{el("lookupPlayer").disabled=false}
  }
  function rewardFromInputs(prefix){
    return {
      title:String(el(`${prefix}Title`)?.value||`${prefix==="grant"?"Admin Gift":"Live Event Reward"}`).trim(),
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
  function rewardDescription(reward){
    const parts=[];
    if(reward.coins)parts.push(`${reward.coins} coins`);
    for(const [key,value] of Object.entries(reward.fruits||{})){
      if(value)parts.push(`${value} ${key}${value===1?"":"s"}`);
    }
    if(reward.exclusiveId){
      parts.push(exclusives.find(item=>item.id===reward.exclusiveId)?.name||reward.exclusiveId);
    }
    return parts.join(" · ")||"No reward";
  }
  async function grantPlayerReward(){
    if(!currentPlayer)return message("Find a player first.","error");
    const reward=rewardFromInputs("grant");
    if(rewardDescription(reward)==="No reward")return message("Choose coins, fruit, or an exclusive item.","error");
    const confirmation=`Grant ${rewardDescription(reward)} to ${currentPlayer.playerId}?`;
    if(!confirm(confirmation))return;
    el("grantPlayerReward").disabled=true;
    message("Adding the reward to the newest cloud save…");
    try{
      const data=await adminApi(`/api/admin/players/${encodeURIComponent(currentPlayer.playerId)}/grant`,{
        method:"POST",
        body:{reward,note:String(el("grantNote").value||"").trim()}
      });
      currentPlayer=data.player;
      el("playerLookupResult").innerHTML=playerSummaryMarkup(currentPlayer);
      el("grantCoins").value="0";
      for(const key of ["Apple","Banana","Berry","Mango"])el(`grant${key}`).value="0";
      el("grantExclusive").value="";
      el("grantNote").value="";
      message(`Reward granted to ${currentPlayer.playerId}. The player will receive it on their next cloud refresh.`,"success");
      await Promise.all([loadStats(),loadAudit()]);
    }catch(error){message(error.message||"Could not grant the reward.","error")}
    finally{el("grantPlayerReward").disabled=false}
  }
  async function hostRandomEvent(){
    const durationMinutes=clamp(el("randomEventDuration").value,5,10080);
    if(!confirm(`Host a random event for ${durationMinutes} minutes?`))return;
    el("hostRandomEvent").disabled=true;
    message("The server is choosing a random event…");
    try{
      const data=await adminApi("/api/admin/events/random",{
        method:"POST",body:{durationMinutes}
      });
      message(`${data.event.title} is now live: ${rewardDescription(data.event.reward)}.`,"success");
      await Promise.all([loadEvents(),loadStats(),loadAudit()]);
    }catch(error){message(error.message||"Could not host the random event.","error")}
    finally{el("hostRandomEvent").disabled=false}
  }
  async function createCustomEvent(){
    const title=String(el("eventTitle").value||"").trim();
    const description=String(el("eventDescription").value||"").trim();
    const durationMinutes=clamp(el("eventDuration").value,5,10080);
    const reward=rewardFromInputs("event");
    if(title.length<3||description.length<3)return message("Enter an event title and description.","error");
    if(rewardDescription(reward)==="No reward")return message("The event needs a reward.","error");
    if(!confirm(`Start "${title}" for ${durationMinutes} minutes with ${rewardDescription(reward)}?`))return;
    el("createCustomEvent").disabled=true;
    message("Creating the live event…");
    try{
      const data=await adminApi("/api/admin/events",{
        method:"POST",
        body:{eventType:"custom",title,description,durationMinutes,reward}
      });
      message(`${data.event.title} is now live.`,"success");
      el("eventTitle").value="";
      el("eventDescription").value="";
      await Promise.all([loadEvents(),loadStats(),loadAudit()]);
    }catch(error){message(error.message||"Could not create the event.","error")}
    finally{el("createCustomEvent").disabled=false}
  }
  function timeText(value){
    const date=new Date(value);
    return Number.isNaN(date.getTime())?"Unknown":date.toLocaleString();
  }
  function renderEvents(events){
    const list=el("eventsList");list.innerHTML="";
    if(!events.length){list.innerHTML='<div class="empty">No events have been created yet.</div>';return}
    events.forEach(event=>{
      const article=document.createElement("article");
      article.className=`event-card ${event.status}`;
      article.innerHTML=`<div class="event-card-head">
        <div><span class="status-pill">${esc(event.status)}</span><h3>${esc(event.title)}</h3></div>
        <strong>${clamp(event.claimCount,0,999999)} claims</strong>
       </div>
       <p>${esc(event.description)}</p>
       <div class="event-meta">
        <span><strong>Reward:</strong> ${esc(rewardDescription(event.reward||{}))}</span>
        <span><strong>Ends:</strong> ${esc(timeText(event.endsAt))}</span>
       </div>
       <div class="actions"></div>`;
      const actions=article.querySelector(".actions");
      if(event.status==="active"){
        const end=document.createElement("button");
        end.className="secondary";
        end.textContent="End event";
        end.addEventListener("click",()=>changeEventStatus(event.id,"ended"));
        const cancel=document.createElement("button");
        cancel.className="remove";
        cancel.textContent="Cancel event";
        cancel.addEventListener("click",()=>changeEventStatus(event.id,"cancelled"));
        actions.append(end,cancel);
      }
      list.appendChild(article);
    });
  }
  async function loadEvents(){
    const data=await adminApi("/api/admin/events");
    renderEvents(Array.isArray(data.events)?data.events:[]);
  }
  async function changeEventStatus(id,status){
    if(!confirm(`${status==="cancelled"?"Cancel":"End"} this event now?`))return;
    try{
      await adminApi(`/api/admin/events/${id}`,{method:"PATCH",body:{status}});
      message(`Event changed to ${status}.`,"success");
      await Promise.all([loadEvents(),loadStats(),loadAudit()]);
    }catch(error){message(error.message||"Could not change the event.","error")}
  }
  async function updateReport(id,status){
    await adminApi(`/api/admin/reports/${id}`,{method:"PATCH",body:{status}});
    await Promise.all([loadReports(),loadStats()]);
  }
  async function moderate(code,status){
    const label=status==="removed"?"permanently remove":status==="hidden"?"hide":"restore";
    if(!confirm(`${label} profile ${code}?`))return;
    await adminApi(`/api/admin/profiles/${code}`,{method:"PATCH",body:{status}});
    message(`Profile ${code} changed to ${status}.`,"success");
    await loadReports();
  }
  function renderReports(reports){
    const list=el("reportList");list.innerHTML="";
    if(!reports.length){list.innerHTML='<div class="empty">No reports match this filter.</div>';return}
    reports.forEach(report=>{
      const card=document.createElement("article");card.className="report-card";
      card.innerHTML=`<h2>${esc(report.nickname||"Profile unavailable")}</h2>
       <div class="report-meta">
        <span class="tag">Code: ${esc(report.profile_code)}</span>
        <span class="tag">Reason: ${esc(reasonLabels[report.reason]||report.reason)}</span>
        <span class="tag">Report: ${esc(report.status)}</span>
        <span class="tag">Profile: ${esc(report.moderation_status||"missing")}</span>
       </div>
       <p style="margin-top:9px">Submitted ${new Date(report.created_at).toLocaleString()}</p>
       <div class="actions"></div>`;
      const actions=card.querySelector(".actions");
      [
        ["Mark reviewed","secondary",()=>updateReport(report.id,"reviewed")],
        ["Dismiss report","secondary",()=>updateReport(report.id,"dismissed")],
        ["Hide profile","hide",()=>moderate(report.profile_code,"hidden")],
        ["Remove profile","remove",()=>moderate(report.profile_code,"removed")],
        ["Restore profile","secondary",()=>moderate(report.profile_code,"active")]
      ].forEach(([text,className,handler])=>{
        const button=document.createElement("button");button.textContent=text;button.className=className;
        button.addEventListener("click",()=>handler().catch(error=>message(error.message,"error")));
        actions.appendChild(button);
      });
      list.appendChild(card);
    });
  }
  async function loadReports(){
    const status=el("reportStatus").value;
    const data=await adminApi(`/api/admin/reports?status=${encodeURIComponent(status)}`);
    renderReports(Array.isArray(data.reports)?data.reports:[]);
  }
  function auditDetails(entry){
    const details=entry.details||{};
    if(entry.action==="player_reward_grant"){
      const reward=details.reward||{};
      return `${rewardDescription(reward)}${details.note?` · ${details.note}`:""}`;
    }
    if(entry.action==="event_created"){
      return `${details.title||"Event"} · ${rewardDescription(details.reward||{})}`;
    }
    if(entry.action==="event_status_changed"){
      return `${details.eventId||"Event"} → ${details.status||"changed"}`;
    }
    return JSON.stringify(details);
  }
  function renderAudit(entries){
    const list=el("auditList");list.innerHTML="";
    if(!entries.length){list.innerHTML='<div class="empty">No admin actions recorded yet.</div>';return}
    entries.forEach(entry=>{
      const row=document.createElement("article");
      row.className="audit-entry";
      row.innerHTML=`<div>
        <strong>${esc(String(entry.action||"admin_action").replaceAll("_"," "))}</strong>
        <p>${esc(auditDetails(entry))}</p>
       </div>
       <div class="audit-target">
        <span>${esc(entry.target_player_id||"Global")}</span>
        <time>${esc(timeText(entry.created_at))}</time>
       </div>`;
      list.appendChild(row);
    });
  }
  async function loadAudit(){
    const data=await adminApi("/api/admin/audit?limit=150");
    renderAudit(Array.isArray(data.entries)?data.entries:[]);
  }
  async function refreshEverything(){
    message("Refreshing Live Operations data…");
    try{
      await loadInitialData();
      message("Dashboard refreshed.","success");
    }catch(error){message(error.message||"Could not refresh the dashboard.","error")}
  }
  async function verifyExistingSession(){
    if(!sessionToken()){showLogin();return}
    try{
      await adminApi("/api/admin/session");
      showWorkspace();
      await loadInitialData();
      message("Admin session restored.","success");
    }catch{showLogin()}
  }

  document.querySelectorAll("[data-admin-tab]").forEach(button=>button.addEventListener("click",()=>setTab(button.dataset.adminTab)));
  document.querySelectorAll("[data-go-tab]").forEach(button=>button.addEventListener("click",()=>setTab(button.dataset.goTab)));
  el("adminLogin").addEventListener("click",login);
  el("adminCode").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();login()}});
  el("adminLogout").addEventListener("click",()=>logout());
  el("refreshEverything").addEventListener("click",refreshEverything);
  el("playerLookupInput").addEventListener("input",event=>{event.target.value=normalizeIdentifier(event.target.value)});
  el("playerLookupInput").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();lookupPlayer()}});
  el("lookupPlayer").addEventListener("click",lookupPlayer);
  el("grantPlayerReward").addEventListener("click",grantPlayerReward);
  el("hostRandomEvent").addEventListener("click",hostRandomEvent);
  el("createCustomEvent").addEventListener("click",createCustomEvent);
  el("refreshEvents").addEventListener("click",()=>loadEvents().catch(error=>message(error.message,"error")));
  el("loadReports").addEventListener("click",()=>loadReports().catch(error=>message(error.message,"error")));
  el("reportStatus").addEventListener("change",()=>loadReports().catch(error=>message(error.message,"error")));
  el("refreshAudit").addEventListener("click",()=>loadAudit().catch(error=>message(error.message,"error")));

  verifyExistingSession();
})();

"use strict";
(() => {
  const el=id=>document.getElementById(id);
  const sessionKey="hammyAdminSessionV1";
  const expiryKey="hammyAdminSessionExpiresV1";
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const reasonLabels={
    inappropriate_nickname:"Inappropriate nickname",
    personal_information:"Personal information",
    unsafe_content:"Unsafe content",
    spam:"Spam",
    other:"Other preset reason"
  };
  function message(text,type=""){
    const box=el("adminMessage");box.textContent=text;box.className=`message${type?" "+type:""}`;
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
    el("adminToolsPanel").classList.add("hidden");
    el("reportList").innerHTML="";
  }
  function showTools(){
    el("adminLoginPanel").classList.add("hidden");
    el("adminToolsPanel").classList.remove("hidden");
  }
  function logout(messageText="Admin panel locked."){
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(expiryKey);
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
    if(!response.ok){const error=new Error(data.error||`Server error ${response.status}`);error.status=response.status;throw error}
    return data;
  }
  async function adminApi(path,options={}){
    const token=sessionToken();
    if(!token){logout("Your admin session expired. Enter the code again.");throw new Error("Admin session expired.")}
    const response=await fetch(path,{
      method:options.method||"GET",
      headers:{"Content-Type":"application/json","X-Admin-Session":token},
      body:options.body===undefined?undefined:JSON.stringify(options.body),
      cache:"no-store"
    });
    let data={};try{data=await response.json()}catch{}
    if(!response.ok){
      if(response.status===401)logout("Your admin session expired or is invalid.");
      const error=new Error(data.error||`Server error ${response.status}`);error.status=response.status;throw error
    }
    return data;
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
      showTools();
      message("Admin panel unlocked. Session expires automatically.","success");
      await load();
    }catch(error){
      message(error.message||"The admin code is incorrect.","error");
    }finally{el("adminLogin").disabled=false}
  }
  async function updateReport(id,status){
    await adminApi(`/api/admin/reports/${id}`,{method:"PATCH",body:{status}});
    await load();
  }
  async function moderate(code,status){
    const label=status==="removed"?"permanently remove":status==="hidden"?"hide":"restore";
    if(!confirm(`${label} profile ${code}?`))return;
    await adminApi(`/api/admin/profiles/${code}`,{method:"PATCH",body:{status}});
    message(`Profile ${code} changed to ${status}.`,"success");
    await load();
  }
  function render(reports){
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
  async function load(){
    message("Loading reports…");
    try{
      const status=el("reportStatus").value;
      const data=await adminApi(`/api/admin/reports?status=${encodeURIComponent(status)}`);
      render(Array.isArray(data.reports)?data.reports:[]);
      message(`Loaded ${data.reports?.length||0} report${data.reports?.length===1?"":"s"}.`,"success");
    }catch(error){
      if(error.status!==401)message(error.message||"Could not load reports.","error");
    }
  }
  async function verifyExistingSession(){
    if(!sessionToken()){showLogin();return}
    try{
      await adminApi("/api/admin/session");
      showTools();
      await load();
    }catch{showLogin()}
  }

  el("adminLogin").addEventListener("click",login);
  el("adminCode").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();login()}});
  el("loadReports").addEventListener("click",load);
  el("reportStatus").addEventListener("change",()=>{if(sessionToken())load()});
  el("adminLogout").addEventListener("click",()=>logout());
  verifyExistingSession();
})();

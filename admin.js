"use strict";
(() => {
  const el=id=>document.getElementById(id);
  const keyName="hammyAdminKeyV1";
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
  function adminKey(){return el("adminKey").value.trim()}
  async function api(path,options={}){
    const response=await fetch(path,{
      method:options.method||"GET",
      headers:{"Content-Type":"application/json","X-Admin-Key":adminKey()},
      body:options.body===undefined?undefined:JSON.stringify(options.body),
      cache:"no-store"
    });
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Server error ${response.status}`);
    return data;
  }
  async function updateReport(id,status){
    await api(`/api/admin/reports/${id}`,{method:"PATCH",body:{status}});
    await load();
  }
  async function moderate(code,status){
    const label=status==="removed"?"permanently remove":"hide";
    if(!confirm(`${label} profile ${code}?`))return;
    await api(`/api/admin/profiles/${code}`,{method:"PATCH",body:{status}});
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
      const buttons=[
        ["Mark reviewed","secondary",()=>updateReport(report.id,"reviewed")],
        ["Dismiss report","secondary",()=>updateReport(report.id,"dismissed")],
        ["Hide profile","hide",()=>moderate(report.profile_code,"hidden")],
        ["Remove profile","remove",()=>moderate(report.profile_code,"removed")],
        ["Restore profile","secondary",()=>moderate(report.profile_code,"active")]
      ];
      buttons.forEach(([text,className,handler])=>{
        const button=document.createElement("button");button.textContent=text;button.className=className;
        button.addEventListener("click",()=>handler().catch(error=>message(error.message,"error")));
        actions.appendChild(button);
      });
      list.appendChild(card);
    });
  }
  async function load(){
    if(!adminKey())return message("Enter the private ADMIN_KEY first.","error");
    sessionStorage.setItem(keyName,adminKey());
    message("Loading reports…");
    try{
      const status=el("reportStatus").value;
      const data=await api(`/api/admin/reports?status=${encodeURIComponent(status)}`);
      render(Array.isArray(data.reports)?data.reports:[]);
      message(`Loaded ${data.reports?.length||0} report${data.reports?.length===1?"":"s"}.`,"success");
    }catch(error){message(error.message||"Could not load reports.","error")}
  }
  el("adminKey").value=sessionStorage.getItem(keyName)||"";
  el("loadReports").addEventListener("click",load);
  el("reportStatus").addEventListener("change",()=>{if(adminKey())load()});
  el("forgetAdminKey").addEventListener("click",()=>{sessionStorage.removeItem(keyName);el("adminKey").value="";el("reportList").innerHTML="";message("Admin key forgotten.")});
})();

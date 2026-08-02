
"use strict";
const $=id=>document.getElementById(id);
const defaults={coins:40,streak:0,practiceDays:0,totalFocusMinutes:0,sessionCount:0,lastPracticeDate:"",happy:70,hunger:30,energy:85,premium:false,skin:"white",theme:"lavender",foods:{apple:2,banana:1,berry:0,mango:0},clothes:["shirt","hoodie"],equipped:null,ownedFurniture:{bed:false,sofa:false,desk:false,plant:false,aquarium:false,tunnel:false,toybox:false,bookshelf:false,lamp:false,rug:false,wheel:false,snack:false,music:false,castle:false},placedFurniture:{bed:false,sofa:false,desk:false,plant:false,aquarium:false,tunnel:false,toybox:false,bookshelf:false,lamp:false,rug:false,wheel:false,snack:false,music:false,castle:false}};
let state;
try{state={...defaults,...JSON.parse(localStorage.getItem("hammyV8")||localStorage.getItem("hammyV5")||"{}")};state.foods={...defaults.foods,...(state.foods||{})};state.ownedFurniture={...defaults.ownedFurniture,...(state.ownedFurniture||{})};state.placedFurniture={...defaults.placedFurniture,...(state.placedFurniture||{})};state.practiceDays=Number(state.practiceDays||0);state.totalFocusMinutes=Number(state.totalFocusMinutes||0);state.sessionCount=Number(state.sessionCount||0);state.lastPracticeDate=state.lastPracticeDate||"";state.theme=state.theme||"lavender"}catch{state=structuredClone(defaults)}
const skins={
 white:{name:"White Hamster",fur:"#fff",fur2:"#f7f5f1",patch:"transparent",premium:false},
 orange:{name:"Orange Hamster",fur:"#e89a3f",fur2:"#fff0d1",patch:"transparent",premium:true},
 panda:{name:"Black & White Hamster",fur:"#f6f6f6",fur2:"#fff",patch:"#35333b",premium:true},
 caramel:{name:"Caramel Hamster",fur:"#b9784d",fur2:"#edd0b8",patch:"#805239",premium:true},
 silver:{name:"Silver Hamster",fur:"#b8beca",fur2:"#eef1f5",patch:"#747a88",premium:true},
 strawberry:{name:"Strawberry Hamster",fur:"#e99ab4",fur2:"#ffe5ee",patch:"#c96f8d",premium:true}
};
const clothes={
 shirt:{name:"Focus Shirt",type:"shirt",color:"#7d9edb",days:0},
 hoodie:{name:"Cloud Hoodie",type:"hoodie",color:"#8a9fe3",days:0},
 bow:{name:"Berry Bow",type:"bow",color:"#e9799a",days:3},
 scarf:{name:"Cozy Scarf",type:"scarf",color:"#71b49d",days:7},
 hat:{name:"Explorer Hat",type:"hat",color:"#d39755",days:10},
 glasses:{name:"Study Glasses",type:"glasses",color:"#536071",days:15},
 pajamas:{name:"Star Pajamas",type:"pajamas",color:"#7767bd",days:21},
 cape:{name:"Hero Cape",type:"cape",color:"#566fba",days:30},
 overalls:{name:"Garden Overalls",type:"overalls",color:"#6fa66e",days:35},
 backpack:{name:"Adventure Backpack",type:"backpack",color:"#c7804e",days:45},
 apron:{name:"Baker Apron",type:"apron",color:"#ef9e8d",days:50},
 jacket:{name:"Champion Jacket",type:"jacket",color:"#d65964",days:60},
 moonPajamas:{name:"Moonlight Pajamas",type:"pajamas",color:"#4f5796",days:75},
 crown:{name:"Golden Focus Crown",type:"crown",color:"#f2c94c",days:90},
 legendcape:{name:"100-Day Legend Cape",type:"cape",color:"#9b5de5",days:100},
 galaxyHoodie:{name:"Galaxy Hoodie",type:"hoodie",color:"#4b4f9e",days:120},
 masterOveralls:{name:"Master Builder Overalls",type:"overalls",color:"#557eb3",days:150},
 royalPajamas:{name:"Royal Pajamas",type:"pajamas",color:"#8a4a96",days:180},
 focusLegend:{name:"Focus Legend Jacket",type:"jacket",color:"#d06a55",days:365}
};
const fruits={apple:{name:"Apple",color:"#df5260"},banana:{name:"Banana",color:"#f2cf4d"},berry:{name:"Berry",color:"#8065c4"},mango:{name:"Mango",color:"#efa443"}};

const themes={
 lavender:{name:"Lavender House",swatches:["#f5effd","#8b63d9","#eee4ff","#e6c59d"]},
 mint:{name:"Mint Garden",swatches:["#eaf8f1","#55a982","#dff5e9","#d4b98d"]},
 sunset:{name:"Sunset Peach",swatches:["#fff1e7","#e47d68","#ffe0d3","#d6a374"]},
 ocean:{name:"Ocean Blue",swatches:["#e8f5fb","#4d98c4","#d7eef9","#d9bf92"]},
 strawberry:{name:"Strawberry Pink",swatches:["#fff0f5","#d9678d","#fce1ea","#dbb08c"]},
 night:{name:"Cozy Night",swatches:["#17182a","#9885ed","#323655","#5d4760"]}
};
function applyTheme(){
 if(!themes[state.theme])state.theme="lavender";
 document.body.dataset.theme=state.theme;
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=themes[state.theme].swatches[1];
}
function renderSettings(){
 const grid=$("themeGrid");
 if(!grid)return;
 grid.innerHTML="";
 Object.entries(themes).forEach(([key,t])=>{
   const button=document.createElement("button");
   button.type="button";
   button.className="theme-card"+(state.theme===key?" selected":"");
   button.innerHTML=`<div class="theme-swatch" style="--sw1:${t.swatches[0]};--sw2:${t.swatches[1]};--sw3:${t.swatches[2]};--sw4:${t.swatches[3]}"><span></span><span></span><span></span><span></span></div><strong>${t.name}</strong><p class="muted">${state.theme===key?"Currently selected":"Tap to apply"}</p>`;
   button.addEventListener("click",()=>{
     state.theme=key;
     applyTheme();
     save();
     renderSettings();
     say(t.name+" theme selected.");
   });
   grid.appendChild(button);
 });
}

const furniture={
 bed:{name:"Cozy Bed",cost:35,placed:"bedPlaced",action:"Nibbles sleeps"},
 sofa:{name:"Tiny Sofa",cost:45,placed:"sofaPlaced",action:"Nibbles relaxes"},
 desk:{name:"Study Desk",cost:50,placed:"deskPlaced",action:"Nibbles studies"},
 plant:{name:"Berry Plant",cost:40,placed:"plantPlaced",action:"Nibbles smells it"},
 aquarium:{name:"Mini Aquarium",cost:75,placed:"aquariumPlaced",action:"Nibbles watches fish"},
 tunnel:{name:"Play Tunnel",cost:55,placed:"tunnelPlaced",action:"Nibbles crawls through"},
 toybox:{name:"Toy Box",cost:60,placed:"toyboxPlaced",action:"Nibbles plays"},
 bookshelf:{name:"Book Shelf",cost:70,placed:"bookshelfPlaced",action:"Nibbles reads"},
 lamp:{name:"Moon Lamp",cost:65,placed:"lampPlaced",action:"Soft glowing light"},
 rug:{name:"Cloud Rug",cost:80,placed:"rugPlaced",action:"Nibbles takes a cozy nap"},
 wheel:{name:"Deluxe Running Wheel",cost:95,placed:"wheelPlaced",action:"Fast wheel-running animation"},
 snack:{name:"Snack Table",cost:85,placed:"snackPlaced",action:"Nibbles enjoys a snack"},
 music:{name:"Music Player",cost:110,placed:"musicPlaced",action:"Nibbles dances to music"},
 castle:{name:"Hamster Castle",cost:150,placed:"castlePlaced",action:"Nibbles explores the castle"}
};
let tickleCount=0,tickleReset=0,running=false,timer=null,remaining=20,total=20,paused=false,focusActive=false,focusFailedByLeaving=false;
function save(){localStorage.setItem("hammyV8",JSON.stringify(state))}
function say(text){$("status").textContent=text;$("roomMessage").textContent=text}
function safeSkin(){if(!skins[state.skin]||(skins[state.skin].premium&&!state.premium))state.skin="white"}
function getLootLevel(){return Math.min(20,1+Math.floor(state.totalFocusMinutes/120))}
function nextCostume(){return Object.values(clothes).filter(c=>c.days>state.practiceDays).sort((a,b)=>a.days-b.days)[0]||null}
function isCostumeUnlocked(c){return c.days===0||state.practiceDays>=c.days||state.clothes.includes(Object.keys(clothes).find(k=>clothes[k]===c))}
function update(){
 applyTheme();safeSkin();const s=skins[state.skin];const h=$("hamster");
 h.style.setProperty("--fur",s.fur);h.style.setProperty("--fur2",s.fur2);h.style.setProperty("--patch",s.patch);
 $("coins").textContent=state.coins;$("streak").textContent=state.streak;$("practiceDays").textContent=state.practiceDays;$("lootLevel").textContent=getLootLevel();
 $("focusLootLevel").textContent=getLootLevel();$("totalFocusText").textContent=Math.floor(state.totalFocusMinutes)+" min";
 const next=nextCostume();$("nextCostumeText").textContent=next?(next.days-state.practiceDays)+" more day"+((next.days-state.practiceDays)===1?"":"s"):"All unlocked";
 $("happyText").textContent=state.happy+"%";$("hungerText").textContent=state.hunger+"%";$("energyText").textContent=state.energy+"%";
 $("happyBar").style.width=state.happy+"%";$("hungerBar").style.width=state.hunger+"%";$("energyBar").style.width=state.energy+"%";
 Object.entries(furniture).forEach(([k,f])=>$(f.placed).classList.toggle("hidden",!state.placedFurniture[k]));
 document.querySelectorAll(".clothing").forEach(e=>{e.classList.remove("on");e.style.removeProperty("--cloth")});
 if(state.equipped&&clothes[state.equipped]){const c=clothes[state.equipped],el=$(c.type);if(el){el.classList.add("on");el.style.setProperty("--cloth",c.color)}}
 save();
}
function bubble(text,ms=1400){$("speech").textContent=text;$("speech").classList.remove("hidden");setTimeout(()=>$("speech").classList.add("hidden"),ms)}
function particles(){
 for(let i=0;i<9;i++){const p=document.createElement("span");p.className="particle";p.style.left=(43+Math.random()*16)+"%";p.style.top=(46+Math.random()*12)+"%";p.style.setProperty("--dx",(Math.random()*180-90)+"px");p.style.setProperty("--dy",(-80-Math.random()*120)+"px");$("room").appendChild(p);setTimeout(()=>p.remove(),1100)}
}
function tickle(){
 clearFurnitureAction();
 const now=Date.now();if(now-tickleReset>9000){tickleCount=0;tickleReset=now}
 if(tickleCount>=5){bubble("Hehe! I need a little break!",1800);say("Nibbles needs a short break.");return}
 tickleCount++;state.happy=Math.min(100,state.happy+6);state.energy=Math.max(0,state.energy-1);update();
 const h=$("hamster");h.classList.remove("tickle");void h.offsetWidth;h.classList.add("tickle");
 bubble("Hehehe! That tickles!",1500);say("Nibbles laughs, wiggles, and kicks!");particles();
 setTimeout(()=>{h.classList.remove("tickle");bubble("That was fun!",700)},1750);
}
function startRun(){clearFurnitureAction();if(running)return;running=true;$("hamster").classList.remove("tickle");$("hamster").classList.add("running");$("treadmill").classList.remove("off");$("runBtn").disabled=true;$("stopBtn").disabled=false;state.happy=Math.min(100,state.happy+5);state.energy=Math.max(0,state.energy-5);say("Nibbles is running!");update()}
function stopRun(){running=false;$("hamster").classList.remove("running");$("treadmill").classList.add("off");$("runBtn").disabled=false;$("stopBtn").disabled=true;say("Nibbles finished running.")}
function hamsterPreview(key){const s=skins[key];return `<div class="skin-preview"><div class="hamster" style="position:relative;left:50%;bottom:auto;top:0;--fur:${s.fur};--fur2:${s.fur2};--patch:${s.patch};pointer-events:none"><span class="tail"></span><span class="ear l"></span><span class="ear r"></span><span class="body"></span><span class="belly"></span><span class="head"></span><span class="patch"></span><span class="muzzle"></span><span class="eye l"></span><span class="eye r"></span><span class="cheek l"></span><span class="cheek r"></span><span class="nose"></span><span class="mouth"></span><span class="paw l"></span><span class="paw r"></span><span class="leg l"></span><span class="leg r"></span><span class="foot l"></span><span class="foot r"></span></div></div>`}
function renderSkins(){
 $("skinGrid").innerHTML="";
 Object.entries(skins).forEach(([key,s])=>{
  const locked=s.premium&&!state.premium;
  const card=document.createElement("div");card.className="skin"+(state.skin===key?" selected":"");
  card.innerHTML=`<span class="badge left ${s.premium?"premium":""}">${s.premium?"PREMIUM":"FREE"}</span><span class="badge right">${locked?"LOCKED":state.skin===key?"USING":"CHOOSE"}</span>${hamsterPreview(key)}<strong>${s.name}</strong><p class="muted">${locked?"Unlock Premium first":"Tap the button to use"}</p>`;
  const b=document.createElement("button");b.className=locked?"secondary":"primary";b.style.marginTop="8px";b.textContent=locked?"Locked":state.skin===key?"Selected":"Use";b.disabled=locked||state.skin===key;
  b.addEventListener("click",()=>{state.skin=key;update();renderSkins();say(s.name+" selected.")});
  card.appendChild(b);$("skinGrid").appendChild(card);
 });
}

function furniturePreview(key){
 const f=furniture[key];
 if(key==="bed")return '<div class="bed2d" style="position:absolute;left:12px;bottom:5px"><div class="frame"></div><div class="pillow"></div></div>';
 if(key==="sofa")return '<div class="sofa2d" style="position:absolute;left:8px;bottom:5px"><div class="back"></div><div class="seat"></div></div>';
 if(key==="desk")return '<div class="desk2d" style="position:absolute;left:12px;top:3px"><div class="book"></div><div class="top"></div><div class="leg l"></div><div class="leg r"></div></div>';
 if(key==="plant")return '<div class="plant2d" style="position:absolute;left:50%;bottom:2px;transform:translateX(-50%)"><div class="leaf a"></div><div class="leaf b"></div><div class="leaf c"></div><div class="pot"></div></div>';
 if(key==="aquarium")return '<div class="aquarium2d" style="position:absolute;left:50%;top:14px;transform:translateX(-50%)"><div class="water"></div><div class="fish"></div></div>';
 if(key==="tunnel")return '<div class="tunnel2d" style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%)"></div>';
 if(key==="lamp")return '<div class="lamp2d" style="position:absolute;left:50%;bottom:0;transform:translateX(-50%)"><div class="shade"></div><div class="stem"></div><div class="base"></div><div class="glow"></div></div>';
 if(key==="rug")return '<div class="rug2d" style="position:absolute;left:50%;bottom:8px;transform:translateX(-50%) scale(.72)"><div class="pattern"></div></div>';
 if(key==="wheel")return '<div class="wheel2d" style="position:absolute;left:50%;top:0;transform:translateX(-50%) scale(.7)"><div class="ring"></div><div class="hub"></div><div class="stand"></div></div>';
 if(key==="snack")return '<div class="snack2d" style="position:absolute;left:50%;top:7px;transform:translateX(-50%)"><div class="top"></div><div class="leg l"></div><div class="leg r"></div><div class="bowl"></div></div>';
 if(key==="music")return '<div class="music2d" style="position:absolute;left:50%;top:14px;transform:translateX(-50%)"><div class="speaker l"></div><div class="speaker r"></div></div>';
 if(key==="castle")return '<div class="castle2d" style="position:absolute;left:50%;top:2px;transform:translateX(-50%) scale(.7)"><div class="tower l"></div><div class="tower r"></div><div class="door"></div><div class="flag"></div></div>';
 if(key==="toybox")return '<div class="toybox2d" style="position:absolute;left:50%;bottom:9px;transform:translateX(-50%)"><div class="lid"></div><div class="box"></div><div class="ball"></div></div>';
 return '<div class="bookshelf2d" style="position:absolute;left:50%;top:2px;transform:translateX(-50%)"><div class="shelf"><span class="book b"></span></div><div class="shelf"><span class="book c"></span></div><div class="shelf"><span class="book"></span></div></div>';
}
function renderFurniture(){
 const grid=$("furnitureGrid");grid.innerHTML="";
 Object.entries(furniture).forEach(([key,f])=>{
   const owned=state.ownedFurniture[key],placed=state.placedFurniture[key];
   const card=document.createElement("div");card.className="furniture-card";
   card.innerHTML=`<div class="furniture-preview">${furniturePreview(key)}</div><strong>${f.name}</strong><p class="muted">${f.action}</p><p>${owned?(placed?"Placed in house":"In storage"):f.cost+" coins"}</p>`;
   const b=document.createElement("button");b.className=owned?"secondary":"primary";b.textContent=!owned?"Buy":placed?"Store":"Place";
   b.addEventListener("click",()=>{
     if(!owned){
       if(state.coins<f.cost){say("You need more focus coins.");return}
       state.coins-=f.cost;state.ownedFurniture[key]=true;state.placedFurniture[key]=true;say(f.name+" bought and placed.");
     }else{
       state.placedFurniture[key]=!state.placedFurniture[key];say(f.name+(state.placedFurniture[key]?" placed.":" stored."));
     }
     update();renderFurniture();
   });
   card.appendChild(b);grid.appendChild(card);
 });
}
let furnitureActionTimer=null;
const furnitureActionClasses=[
 "furn-bed","furn-sofa","furn-desk","furn-plant","furn-aquarium","furn-tunnel",
 "furn-toybox","furn-bookshelf","furn-lamp","furn-rug","furn-wheel","furn-snack",
 "furn-music","furn-castle"
];
function clearFurnitureAction(){
 const h=$("hamster");
 h.classList.remove(
  "sleeping","sitting","reading","playing","walking","smelling","watching",
  "celebrating","eating","wheelrun","peeking","napping","dancing",
  ...furnitureActionClasses
 );
 $("zzz").classList.add("hidden");
 h.style.removeProperty("left");
 h.style.removeProperty("bottom");
 Object.values(furniture).forEach(f=>{
   const el=$(f.placed);
   if(el)el.classList.remove("action-on","on","active","playing");
 });
}
function useFurniture(key){
 if(!state.placedFurniture[key]||!furniture[key])return;
 clearTimeout(furnitureActionTimer);
 clearFurnitureAction();

 const h=$("hamster");
 const placed=$(furniture[key].placed);
 h.classList.add("furn-"+key);
 if(placed)placed.classList.add("action-on");

 const messages={
  bed:"Nibbles climbs into the bed and curls up.",
  sofa:"Nibbles hops onto the sofa and relaxes.",
  desk:"Nibbles sits at the desk and writes carefully.",
  plant:"Nibbles walks beside the plant and sniffs the leaves.",
  aquarium:"Nibbles stands beside the aquarium and follows the fish.",
  tunnel:"Nibbles crawls all the way through the tunnel!",
  toybox:"Nibbles jumps into the toy box and plays.",
  bookshelf:"Nibbles sits beside the shelf and reads.",
  lamp:"Nibbles sits under the moon lamp for cozy reading.",
  rug:"Nibbles lies directly on the cloud rug for a nap.",
  wheel:"Nibbles climbs inside the deluxe wheel and runs!",
  snack:"Nibbles sits at the snack table and eats.",
  music:"Nibbles dances in front of the music player!",
  castle:"Nibbles goes inside the castle and peeks through the doorway!"
 };

 if(key==="bed"||key==="rug")$("zzz").classList.remove("hidden");
 if(key==="lamp"&&placed)placed.classList.add("on");
 if(key==="wheel"&&placed)placed.classList.add("active");
 if(key==="music"&&placed)placed.classList.add("playing");
 if(key==="snack"){
   state.hunger=Math.max(0,state.hunger-5);
   update();
 }
 say(messages[key]);
 bubble(messages[key],2200);

 const duration=key==="tunnel"?2400:key==="music"?3300:key==="castle"?3900:3800;
 furnitureActionTimer=setTimeout(clearFurnitureAction,duration);
}
function outfitMarkup(c){
 if(c.type==="shirt")return `<span class="clothing shirt on" style="--cloth:${c.color}"><span class="collar"></span></span>`;
 if(c.type==="hoodie")return `<span class="clothing hoodie on" style="--cloth:${c.color}"><span class="sleeve-left"></span><span class="sleeve-right"></span><span class="string-left"></span><span class="string-right"></span><span class="collar"></span></span>`;
 if(c.type==="pajamas")return `<span class="clothing pajamas on" style="--cloth:${c.color}"><span class="collar"></span><span class="button b1"></span><span class="button b2"></span><span class="button b3"></span></span>`;
 if(c.type==="jacket")return `<span class="clothing jacket on" style="--cloth:${c.color}"><span class="zipper"></span></span>`;
 if(c.type==="overalls")return `<span class="clothing overalls on" style="--cloth:${c.color}"><span class="pocket"></span></span>`;
 if(c.type==="apron")return `<span class="clothing apron on" style="--cloth:${c.color}"><span class="pocket"></span></span>`;
 return `<span class="clothing ${c.type} on" style="--cloth:${c.color}"></span>`;
}
function clothingPreview(c){
 const s=skins[state.skin]||skins.white;
 const locked=c.days>state.practiceDays&&!state.clothes.includes(Object.keys(clothes).find(k=>clothes[k]===c));
 return `<div class="clothing-card-preview ${locked?"costume-locked":""}">
   <div class="hamster" style="--fur:${s.fur};--fur2:${s.fur2};--patch:${s.patch}">
    <span class="tail"></span><span class="ear l"></span><span class="ear r"></span>
    <span class="body"></span><span class="belly"></span><span class="head"></span>
    <span class="patch"></span><span class="muzzle"></span><span class="eye l"></span>
    <span class="eye r"></span><span class="cheek l"></span><span class="cheek r"></span>
    <span class="nose"></span><span class="mouth"></span><span class="paw l"></span>
    <span class="paw r"></span><span class="leg l"></span><span class="leg r"></span>
    <span class="foot l"></span><span class="foot r"></span>
    <span class="clothes">${outfitMarkup(c)}</span>
   </div>
  </div>`;
}
function renderClothing(){
 $("clothingGrid").innerHTML="";
 const none=document.createElement("div");none.className="card";none.innerHTML="<strong>No Clothing</strong><p class='muted'>Remove the current outfit.</p>";
 const nb=document.createElement("button");nb.className="secondary";nb.textContent=state.equipped?"Unequip":"Unequipped";nb.disabled=!state.equipped;nb.addEventListener("click",()=>{state.equipped=null;update();renderClothing();say("Clothing removed.")});none.appendChild(nb);$("clothingGrid").appendChild(none);
 Object.entries(clothes).sort((a,b)=>a[1].days-b[1].days).forEach(([key,c])=>{
   const unlocked=c.days===0||state.practiceDays>=c.days||state.clothes.includes(key);
   const card=document.createElement("div");card.className="card";
   const remain=Math.max(0,c.days-state.practiceDays),progress=c.days?Math.min(100,state.practiceDays/c.days*100):100;
   card.innerHTML=`${clothingPreview(c)}<div class="row"><strong>${c.name}</strong><span class="costume-milestone">${c.days===0?"STARTER":c.days+" DAYS"}</span></div><p class="muted">${unlocked?"Unlocked and fitted to Nibbles":remain+" more practice day"+(remain===1?"":"s")}</p>${c.days?`<div class="costume-progress"><div style="width:${progress}%"></div></div>`:""}`;
   const controls=document.createElement("div");controls.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px";
   const wear=document.createElement("button");wear.className="primary";wear.textContent=state.equipped===key?"Wearing":unlocked?"Wear":"Locked";wear.disabled=!unlocked||state.equipped===key;wear.addEventListener("click",()=>{state.equipped=key;if(!state.clothes.includes(key))state.clothes.push(key);update();renderClothing();say(c.name+" equipped.")});
   const remove=document.createElement("button");remove.className="secondary";remove.textContent="Unequip";remove.disabled=state.equipped!==key;remove.addEventListener("click",()=>{state.equipped=null;update();renderClothing();say(c.name+" removed.")});
   controls.append(wear,remove);card.appendChild(controls);$("clothingGrid").appendChild(card);
 });
}
function renderFruit(){
 $("fruitGrid").innerHTML="";
 Object.entries(fruits).forEach(([key,f])=>{const card=document.createElement("div");card.className="card row";card.innerHTML=`<div class="row"><div class="fruit-dot" style="--fruit:${f.color}"></div><div><strong>${f.name}</strong><p class="muted">Owned: ${state.foods[key]}</p></div></div>`;const b=document.createElement("button");b.className="secondary";b.textContent="Feed";b.disabled=state.foods[key]<=0;b.addEventListener("click",()=>{state.foods[key]--;state.hunger=Math.max(0,state.hunger-15);state.happy=Math.min(100,state.happy+5);update();renderFruit();say("Nibbles ate "+f.name+".")});card.appendChild(b);$("fruitGrid").appendChild(card)})
}
function fmt(n){return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function timerView(){$("timerText").textContent=fmt(remaining)}
function selectedTaskName(){
 const value=$("task").value;
 if(value==="custom"){
   const custom=$("customTaskInput").value.trim();
   return custom||"Custom task";
 }
 return value;
}
function startFocus(){
 if(timer||focusActive)return;
 total=Number($("duration").value);
 remaining=total;
 paused=false;
 focusActive=true;
 focusFailedByLeaving=false;
 localStorage.removeItem("hammyFocusFailed");
 $("focusFailed").classList.add("hidden");
 $("reward").classList.add("hidden");
 $("startBtn").disabled=true;
 $("pauseBtn").disabled=false;
 $("pauseBtn").textContent="Pause";
 $("cancelBtn").disabled=false;
 $("timerTask").textContent=selectedTaskName();
 timer=setInterval(()=>{if(paused)return;remaining--;timerView();if(remaining<=0)completeFocus()},1000);
}
function pauseFocus(){paused=!paused;$("pauseBtn").textContent=paused?"Resume":"Pause"}
function cancelFocus(){
 clearInterval(timer);
 timer=null;
 focusActive=false;
 focusFailedByLeaving=false;
 paused=false;
 remaining=Number($("duration").value);
 timerView();
 $("timerTask").textContent="Ready";
 $("startBtn").disabled=false;
 $("pauseBtn").disabled=true;
 $("pauseBtn").textContent="Pause";
 $("cancelBtn").disabled=true;
}
function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function yesterdayKey(){const d=new Date();d.setDate(d.getDate()-1);return dateKey(d)}
function updatePracticeDay(){const today=dateKey();let newDay=false;if(state.lastPracticeDate!==today){newDay=true;state.practiceDays++;state.streak=state.lastPracticeDate===yesterdayKey()?state.streak+1:1;state.lastPracticeDate=today}return newDay}
function chooseLoot(minutes){
 const level=getLootLevel();const score=minutes+level*2+Math.random()*22;
 if(score>=100)return {name:"Legendary",key:"legendary",coins:80,fruit:5};
 if(score>=65)return {name:"Epic",key:"epic",coins:55,fruit:4};
 if(score>=40)return {name:"Rare",key:"rare",coins:38,fruit:3};
 if(score>=22)return {name:"Uncommon",key:"uncommon",coins:25,fruit:2};
 return {name:"Common",key:"common",coins:15,fruit:1};
}
function completeFocus(){
 if(!focusActive||focusFailedByLeaving)return;
 clearInterval(timer);timer=null;focusActive=false;const minutes=Math.max(1,total/60),oldDays=state.practiceDays,newDay=updatePracticeDay();state.totalFocusMinutes+=minutes;state.sessionCount++;
 const loot=chooseLoot(minutes),durationBonus=Math.floor(minutes*2),levelBonus=getLootLevel()*2,coins=loot.coins+durationBonus+levelBonus;state.coins+=coins;
 const fruitKeys=Object.keys(fruits),drops=[];for(let i=0;i<loot.fruit;i++){const key=fruitKeys[Math.floor(Math.random()*fruitKeys.length)];state.foods[key]++;drops.push(fruits[key].name)}
 const newlyUnlocked=Object.entries(clothes).filter(([k,c])=>c.days>oldDays&&c.days<=state.practiceDays).map(([k,c])=>{if(!state.clothes.includes(k))state.clothes.push(k);return c.name});
 state.happy=Math.min(100,state.happy+Math.min(15,4+Math.floor(minutes/10)));update();renderFruit();renderClothing();renderFurniture();
 const h=$("hamster");h.classList.remove("celebrating");void h.offsetWidth;h.classList.add("celebrating");setTimeout(()=>h.classList.remove("celebrating"),2500);
 $("reward").className=`card loot-card ${loot.key}`;$("reward").classList.remove("hidden");
 $("reward").innerHTML=`<span class="loot-name">${loot.name} loot</span><span class="loot-spark a"></span><span class="loot-spark b"></span><span class="loot-spark c"></span><h3 style="margin-top:10px">Focus complete!</h3><p><strong>${coins} coins</strong> and ${loot.fruit} fruit drop${loot.fruit===1?"":"s"}: ${drops.join(", ")}.</p><p class="muted">Longer sessions and Loot Level ${getLootLevel()} improve rarity.${newDay?" Today counted as a new practice day.":" You already earned today's practice day."}</p>${newlyUnlocked.length?`<p><strong>New costume unlocked:</strong> ${newlyUnlocked.join(", ")}</p>`:""}`;
 $("startBtn").disabled=false;$("pauseBtn").disabled=true;$("cancelBtn").disabled=true;say(loot.name+" loot earned!");
}
function failFocusForLeaving(){
 if(!focusActive||focusFailedByLeaving)return;
 focusFailedByLeaving=true;
 focusActive=false;
 clearInterval(timer);
 timer=null;
 paused=false;
 remaining=Number($("duration").value);
 timerView();
 $("timerTask").textContent="Session failed";
 $("startBtn").disabled=false;
 $("pauseBtn").disabled=true;
 $("pauseBtn").textContent="Pause";
 $("cancelBtn").disabled=true;
 $("reward").classList.add("hidden");
 $("focusFailed").classList.remove("hidden");
 localStorage.setItem("hammyFocusFailed","1");
 say("Focus failed because the game was left. No rewards were given.");
}
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="hidden")failFocusForLeaving();
});
window.addEventListener("pagehide",failFocusForLeaving);
window.addEventListener("beforeunload",()=>{
 if(focusActive)localStorage.setItem("hammyFocusFailed","1");
});

document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));b.classList.add("active");$(b.dataset.page+"Page").classList.remove("hidden")}));
$("hamster").addEventListener("click",tickle);$("tickleBtn").addEventListener("click",tickle);$("runBtn").addEventListener("click",startRun);$("stopBtn").addEventListener("click",stopRun);
document.querySelectorAll("[data-furniture-use]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();useFurniture(b.dataset.furnitureUse)}));
$("premiumBtn").addEventListener("click",()=>{state.premium=true;state.skin="white";$("premiumBtn").textContent="Premium unlocked";$("premiumBtn").disabled=true;update();renderSkins();say("Premium demo unlocked. Choose any hamster.")});

$("task").addEventListener("change",()=>{
 $("customTaskRow").classList.toggle("hidden",$("task").value!=="custom");
});
$("useCustomTask").addEventListener("click",()=>{
 const value=$("customTaskInput").value.trim();
 if(value){
   $("timerTask").textContent=value;
   say("Custom task selected: "+value);
 }
});

$("startBtn").addEventListener("click",startFocus);$("pauseBtn").addEventListener("click",pauseFocus);$("cancelBtn").addEventListener("click",cancelFocus);$("duration").addEventListener("change",()=>{if(!timer){remaining=Number($("duration").value);timerView()}});
safeSkin();applyTheme();
if(localStorage.getItem("hammyFocusFailed")==="1"){
 $("focusFailed").classList.remove("hidden");
 $("timerTask").textContent="Previous session failed";
 localStorage.removeItem("hammyFocusFailed");
}
update();renderSkins();renderClothing();renderFruit();renderFurniture();renderSettings();timerView();if(state.premium){$("premiumBtn").textContent="Premium unlocked";$("premiumBtn").disabled=true}

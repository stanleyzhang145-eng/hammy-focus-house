
"use strict";
(() => {
  const premiumVersion = 14;
  const deepDefaults = {
    premiumRoom:"bedroom", premiumWeather:"stars", premiumNight:false, roomColors:{},
    premiumWallpaper:"default", premiumFloor:"default", activePremiumFurniture:"giantWheel",
    premiumDecor:{}, premiumLayouts:{1:null,2:null,3:null}, selectedDecor:null,
    customSkin:{fur:"#b884d8",fur2:"#f0d7ff",patch:"#8050a0",eye:"#211526",ear:"#efacb3",cheek:"#ef9aa8"},
    personality:"playful", companion:"none", unlockedCompanions:["bird","turtle"], eggs:0,
    tickets:0, premiumLuck:0, shinyFruit:0, badges:[], rareDecorations:[],
    taskPresets:["Read 20 pages","Finish homework","Practice music"],
    focusHistory:[], dailyGoal:30, weeklyGoal:180, reminder:"You can do this — Nibbles is focusing with you!",
    timerStyle:"digital", soundscape:"off", challenge:null, completionEffect:"stars", backgroundEffect:"sparkles",
    appIcon:"classic", premiumProductId:"hammy_premium_lifetime", premiumPriceLabel:"$4.99", premiumFurnitureColors:{}, premiumFurnitureOwned:[],
    premiumFurnitureStorage:[], premiumInitializedRooms:[], decorSequence:0,
    premiumStarterTicketsGranted:false, miniGameBest:{}, miniGameRuns:{}, premiumDemoEntitlement:false
  };
  Object.entries(deepDefaults).forEach(([k,v])=>{
    if(state[k]===undefined||state[k]===null) state[k]=structuredClone(v);
  });
  state.customSkin={...deepDefaults.customSkin,...(state.customSkin||{})};
  state.premiumLayouts={...deepDefaults.premiumLayouts,...(state.premiumLayouts||{})};
  state.premiumFurnitureColors={...(state.premiumFurnitureColors||{})};
  state.roomColors={...(state.roomColors||{})};
  if(!Array.isArray(state.focusHistory))state.focusHistory=[];
  if(!Array.isArray(state.taskPresets))state.taskPresets=[];
  if(!Array.isArray(state.badges))state.badges=[];
  if(!Array.isArray(state.rareDecorations))state.rareDecorations=[];
  if(!Array.isArray(state.unlockedCompanions))state.unlockedCompanions=["bird","turtle"];
  if(!Array.isArray(state.premiumFurnitureOwned))state.premiumFurnitureOwned=[];
  if(!Array.isArray(state.premiumFurnitureStorage))state.premiumFurnitureStorage=[];
  if(!Array.isArray(state.premiumInitializedRooms))state.premiumInitializedRooms=[];
  if(!state.miniGameRuns||typeof state.miniGameRuns!=="object")state.miniGameRuns={};
  state.decorSequence=Number(state.decorSequence)||0;
  state.premiumStarterTicketsGranted=Boolean(state.premiumStarterTicketsGranted);
  state.appIcon=state.appIcon||"classic";
  state.premiumProductId=state.premiumProductId||"hammy_premium_lifetime";
  state.premiumPriceLabel=state.premiumPriceLabel||"$4.99";

  Object.assign(skins,{
    galaxy:{name:"Galaxy Hamster",fur:"#554086",fur2:"#cbbaf5",patch:"#273d76",premium:true,effect:"galaxy"},
    rainbow:{name:"Rainbow Hamster",fur:"#ff91a9",fur2:"#fff1d2",patch:"#75c7ed",premium:true,effect:"rainbow"},
    frost:{name:"Frost Hamster",fur:"#d8f4ff",fur2:"#f8fdff",patch:"#9dd3e8",premium:true,effect:"frost"},
    sakura:{name:"Sakura Hamster",fur:"#f4c2d2",fur2:"#fff0f5",patch:"#e891ad",premium:true,effect:"sakura"},
    golden:{name:"Golden Hamster",fur:"#f1c95a",fur2:"#fff0a8",patch:"#d8a43d",premium:true,effect:"golden"},
    ghost:{name:"Ghost Hamster",fur:"#d9f5ff",fur2:"#f7fdff",patch:"#b8e0ed",premium:true,effect:"ghost"},
    robot:{name:"Robot Hamster",fur:"#aeb8c5",fur2:"#dce2e8",patch:"#687483",premium:true,effect:"robot"},
    dragon:{name:"Dragon Hamster",fur:"#73b980",fur2:"#c9edc8",patch:"#4e9163",premium:true,effect:"dragon"},
    axolotl:{name:"Axolotl Hamster",fur:"#f4a8bd",fur2:"#ffe5ec",patch:"#d87d9b",premium:true,effect:"axolotl"},
    custom:{name:"Custom Hamster",fur:state.customSkin.fur,fur2:state.customSkin.fur2,patch:state.customSkin.patch,premium:true,effect:"custom"}
  });

  Object.assign(clothes,{
    premiumHeadband:{name:"Premium Headband",type:"headband",color:"#e66f9d",days:3,premiumOnly:true},
    premiumGalaxyHoodie:{name:"Galaxy Hoodie",type:"hoodie",color:"#4d438f",days:7,premiumOnly:true},
    premiumRoyalPajamas:{name:"Royal Pajamas",type:"pajamas",color:"#8d4c9e",days:15,premiumOnly:true},
    crystalExplorer:{name:"Crystal Explorer Outfit",type:"jacket",color:"#56a6c7",days:30,premiumOnly:true},
    spaceSuit:{name:"Space Suit",type:"jacket",color:"#d6dde8",days:45,premiumOnly:true},
    wizardRobe:{name:"Wizard Robe",type:"cape",color:"#674c9b",days:60,premiumOnly:true},
    goldenChampion:{name:"Golden Champion Outfit",type:"jacket",color:"#d8aa3f",days:90,premiumOnly:true},
    dragonCostume:{name:"Legendary Dragon Costume",type:"hoodie",color:"#5a9e6d",days:100,premiumOnly:true},
    celestialOutfit:{name:"Celestial Outfit",type:"pajamas",color:"#364d92",days:180,premiumOnly:true},
    ultimateFocusMaster:{name:"Ultimate Focus Master Costume",type:"jacket",color:"#c45167",days:365,premiumOnly:true}
  });

  Object.assign(themes,{
    galaxy:{name:"Galaxy",swatches:["#15172f","#8d75ec","#32355f","#5b4770"],premium:true},
    cherry:{name:"Cherry Blossom",swatches:["#fff0f5","#e2769b","#f8dce7","#d9ac91"],premium:true},
    underwater:{name:"Underwater",swatches:["#e1f7f8","#3da7b8","#aee4e7","#5fa9aa"],premium:true},
    forest:{name:"Enchanted Forest",swatches:["#edf6e6","#6b9e62","#cce3bd","#8d7552"],premium:true},
    winter:{name:"Cozy Winter",swatches:["#edf8ff","#73a9cf","#e0f1fb","#b6d1df"],premium:true},
    candy:{name:"Candy House",swatches:["#fff0fb","#d777c2","#f4d7ef","#e7b5c6"],premium:true},
    haunted:{name:"Haunted House",swatches:["#1c1825","#8d66a8","#41354c","#594657"],premium:true},
    cloud:{name:"Cloud Kingdom",swatches:["#eff8ff","#74aee0","#dceefa","#d8c29c"],premium:true},
    dino:{name:"Dinosaur Jungle",swatches:["#eff4df","#7c9b49","#d8e4b8","#9b7a4e"],premium:true},
    future:{name:"Futuristic City",swatches:["#131d2d","#33d5cd","#24405a","#263249"],premium:true},
    pirate:{name:"Pirate Ship",swatches:["#f3ead7","#b5763c","#e6d1aa","#9b6b42"],premium:true},
    royal:{name:"Royal Castle",swatches:["#f2ecfb","#8b62bd","#e1d2f1","#b58a66"],premium:true}
  });


  const premiumAppIcons={
    classic:{name:"Classic Lavender",bg1:"#8b63d9",bg2:"#d8c5ff",fur:"#ffffff",accent:"#ef9aa8",symbol:"heart"},
    galaxy:{name:"Galaxy Sparkle",bg1:"#25224f",bg2:"#7656bd",fur:"#d9c9ff",accent:"#fff1a6",symbol:"stars"},
    rainbow:{name:"Rainbow Joy",bg1:"#ff8fa8",bg2:"#75c7ee",fur:"#fff3da",accent:"#72c985",symbol:"rainbow"},
    frost:{name:"Frost Crystal",bg1:"#a9e4f6",bg2:"#e9fbff",fur:"#e8f9ff",accent:"#6db8dc",symbol:"snow"},
    sakura:{name:"Sakura Garden",bg1:"#f2a4bd",bg2:"#ffe8f0",fur:"#ffeef4",accent:"#d96891",symbol:"flower"},
    golden:{name:"Golden Focus",bg1:"#d69e30",bg2:"#ffe79a",fur:"#fff1ad",accent:"#8b5e1f",symbol:"crown"},
    robot:{name:"Robot Buddy",bg1:"#566273",bg2:"#bfc8d4",fur:"#aeb8c5",accent:"#62d7ef",symbol:"robot"},
    dragon:{name:"Dragon Nibbles",bg1:"#438257",bg2:"#b8e3ad",fur:"#7bc08b",accent:"#f0cc66",symbol:"wing"},
    ocean:{name:"Ocean Bubble",bg1:"#3c91bd",bg2:"#bdeafa",fur:"#f5fdff",accent:"#6ed0ca",symbol:"bubble"},
    night:{name:"Cozy Night",bg1:"#17182a",bg2:"#545887",fur:"#d9d5ef",accent:"#ffe38a",symbol:"moon"},
    candy:{name:"Candy House",bg1:"#e76fa3",bg2:"#ffd1e2",fur:"#fff5f8",accent:"#75c9d7",symbol:"candy"},
    legend:{name:"Focus Legend",bg1:"#7a3f93",bg2:"#e7b94d",fur:"#fff1c8",accent:"#ffffff",symbol:"trophy"}
  };

  function iconSymbolSvg(symbol){
    const symbols={
      heart:'<path d="M64 103C44 88 30 76 30 58c0-14 10-24 23-24 8 0 15 4 19 11 4-7 11-11 19-11 13 0 23 10 23 24 0 18-14 30-34 45l-8 6z" fill="var(--accent)" stroke="#493951" stroke-width="5"/>',
      stars:'<path d="M30 30l5 11 12 2-9 8 3 12-11-6-11 6 3-12-9-8 12-2zM101 25l3 7 8 1-6 6 2 8-7-4-7 4 2-8-6-6 8-1z" fill="var(--accent)"/>',
      rainbow:'<path d="M19 91a45 45 0 0 1 90 0" fill="none" stroke="#f36f8c" stroke-width="9"/><path d="M28 91a36 36 0 0 1 72 0" fill="none" stroke="#f4cb53" stroke-width="9"/><path d="M37 91a27 27 0 0 1 54 0" fill="none" stroke="#68bc86" stroke-width="9"/>',
      snow:'<path d="M64 17v94M23 41l82 46M23 87l82-46M54 28l10 10 10-10M54 100l10-10 10 10" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/>',
      flower:'<g fill="var(--accent)" stroke="#493951" stroke-width="3"><circle cx="64" cy="32" r="15"/><circle cx="88" cy="52" r="15"/><circle cx="79" cy="81" r="15"/><circle cx="49" cy="81" r="15"/><circle cx="40" cy="52" r="15"/><circle cx="64" cy="59" r="12" fill="#ffd66d"/></g>',
      crown:'<path d="M25 84l-7-47 28 20 18-32 18 32 28-20-7 47z" fill="var(--accent)" stroke="#493951" stroke-width="5"/><path d="M28 84h72v16H28z" fill="#fff0a0" stroke="#493951" stroke-width="5"/>',
      robot:'<rect x="29" y="32" width="70" height="61" rx="16" fill="var(--fur)" stroke="#29313b" stroke-width="6"/><circle cx="49" cy="59" r="8" fill="var(--accent)"/><circle cx="79" cy="59" r="8" fill="var(--accent)"/><path d="M49 78h30M64 32V19M58 19h12" stroke="#29313b" stroke-width="5" stroke-linecap="round"/>',
      wing:'<path d="M32 89C9 74 9 42 28 29c4 18 13 26 27 31-11 6-18 16-23 29zM96 89c23-15 23-47 4-60-4 18-13 26-27 31 11 6 18 16 23 29z" fill="var(--accent)" stroke="#2d5439" stroke-width="5"/>',
      bubble:'<g fill="none" stroke="var(--accent)" stroke-width="5"><circle cx="42" cy="61" r="22"/><circle cx="87" cy="38" r="13"/><circle cx="91" cy="83" r="18"/></g>',
      moon:'<path d="M89 95C56 101 32 78 36 48c3-21 18-35 36-40-12 16-11 36 2 49 12 12 30 15 45 8-5 14-15 25-30 30z" fill="var(--accent)" stroke="#111326" stroke-width="5"/>',
      candy:'<path d="M41 51l-22-14 7 25-7 25 22-14M87 51l22-14-7 25 7 25-22-14" fill="var(--accent)" stroke="#493951" stroke-width="5"/><rect x="40" y="39" width="48" height="47" rx="18" fill="#fff" stroke="#493951" stroke-width="5"/>',
      trophy:'<path d="M43 24h42v21c0 21-10 32-21 32S43 66 43 45zM43 31H25v10c0 15 8 23 22 23M85 31h18v10c0 15-8 23-22 23M64 77v16M45 103h38" fill="var(--accent)" stroke="#493951" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>'
    };
    return symbols[symbol]||symbols.heart;
  }

  function appIconSvg(key,size=192){
    const icon=premiumAppIcons[key]||premiumAppIcons.classic;
    const hamster=icon.symbol==="robot"?"":`
      <g transform="translate(0,14)">
        <circle cx="42" cy="51" r="20" fill="${icon.fur}" stroke="#493951" stroke-width="5"/>
        <circle cx="86" cy="51" r="20" fill="${icon.fur}" stroke="#493951" stroke-width="5"/>
        <ellipse cx="64" cy="76" rx="43" ry="39" fill="${icon.fur}" stroke="#493951" stroke-width="6"/>
        <circle cx="49" cy="70" r="6" fill="#211526"/><circle cx="79" cy="70" r="6" fill="#211526"/>
        <ellipse cx="64" cy="84" rx="7" ry="5" fill="${icon.accent}"/>
        <path d="M55 94q9 10 18 0" fill="none" stroke="#493951" stroke-width="4" stroke-linecap="round"/>
        <circle cx="38" cy="85" r="7" fill="${icon.accent}" opacity=".65"/><circle cx="90" cy="85" r="7" fill="${icon.accent}" opacity=".65"/>
      </g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" style="--accent:${icon.accent};--fur:${icon.fur}">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${icon.bg1}"/><stop offset="1" stop-color="${icon.bg2}"/></linearGradient></defs>
      <rect x="3" y="3" width="122" height="122" rx="29" fill="url(#bg)" stroke="#493951" stroke-width="6"/>
      ${hamster}${iconSymbolSvg(icon.symbol)}
    </svg>`;
  }
  function svgDataUri(svg){return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)}

  const premiumRooms={
    bedroom:"Bedroom",kitchen:"Kitchen",bathroom:"Bathroom",study:"Study Room",music:"Music Room",game:"Game Room",garden:"Garden",rooftop:"Rooftop",aquarium:"Aquarium Room",space:"Space Room",winter:"Winter Cabin",beach:"Beach House"
  };
  const personalities={
    playful:"Playful",sleepy:"Sleepy",adventurous:"Adventurous",studious:"Studious",musical:"Musical",hungry:"Hungry",shy:"Shy",energetic:"Energetic"
  };
  const companions={
    none:{name:"No companion",shape:"none"},bird:{name:"Tiny Bird",shape:"bird"},turtle:{name:"Turtle",shape:"turtle"},snail:{name:"Snail",shape:"snail"},butterfly:{name:"Butterfly",shape:"butterfly"},robot:{name:"Mini Robot",shape:"robot"},cloud:{name:"Cloud Creature",shape:"cloud"},babyDragon:{name:"Baby Dragon",shape:"dragon"},firefly:{name:"Firefly",shape:"firefly"},frog:{name:"Frog",shape:"frog"},star:{name:"Floating Star",shape:"star"}
  };
  const premiumFurniture={
    giantWheel:{name:"Giant Hamster Wheel",description:"A huge wheel with speed trails.",color:"#7b6bd6"},
    bunkBed:{name:"Bunk Bed",description:"Nibbles climbs the ladder and sleeps upstairs.",color:"#d07e9b"},
    gamingDesk:{name:"Gaming Desk",description:"Animated screens and button tapping.",color:"#4b8ec1"},
    pool:{name:"Indoor Swimming Pool",description:"A gentle swimming animation.",color:"#55b9d4"},
    bubbleBath:{name:"Bubble Bath",description:"Bubbles rise while Nibbles relaxes.",color:"#e7a9cf"},
    cinema:{name:"Mini Cinema",description:"Changing original geometric movies.",color:"#5f5a7b"},
    musicStage:{name:"Music Stage",description:"Nibbles performs under moving lights.",color:"#c46291"},
    capsuleBed:{name:"Space Capsule Bed",description:"A floating space-sleep animation.",color:"#8795ba"},
    treehouse:{name:"Treehouse",description:"Climb ladders and peek from the house.",color:"#8d6944"},
    aquariumTunnel:{name:"Aquarium Tunnel",description:"Walk through a glass fish tunnel.",color:"#4cb9ca"},
    kitchenSet:{name:"Mini Kitchen",description:"Mixing and cooking animation.",color:"#e79b6e"},
    trainSet:{name:"Train Set",description:"A train circles around Nibbles.",color:"#cc5757"},
    clawMachine:{name:"Claw Machine",description:"Win a random decoration after focus.",color:"#8e74cf"},
    playground:{name:"Indoor Playground",description:"Slide, swing, and bounce.",color:"#6fba72"},
    portal:{name:"Magical Portal",description:"Travel between premium rooms.",color:"#7f63d9"}
  };
  const miniGames={
    fruitCatch:{name:"Fruit Catch",desc:"Tap moving fruit before time runs out."},
    hamsterMaze:{name:"Hamster Maze",desc:"Move through the maze to the green goal."},
    memoryMatch:{name:"Memory Match",desc:"Match all six picture pairs."},
    rhythmDance:{name:"Rhythm Dance",desc:"Tap only while the beat pad glows."},
    wheelRacing:{name:"Wheel Racing",desc:"Tap quickly to reach the finish line."},
    gardenHarvest:{name:"Garden Harvest",desc:"Harvest ripe plants and avoid empty soil."},
    treasureDig:{name:"Treasure Digging",desc:"Choose dig spots and find treasure."},
    furnitureRepair:{name:"Furniture Repair",desc:"Repair the numbered parts in order."},
    cookingChallenge:{name:"Cooking Challenge",desc:"Tap ingredients in the shown order."},
    castleExplore:{name:"Castle Exploration",desc:"Choose doors and search for the treasure."}
  };

  // Each room receives this setup once. Resetting a room restores its own layout.
  const premiumRoomDefaults={
    bedroom:[
      {type:"bunkBed",x:24,y:54,scale:.82,rotation:-2,z:20},
      {type:"capsuleBed",x:73,y:52,scale:.68,rotation:2,z:20},
      {type:"cinema",x:51,y:29,scale:.58,rotation:0,z:12}
    ],
    kitchen:[
      {type:"kitchenSet",x:29,y:53,scale:.82,rotation:0,z:20},
      {type:"trainSet",x:68,y:73,scale:.66,rotation:-3,z:16},
      {type:"clawMachine",x:78,y:40,scale:.58,rotation:2,z:20}
    ],
    bathroom:[
      {type:"bubbleBath",x:31,y:58,scale:.84,rotation:0,z:20},
      {type:"pool",x:70,y:67,scale:.78,rotation:0,z:14}
    ],
    study:[
      {type:"gamingDesk",x:29,y:49,scale:.78,rotation:0,z:20},
      {type:"treehouse",x:75,y:47,scale:.62,rotation:1,z:18},
      {type:"cinema",x:52,y:25,scale:.48,rotation:0,z:10}
    ],
    music:[
      {type:"musicStage",x:50,y:57,scale:.92,rotation:0,z:18},
      {type:"cinema",x:78,y:31,scale:.48,rotation:1,z:12},
      {type:"clawMachine",x:20,y:45,scale:.52,rotation:-2,z:20}
    ],
    game:[
      {type:"gamingDesk",x:25,y:48,scale:.70,rotation:-1,z:20},
      {type:"clawMachine",x:73,y:45,scale:.68,rotation:1,z:20},
      {type:"playground",x:51,y:69,scale:.78,rotation:0,z:16}
    ],
    garden:[
      {type:"treehouse",x:26,y:48,scale:.84,rotation:-2,z:18},
      {type:"playground",x:69,y:65,scale:.76,rotation:1,z:17},
      {type:"trainSet",x:51,y:78,scale:.52,rotation:0,z:11}
    ],
    rooftop:[
      {type:"giantWheel",x:29,y:57,scale:.86,rotation:0,z:18},
      {type:"portal",x:73,y:50,scale:.70,rotation:0,z:20},
      {type:"musicStage",x:51,y:72,scale:.54,rotation:0,z:13}
    ],
    aquarium:[
      {type:"aquariumTunnel",x:50,y:58,scale:1.02,rotation:0,z:16},
      {type:"pool",x:24,y:72,scale:.58,rotation:0,z:12},
      {type:"bubbleBath",x:78,y:65,scale:.56,rotation:1,z:18}
    ],
    space:[
      {type:"capsuleBed",x:26,y:54,scale:.78,rotation:-1,z:20},
      {type:"portal",x:76,y:48,scale:.72,rotation:0,z:20},
      {type:"gamingDesk",x:51,y:66,scale:.60,rotation:0,z:15}
    ],
    winter:[
      {type:"bunkBed",x:26,y:55,scale:.80,rotation:-2,z:20},
      {type:"cinema",x:74,y:34,scale:.56,rotation:1,z:12},
      {type:"kitchenSet",x:70,y:69,scale:.60,rotation:1,z:18}
    ],
    beach:[
      {type:"pool",x:28,y:68,scale:.74,rotation:0,z:13},
      {type:"aquariumTunnel",x:70,y:55,scale:.74,rotation:0,z:17},
      {type:"musicStage",x:49,y:72,scale:.56,rotation:0,z:15}
    ]
  };

  function nextDecorId(type="decor"){
    state.decorSequence=(Number(state.decorSequence)||0)+1;
    return `v12-${type}-${Date.now().toString(36)}-${state.decorSequence}`;
  }
  function makeDecor(type,values={}){
    const base=premiumFurniture[type];
    return {
      id:values.id||nextDecorId(type),
      type,
      x:Number.isFinite(values.x)?values.x:50,
      y:Number.isFinite(values.y)?values.y:58,
      rotation:Number.isFinite(values.rotation)?values.rotation:0,
      scale:Number.isFinite(values.scale)?values.scale:1,
      color:values.color||state.premiumFurnitureColors[type]||base?.color||"#8b63d9",
      z:Number.isFinite(values.z)?values.z:20
    };
  }
  function normalizePremiumDecor(){
    if(!state.premiumDecor||typeof state.premiumDecor!=="object")state.premiumDecor={};
    Object.keys(premiumRooms).forEach(room=>{
      const source=state.premiumDecor[room];
      if(!source||typeof source!=="object"||Array.isArray(source)){state.premiumDecor[room]={};return}
      const normalized={};
      Object.entries(source).forEach(([oldId,d])=>{
        if(!d||typeof d!=="object")return;
        const type=d.type&&premiumFurniture[d.type]?d.type:(premiumFurniture[oldId]?oldId:null);
        if(!type)return;
        const id=d.id||((d.type&&oldId)?oldId:nextDecorId(type));
        normalized[id]=makeDecor(type,{...d,id});
      });
      state.premiumDecor[room]=normalized;
    });
    state.premiumFurnitureStorage=state.premiumFurnitureStorage
      .filter(d=>d&&premiumFurniture[d.type])
      .map(d=>makeDecor(d.type,d));
  }
  function defaultDecorForRoom(room){
    const result={};
    (premiumRoomDefaults[room]||[]).forEach((spec,index)=>{
      const item=makeDecor(spec.type,{...spec,id:`default-${room}-${index+1}`});
      result[item.id]=item;
    });
    return result;
  }
  function ensureDefaultRoomSetups(forceRoom=null){
    if(!premiumUnlocked()&&!forceRoom)return;
    normalizePremiumDecor();
    const rooms=forceRoom?[forceRoom]:Object.keys(premiumRooms);
    rooms.forEach(room=>{
      const already=state.premiumInitializedRooms.includes(room);
      if(forceRoom===room||!already){
        if(forceRoom===room||!Object.keys(state.premiumDecor[room]||{}).length){
          state.premiumDecor[room]=defaultDecorForRoom(room);
        }
        if(!state.premiumInitializedRooms.includes(room))state.premiumInitializedRooms.push(room);
      }
    });
  }


  function premiumUnlocked(){return Boolean(state.premium)}
  function entitlementLockHtml(){return premiumUnlocked()?"":'<div class="premium-lock">Premium preview required<br>Use “Demo unlock Premium” on the Hamsters page.</div>'}
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

  function hamsterCoreMarkup(id="premiumHamster"){
    return `<div id="${id}" class="hamster premium-skin" aria-hidden="true"><span class="tail"></span><span class="ear l"></span><span class="ear r"></span><span class="body"></span><span class="belly"></span><span class="head"></span><span class="patch"></span><span class="muzzle"></span><span class="eye l"></span><span class="eye r"></span><span class="cheek l"></span><span class="cheek r"></span><span class="nose"></span><span class="mouth"></span><span class="paw l"></span><span class="paw r"></span><span class="leg l"></span><span class="leg r"></span><span class="foot l"></span><span class="foot r"></span><span class="clothes" id="premiumCostumeLayer"></span></div>`;
  }

  function furnitureSvg(key,color){
    const c=color||premiumFurniture[key]?.color||"#8b63d9", line="#493951";
    const wrap=body=>`<svg viewBox="0 0 180 130" role="img" aria-label="${premiumFurniture[key]?.name||key}">${body}</svg>`;
    if(key==="giantWheel")return wrap(`<circle cx="92" cy="60" r="48" fill="none" stroke="${line}" stroke-width="10"/><circle cx="92" cy="60" r="34" fill="none" stroke="${c}" stroke-width="12" stroke-dasharray="8 7"/><circle cx="92" cy="60" r="7" fill="${line}"/><path d="M61 112h65M80 101l-19 11M104 101l22 11" stroke="${line}" stroke-width="8" stroke-linecap="round"/>`);
    if(key==="bunkBed")return wrap(`<rect x="25" y="18" width="125" height="38" rx="10" fill="${c}" stroke="${line}" stroke-width="6"/><rect x="25" y="77" width="125" height="38" rx="10" fill="${c}" stroke="${line}" stroke-width="6"/><path d="M29 11v110M146 11v110M151 42h18v79M151 60h18M151 78h18M151 96h18" stroke="${line}" stroke-width="7" stroke-linecap="round"/><ellipse cx="53" cy="36" rx="19" ry="10" fill="#fff" stroke="${line}" stroke-width="4"/>`);
    if(key==="gamingDesk")return wrap(`<rect x="16" y="79" width="148" height="16" rx="6" fill="${c}" stroke="${line}" stroke-width="6"/><path d="M34 94v30M146 94v30" stroke="${line}" stroke-width="8"/><rect x="31" y="17" width="54" height="48" rx="7" fill="#18233b" stroke="${line}" stroke-width="6"/><rect x="96" y="17" width="54" height="48" rx="7" fill="#18233b" stroke="${line}" stroke-width="6"/><path d="M42 43h31M107 37h31M108 48h20" stroke="#78ffe7" stroke-width="5"/><rect x="69" y="70" width="42" height="12" rx="5" fill="#ddd" stroke="${line}" stroke-width="4"/>`);
    if(key==="pool")return wrap(`<ellipse cx="90" cy="78" rx="76" ry="36" fill="${c}" stroke="${line}" stroke-width="7"/><ellipse cx="90" cy="71" rx="61" ry="24" fill="#8be0ef" stroke="${line}" stroke-width="4"/><path d="M29 58c18 10 33-10 50 0s33-10 51 0 28-8 38 0" fill="none" stroke="#fff" stroke-width="5"/>`);
    if(key==="bubbleBath")return wrap(`<path d="M25 60h130v35c0 18-12 27-27 27H52c-15 0-27-9-27-27z" fill="${c}" stroke="${line}" stroke-width="7"/><circle cx="48" cy="46" r="17" fill="#e9fbff" stroke="${line}" stroke-width="4"/><circle cx="75" cy="37" r="14" fill="#fff" stroke="${line}" stroke-width="4"/><circle cx="106" cy="43" r="19" fill="#e9fbff" stroke="${line}" stroke-width="4"/><circle cx="133" cy="36" r="13" fill="#fff" stroke="${line}" stroke-width="4"/>`);
    if(key==="cinema")return wrap(`<rect x="15" y="12" width="150" height="83" rx="8" fill="#1d2136" stroke="${line}" stroke-width="7"/><circle cx="55" cy="52" r="21" fill="${c}"/><path d="M96 30l44 23-44 23z" fill="#ffd66d"/><rect x="38" y="105" width="104" height="17" rx="7" fill="${c}" stroke="${line}" stroke-width="6"/>`);
    if(key==="musicStage")return wrap(`<path d="M18 99h144v24H18z" fill="${c}" stroke="${line}" stroke-width="7"/><path d="M36 94V30M144 94V30" stroke="${line}" stroke-width="7"/><circle cx="36" cy="25" r="12" fill="#ffd66d" stroke="${line}" stroke-width="5"/><circle cx="144" cy="25" r="12" fill="#7be8ff" stroke="${line}" stroke-width="5"/><path d="M90 35v61M90 35c18-7 23 14 8 17" stroke="${line}" stroke-width="6" fill="none"/>`);
    if(key==="capsuleBed")return wrap(`<ellipse cx="90" cy="69" rx="70" ry="50" fill="#dce8f2" stroke="${line}" stroke-width="7"/><path d="M90 20c39 0 70 22 70 49H90z" fill="#7fc8e5" opacity=".8" stroke="${line}" stroke-width="5"/><rect x="46" y="72" width="89" height="30" rx="15" fill="${c}" stroke="${line}" stroke-width="5"/><circle cx="39" cy="70" r="7" fill="#76f5d2" stroke="${line}" stroke-width="4"/>`);
    if(key==="treehouse")return wrap(`<path d="M91 12c-38 0-61 18-61 49h122c0-31-23-49-61-49z" fill="#70b275" stroke="${line}" stroke-width="7"/><rect x="48" y="49" width="86" height="54" rx="9" fill="${c}" stroke="${line}" stroke-width="7"/><path d="M20 120h140M78 103v20M101 103v20M151 49l-61-37-60 37" stroke="${line}" stroke-width="7"/><rect x="76" y="70" width="29" height="33" rx="8" fill="#4d3727" stroke="${line}" stroke-width="5"/>`);
    if(key==="aquariumTunnel")return wrap(`<path d="M17 111V66c0-34 29-54 73-54s73 20 73 54v45h-33V69c0-19-15-31-40-31S50 50 50 69v42z" fill="#82dbe5" opacity=".75" stroke="${line}" stroke-width="7"/><path d="M30 67h120" stroke="#fff" stroke-width="5"/><path d="M65 45c10-8 18 8 7 13m43-12c10-8 18 8 7 13" stroke="${c}" stroke-width="7" fill="none"/>`);
    if(key==="kitchenSet")return wrap(`<rect x="18" y="55" width="144" height="65" rx="8" fill="${c}" stroke="${line}" stroke-width="7"/><rect x="29" y="66" width="48" height="42" rx="5" fill="#fff4db" stroke="${line}" stroke-width="5"/><circle cx="53" cy="87" r="9" fill="#333"/><path d="M94 67h54M94 83h54M94 99h54" stroke="${line}" stroke-width="6"/><path d="M34 42h44M48 42V20h28" stroke="${line}" stroke-width="7" fill="none"/><circle cx="78" cy="21" r="8" fill="#e6e6e6" stroke="${line}" stroke-width="4"/>`);
    if(key==="trainSet")return wrap(`<ellipse cx="90" cy="91" rx="74" ry="28" fill="none" stroke="${line}" stroke-width="7"/><rect x="49" y="44" width="64" height="38" rx="7" fill="${c}" stroke="${line}" stroke-width="6"/><rect x="106" y="54" width="38" height="28" rx="6" fill="#e6ad4e" stroke="${line}" stroke-width="6"/><circle cx="68" cy="86" r="12" fill="#333" stroke="${line}" stroke-width="5"/><circle cx="124" cy="86" r="12" fill="#333" stroke="${line}" stroke-width="5"/><path d="M60 44V23h34v21M72 23v-9h13" stroke="${line}" stroke-width="6"/>`);
    if(key==="clawMachine")return wrap(`<rect x="35" y="9" width="110" height="112" rx="10" fill="${c}" stroke="${line}" stroke-width="7"/><rect x="47" y="20" width="86" height="67" rx="6" fill="#c9f2fa" stroke="${line}" stroke-width="5"/><path d="M90 22v28m0 0l-12 18m12-18 12 18" stroke="${line}" stroke-width="5"/><circle cx="60" cy="72" r="10" fill="#f18aa4"/><circle cx="87" cy="73" r="9" fill="#7ab5e0"/><circle cx="116" cy="71" r="11" fill="#f0c65a"/><circle cx="58" cy="103" r="7" fill="#f05f6b" stroke="${line}" stroke-width="4"/>`);
    if(key==="playground")return wrap(`<path d="M24 111h139M55 107V39h48M103 39l39 69" stroke="${line}" stroke-width="8" fill="none"/><path d="M104 39h29l29 68h-20z" fill="${c}" stroke="${line}" stroke-width="6"/><path d="M31 35h51v33H31z" fill="#f2c65f" stroke="${line}" stroke-width="6"/><path d="M38 68v39m36-39v39" stroke="${line}" stroke-width="6"/>`);
    return wrap(`<ellipse cx="90" cy="68" rx="55" ry="48" fill="none" stroke="${c}" stroke-width="15"/><ellipse cx="90" cy="68" rx="31" ry="28" fill="#28234f" stroke="${line}" stroke-width="6"/><path d="M90 15v18M90 103v18M37 68H18M162 68h-19" stroke="#d7c3ff" stroke-width="7" stroke-linecap="round"/>`);
  }

  function companionSvg(key){
    const line="#493951";
    if(key==="bird")return `<svg viewBox="0 0 70 70"><ellipse cx="34" cy="40" rx="23" ry="20" fill="#70b5db" stroke="${line}" stroke-width="5"/><circle cx="45" cy="33" r="4" fill="#222"/><path d="M55 39l13 6-13 6z" fill="#e9ae45" stroke="${line}" stroke-width="3"/><path d="M18 39c-12-8-13 12 0 15" fill="#568db5" stroke="${line}" stroke-width="4"/></svg>`;
    if(key==="turtle")return `<svg viewBox="0 0 70 70"><ellipse cx="34" cy="40" rx="25" ry="18" fill="#77b66d" stroke="${line}" stroke-width="5"/><circle cx="59" cy="39" r="9" fill="#9bd08e" stroke="${line}" stroke-width="4"/><path d="M25 28l18 24M43 28L25 52" stroke="#4f8b4d" stroke-width="4"/></svg>`;
    if(key==="snail")return `<svg viewBox="0 0 70 70"><path d="M11 50c21 0 32-17 49 0" fill="#e8b17e" stroke="${line}" stroke-width="5"/><circle cx="35" cy="35" r="18" fill="#b889cf" stroke="${line}" stroke-width="5"/><path d="M35 25c13 0 12 18 1 18-8 0-8-10-1-10" fill="none" stroke="${line}" stroke-width="4"/></svg>`;
    if(key==="butterfly")return `<svg viewBox="0 0 70 70"><ellipse cx="24" cy="29" rx="18" ry="22" fill="#f19abc" stroke="${line}" stroke-width="4"/><ellipse cx="48" cy="29" rx="18" ry="22" fill="#8bb7e8" stroke="${line}" stroke-width="4"/><ellipse cx="36" cy="40" rx="7" ry="22" fill="#46374d"/></svg>`;
    if(key==="robot")return `<svg viewBox="0 0 70 70"><rect x="13" y="18" width="44" height="42" rx="10" fill="#aeb8c5" stroke="${line}" stroke-width="5"/><circle cx="27" cy="36" r="5" fill="#71f1d6"/><circle cx="43" cy="36" r="5" fill="#71f1d6"/><path d="M35 18V8m-7 45h14" stroke="${line}" stroke-width="5"/></svg>`;
    if(key==="cloud")return `<svg viewBox="0 0 70 70"><path d="M12 49c-8-19 11-27 22-19 5-18 28-11 27 7 13 2 10 20-4 20H21c-8 0-12-3-9-8z" fill="#fff" stroke="${line}" stroke-width="5"/><circle cx="29" cy="44" r="3"/><circle cx="43" cy="44" r="3"/></svg>`;
    if(key==="babyDragon")return `<svg viewBox="0 0 70 70"><ellipse cx="35" cy="40" rx="22" ry="20" fill="#75b982" stroke="${line}" stroke-width="5"/><path d="M14 36L3 20l22 9M56 36l11-16-22 9" fill="#5e9b71" stroke="${line}" stroke-width="4"/><path d="M33 17l6-12 7 15" fill="#efc75e" stroke="${line}" stroke-width="4"/></svg>`;
    if(key==="firefly")return `<svg viewBox="0 0 70 70"><ellipse cx="35" cy="39" rx="10" ry="20" fill="#363344" stroke="${line}" stroke-width="4"/><circle cx="35" cy="50" r="13" fill="#fff47b" opacity=".9"/><ellipse cx="19" cy="34" rx="13" ry="8" fill="#d9f5ff" stroke="${line}" stroke-width="3"/><ellipse cx="51" cy="34" rx="13" ry="8" fill="#d9f5ff" stroke="${line}" stroke-width="3"/></svg>`;
    if(key==="frog")return `<svg viewBox="0 0 70 70"><ellipse cx="35" cy="43" rx="26" ry="19" fill="#75bd69" stroke="${line}" stroke-width="5"/><circle cx="22" cy="25" r="11" fill="#8bd37f" stroke="${line}" stroke-width="4"/><circle cx="48" cy="25" r="11" fill="#8bd37f" stroke="${line}" stroke-width="4"/><circle cx="22" cy="25" r="4"/><circle cx="48" cy="25" r="4"/></svg>`;
    if(key==="star")return `<svg viewBox="0 0 70 70"><path d="M35 4l9 20 22 2-17 15 5 22-19-12-19 12 5-22L4 26l22-2z" fill="#ffd75a" stroke="${line}" stroke-width="5"/><circle cx="28" cy="33" r="3"/><circle cx="42" cy="33" r="3"/></svg>`;
    return "";
  }

  function buildPremiumPage(){
    const nav=document.querySelector('.nav');
    if(!nav||$('premiumPage'))return;
    const navBtn=document.createElement('button');navBtn.dataset.page='premium';navBtn.textContent='Premium';nav.appendChild(navBtn);
    const page=document.createElement('section');page.id='premiumPage';page.className='page premium-page hidden';
    page.innerHTML=`
      <div class="premium-hero">
        <div class="row"><div><span class="premium-badge">PREMIUM EXPANSION</span><h2>Hammy Premium House</h2><p class="muted">Extra hamsters, rooms, decorating, focus tools, companions, loot and mini-games.</p></div><div><button id="premiumPreviewBtn" class="primary">${premiumUnlocked()?"Premium active":"Open Premium preview"}</button><button id="restorePremiumBtn" class="secondary">Restore Premium</button></div></div>
        <div class="premium-stat-grid"><div class="premium-stat"><strong id="premiumDays">0</strong>Practice days</div><div class="premium-stat"><strong id="premiumTickets">0</strong>Game tickets</div><div class="premium-stat"><strong id="premiumEggs">0</strong>Mystery eggs</div><div class="premium-stat"><strong id="premiumLuckText">0%</strong>Luck</div></div>
      </div>
      <div class="premium-tabs" id="premiumTabs"></div>
      <div id="premiumPanels">
        <div class="premium-panel active" data-premium-panel="house">
          <div class="premium-grid"><div class="premium-card" style="grid-column:1/-1"><div class="row"><div><h3>Premium House</h3><p class="muted">Switch rooms, decorate and interact with furniture.</p></div><button id="premiumInteractBtn" class="primary">Use selected furniture</button></div>
            <div id="premiumScene" class="premium-scene" data-room="bedroom" data-weather="stars"><div class="scene-wall"></div><div class="scene-floor"></div><div class="scene-window"><div class="weather-layer"></div></div><div id="decorLayer"></div><div class="premium-hamster-wrap">${hamsterCoreMarkup()}</div><div id="sceneCompanion" class="scene-companion hidden"></div><div id="premiumRoomLock" class="premium-room-lock hidden"><div class="premium-room-lock-icon">🔒</div><h3>Premium Rooms Locked</h3><p>Activate Premium to enter the 12 furnished rooms, move furniture, and use room animations.</p><button id="unlockRoomsBtn" class="primary">Unlock Premium preview</button></div><div id="sceneMessage" class="scene-message">Choose a room and furniture.</div></div>
          </div></div>
          <div class="premium-card"><h3>Rooms</h3><div id="roomAccessMessage" class="premium-banner"></div><div id="roomButtons" class="room-buttons"></div><div class="premium-banner">Every Premium room starts with its own furnished layout. Your edits remain saved separately.</div></div>
          <div class="premium-card"><h3>Room atmosphere</h3><div class="premium-form-grid"><label>Window<select id="weatherSelect"><option value="rain">Rain</option><option value="snow">Snow</option><option value="stars">Stars</option><option value="sunset">Sunset</option></select></label><label>Lighting<select id="dayNightSelect"><option value="day">Day</option><option value="night">Night</option></select></label><label>Wallpaper<input id="wallColor" type="color" value="#e9dfff"></label><label>Floor<input id="floorColor" type="color" value="#d7b78d"></label></div></div>
        </div>
        <div class="premium-panel" data-premium-panel="hamsters"><div class="premium-grid"><div class="premium-card" style="grid-column:1/-1"><h3>Premium hamsters</h3><p class="muted">These also appear in the normal Hamsters screen after Premium is active.</p><div id="premiumHamsterGrid" class="skin-grid"></div></div><div class="premium-card"><h3>Custom Hamster Creator</h3><div id="customizerGrid" class="customizer-grid"></div><button id="applyCustomHamster" class="primary">Save and use custom hamster</button></div><div class="premium-card"><h3>Personality</h3><p class="muted">Changes the premium room idle animation and messages.</p><div id="personalityChoices" class="personality-choices"></div></div></div></div>
        <div class="premium-panel" data-premium-panel="costumes"><div class="premium-card"><h3>Premium costume path</h3><p class="muted">Premium does not instantly unlock milestone costumes. You still earn them through real practice days.</p><div id="premiumCostumeGrid" class="premium-grid" style="margin-top:10px"></div></div></div>
        <div class="premium-panel" data-premium-panel="furniture">
 <div class="premium-card"><h3>Premium furniture collection</h3><p class="muted">Place furniture, drag it with a mouse or finger, and move individual items between rooms. Removing furniture sends it to storage instead of destroying it.</p><div id="furnitureStorageSummary" class="premium-banner"></div><div id="premiumFurnitureGrid" class="premium-furniture-grid" style="margin-top:10px"></div></div>
 <div class="premium-grid" style="margin-top:12px">
  <div class="premium-card"><h3>Selected furniture controls</h3><p id="selectedDecorLabel" class="premium-banner">Tap furniture in the room to select it.</p><div class="decor-controls"><label>Rotation<input id="decorRotation" type="range" min="-180" max="180" value="0"></label><label>Size<input id="decorScale" type="range" min="50" max="160" value="100"></label><label>Colour<input id="decorColor" type="color" value="#8b63d9"></label><label>Layer<select id="decorLayerSelect"><option value="10">Behind</option><option value="20" selected>Middle</option><option value="60">Front</option></select></label></div><div class="decor-move-row"><button id="removeDecorBtn" class="secondary">Remove to storage</button><select id="moveDecorRoomSelect"></select><button id="moveDecorBtn" class="primary">Move to room</button></div></div>
  <div class="premium-card"><h3>Room layout tools</h3><button id="resetRoomBtn" class="secondary">Reset this room to its default setup</button><div id="layoutButtons" class="layout-buttons" style="margin-top:10px"></div></div>
 </div>
</div>
        <div class="premium-panel" data-premium-panel="focus"><div class="premium-grid"><div class="premium-card"><h3>Premium focus controls</h3><div class="premium-form-grid"><label>Custom minutes<input id="premiumCustomMinutes" type="number" min="1" max="480" value="40"></label><label>Timer style<select id="timerStyleSelect"><option value="digital">Digital</option><option value="soft">Soft</option><option value="neon">Neon</option><option value="minimal">Minimal</option></select></label><label>Daily goal<input id="dailyGoalInput" type="number" min="5" max="600"></label><label>Weekly goal<input id="weeklyGoalInput" type="number" min="10" max="3000"></label></div><button id="applyFocusSettings" class="primary">Apply focus settings</button></div><div class="premium-card"><h3>Saved task presets</h3><div class="custom-task-row"><input id="presetInput" maxlength="60" placeholder="New task preset"><button id="addPresetBtn" class="secondary">Add</button></div><div id="presetList" class="preset-list"></div></div><div class="premium-card"><h3>Reminder</h3><textarea id="reminderInput" rows="3"></textarea><button id="saveReminderBtn" class="secondary">Save reminder</button><h3 style="margin-top:14px">Focus challenge</h3><div id="challengeText" class="premium-banner"></div><button id="newChallengeBtn" class="primary">Generate challenge</button></div><div class="premium-card"><h3>Soundscapes</h3><select id="soundscapeSelect" style="width:100%;padding:9px"><option value="off">Off</option><option value="rain">Rain</option><option value="forest">Forest</option><option value="fireplace">Fireplace</option><option value="ocean">Ocean</option><option value="train">Train ride</option><option value="library">Library</option><option value="crickets">Night crickets</option><option value="spaceship">Spaceship ambience</option></select><div class="row" style="margin-top:8px"><button id="startSoundscapeBtn" class="primary">Play</button><button id="stopSoundscapeBtn" class="secondary">Stop</button></div></div><div class="premium-card" style="grid-column:1/-1"><h3>Weekly and monthly reports</h3><div id="reportSummary" class="premium-stat-grid"></div><div id="heatmap" class="heatmap"></div><h3 style="margin-top:13px">Recent focus history</h3><div id="historyList" class="history-list"></div></div></div></div>
        <div class="premium-panel" data-premium-panel="loot"><div class="premium-grid"><div class="premium-card"><h3>Premium Luck</h3><p class="muted">Successful sessions fill the meter. It gives a small bonus and never replaces real practice.</p><div class="luck-meter"><div id="premiumLuckBar"></div></div><p id="premiumLuckDescription" class="muted"></p></div><div class="premium-card"><h3>Mystery eggs</h3><p>Owned: <strong id="eggCount">0</strong></p><button id="hatchEggBtn" class="primary">Hatch one egg</button><div id="hatchResult" class="premium-banner"></div></div><div class="premium-card"><h3>Collectibles</h3><p>Shiny fruit: <strong id="shinyFruitCount">0</strong></p><div id="badgeShelf" class="badge-shelf"></div><div id="decorationShelf" class="decoration-shelf"></div></div><div class="premium-card"><h3>Loot rules</h3><p class="muted">Sessions of at least 25 minutes earn one extra Premium chest. Longer sessions, Loot Level and the Luck meter slightly improve it.</p><div id="lootLog" class="loot-list"></div></div></div></div>
        <div class="premium-panel" data-premium-panel="friends"><div class="premium-card"><h3>Companions</h3><p class="muted">Companions follow Nibbles and interact visually. They do not change focus rewards.</p><div id="companionGrid" class="premium-grid"></div></div></div>
        <div class="premium-panel" data-premium-panel="games"><div class="row"><div><h3>Premium mini-games</h3><p class="muted">All ten games are playable. Each run costs one ticket. Premium preview gives ten starter tickets once, and completed focus sessions earn more.</p></div><span class="chip">Tickets: <span id="gameTicketCount">0</span></span></div><div id="miniGameNotice" class="premium-banner">Finish focus sessions to refill tickets.</div><div id="miniGameGrid" class="minigame-grid" style="margin-top:10px"></div></div>
        <div class="premium-panel" data-premium-panel="effects">
          <div class="premium-grid">
            <div class="premium-card"><h3>Completion celebration</h3><div id="effectChoices" class="effect-choices"></div></div>
            <div class="premium-card"><h3>Animated room background</h3><select id="backgroundEffectSelect" style="width:100%;padding:9px"><option value="none">None</option><option value="sparkles">Sparkles</option><option value="rainbow">Rainbow glow</option></select></div>
          </div>
          <div class="premium-card" style="margin-top:12px">
            <h3>Premium app icon chooser</h3>
            <div class="current-icon-row"><img id="currentAppIconPreview" alt="Current app icon"><div><strong id="selectedAppIconName">Classic Lavender</strong><p id="nativeIconSupport" class="muted"></p></div></div>
            <div id="appIconGrid" class="app-icon-grid"></div>
          </div>
          <div class="premium-card payment-ready-card" style="margin-top:12px">
            <h3>Real Premium purchase</h3>
            <p id="premiumStatusText">This browser build uses a local Premium preview.</p>
            <div class="payment-product-row"><div><strong>Hammy Premium — Lifetime</strong><p class="muted">Product ID: <code>hammy_premium_lifetime</code></p></div><strong class="payment-price">$4.99</strong></div>
            <div class="payment-action-row"><button id="buyPremiumBtn" class="primary">Buy Premium</button><button id="restoreStorePurchaseBtn" class="secondary">Restore store purchase</button><button id="restorePremiumAgain" class="secondary">Restore local preview</button></div>
            <p id="paymentStatus" class="premium-banner">Store billing is not connected in this browser build, so these buttons cannot charge money yet.</p>
          </div>
        </div>
      </div>`;
    document.querySelector('main').appendChild(page);

    // Rebind all nav buttons because the original binding ran before Premium was added.
    document.querySelectorAll('.nav button').forEach(b=>{
      if(b.dataset.premiumBound)return;b.dataset.premiumBound='1';
      b.addEventListener('click',()=>{
        document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
        document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
        b.classList.add('active');const target=$(b.dataset.page+'Page');if(target)target.classList.remove('hidden');
        if(b.dataset.page==='premium'){showPremiumLoadingOnce();renderPremiumAll();}
      });
    });
  }

  const premiumTabInfo=[['house','House'],['hamsters','Hamsters'],['costumes','Costumes'],['furniture','Furniture'],['focus','Focus+Stats'],['loot','Loot'],['friends','Friends'],['games','Mini-games'],['effects','Themes+Effects']];
  function setupPremiumTabs(){
    const el=$('premiumTabs');if(!el)return;el.innerHTML='';premiumTabInfo.forEach(([key,label],i)=>{const b=document.createElement('button');b.textContent=label;b.className=i===0?'active':'';b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.premium-panel').forEach(p=>p.classList.toggle('active',p.dataset.premiumPanel===key));if(key==='focus')renderReports();if(key==='house')renderPremiumScene();});el.appendChild(b)});
  }

  function premiumSkinClass(key){const effect=skins[key]?.effect;return effect?`skin-${effect}`:''}
  function updateCustomSkinObject(){Object.assign(skins.custom,{fur:state.customSkin.fur,fur2:state.customSkin.fur2,patch:state.customSkin.patch})}
  function applySkinToElement(el,key){
    if(!el)return;updateCustomSkinObject();const s=skins[key]||skins.white;
    el.className='hamster premium-skin '+premiumSkinClass(key);
    el.style.setProperty('--fur',s.fur);el.style.setProperty('--fur2',s.fur2);el.style.setProperty('--patch',s.patch);
    if(key==='custom'){el.style.setProperty('--custom-eye',state.customSkin.eye);el.style.setProperty('--custom-ear',state.customSkin.ear);el.style.setProperty('--custom-cheek',state.customSkin.cheek)}
  }

  function renderPremiumHamsters(){
    const grid=$('premiumHamsterGrid');if(!grid)return;grid.innerHTML='';
    ['galaxy','rainbow','frost','sakura','golden','ghost','robot','dragon','axolotl','custom'].forEach(key=>{
      const s=skins[key],locked=!premiumUnlocked();const card=document.createElement('div');card.className='skin'+(state.skin===key?' selected':'');
      const preview=document.createElement('div');preview.className='skin-preview';preview.innerHTML=hamsterCoreMarkup('preview-'+key);card.innerHTML=`<span class="badge left premium">PREMIUM</span><span class="badge right">${locked?'LOCKED':state.skin===key?'USING':'CHOOSE'}</span>`;card.appendChild(preview);const h=preview.querySelector('.hamster');applySkinToElement(h,key);
      const name=document.createElement('strong');name.textContent=s.name;card.appendChild(name);const p=document.createElement('p');p.className='muted';p.textContent=locked?'Activate Premium preview first':'Original animated skin';card.appendChild(p);const b=document.createElement('button');b.className=locked?'secondary':'primary';b.textContent=locked?'Locked':state.skin===key?'Selected':'Use';b.disabled=locked||state.skin===key;b.addEventListener('click',()=>{state.skin=key;save();update();renderSkins();renderPremiumHamsters();renderPremiumScene();});card.appendChild(b);grid.appendChild(card);
    });
  }

  function renderCustomizer(){
    const grid=$('customizerGrid');if(!grid)return;grid.innerHTML='';
    [['fur','Fur'],['fur2','Belly'],['patch','Patch'],['eye','Eyes'],['ear','Inner ears'],['cheek','Cheeks']].forEach(([key,label])=>{const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='color';input.value=state.customSkin[key];input.dataset.customColor=key;input.addEventListener('input',()=>{state.customSkin[key]=input.value;updateCustomSkinObject();renderPremiumScene();});l.appendChild(input);grid.appendChild(l)});
  }

  function renderPersonalities(){
    const el=$('personalityChoices');if(!el)return;el.innerHTML='';Object.entries(personalities).forEach(([key,name])=>{const b=document.createElement('button');b.textContent=name;b.classList.toggle('active',state.personality===key);b.addEventListener('click',()=>{if(!premiumUnlocked())return;state.personality=key;save();renderPersonalities();renderPremiumScene();});el.appendChild(b)});
  }

  function renderPremiumCostumes(){
    const grid=$('premiumCostumeGrid');if(!grid)return;grid.innerHTML='';Object.entries(clothes).filter(([,c])=>c.premiumOnly).sort((a,b)=>a[1].days-b[1].days).forEach(([key,c])=>{const unlocked=premiumUnlocked()&&state.practiceDays>=c.days;const card=document.createElement('div');card.className='premium-card';card.style.position='relative';card.innerHTML=`${entitlementLockHtml()}<span class="premium-badge">${c.days} DAYS</span><h3>${escapeHtml(c.name)}</h3><p class="muted">${unlocked?'Earned through practice':Math.max(0,c.days-state.practiceDays)+' more practice days'}</p><div class="costume-progress"><div style="width:${Math.min(100,state.practiceDays/c.days*100)}%"></div></div>`;const b=document.createElement('button');b.className='primary';b.textContent=state.equipped===key?'Wearing':unlocked?'Wear':'Locked';b.disabled=!unlocked||state.equipped===key;b.addEventListener('click',()=>{state.equipped=key;if(!state.clothes.includes(key))state.clothes.push(key);save();update();renderClothing();renderPremiumCostumes();renderPremiumScene();});card.appendChild(b);grid.appendChild(card)});
  }

  function renderRoomButtons(){
    const el=$('roomButtons');if(!el)return;el.innerHTML='';
    const locked=!premiumUnlocked();
    const message=$('roomAccessMessage');
    if(message)message.textContent=locked
      ?'Premium is required to enter these rooms. Room layouts and furniture are hidden while locked.'
      :'Premium active — choose any furnished room.';

    if(!locked)ensureDefaultRoomSetups();

    Object.entries(premiumRooms).forEach(([key,name])=>{
      const b=document.createElement('button');
      const count=locked?null:Object.keys(currentRoomDecor(key)).length;
      b.textContent=locked?`🔒 ${name}`:`${name} (${count})`;
      b.disabled=locked;
      b.classList.toggle('active',!locked&&state.premiumRoom===key);
      b.setAttribute('aria-label',locked?`${name} is Premium only`:`Open ${name}`);
      b.addEventListener('click',()=>{
        if(!premiumUnlocked()){
          sceneMessage('This room is available only with Premium.');
          return;
        }
        saveCurrentDecor();
        state.premiumRoom=key;
        state.selectedDecor=null;
        save();
        renderRoomButtons();
        renderPremiumFurniture();
        renderPremiumScene();
        syncDecorControls();
      });
      el.appendChild(b);
    });
  }

  function currentRoomDecor(room=state.premiumRoom){
    if(!state.premiumDecor[room]||typeof state.premiumDecor[room]!=="object")state.premiumDecor[room]={};
    return state.premiumDecor[room];
  }
  function roomItemsOfType(type,room=state.premiumRoom){
    return Object.values(currentRoomDecor(room)).filter(d=>d.type===type);
  }
  function findDecorLocation(id){
    for(const room of Object.keys(premiumRooms)){
      if(currentRoomDecor(room)[id])return {kind:"room",room,item:currentRoomDecor(room)[id]};
    }
    const storageIndex=state.premiumFurnitureStorage.findIndex(d=>d.id===id);
    return storageIndex>=0?{kind:"storage",storageIndex,item:state.premiumFurnitureStorage[storageIndex]}:null;
  }
  function nextOpenPosition(room=state.premiumRoom){
    const count=Object.keys(currentRoomDecor(room)).length;
    return {x:18+(count%4)*22,y:42+Math.floor((count%12)/4)*18};
  }
  function placeFurnitureType(type,room=state.premiumRoom){
    if(!premiumUnlocked()){sceneMessage('Premium is required to use rooms and furniture.');return;}
    const storageIndex=state.premiumFurnitureStorage.findIndex(d=>d.type===type);
    let item;
    if(storageIndex>=0){
      item=state.premiumFurnitureStorage.splice(storageIndex,1)[0];
      const pos=nextOpenPosition(room);
      item={...item,x:pos.x,y:pos.y};
    }else{
      item=makeDecor(type,nextOpenPosition(room));
    }
    currentRoomDecor(room)[item.id]=item;
    state.selectedDecor=item.id;
    state.activePremiumFurniture=item.id;
    save();
    return item;
  }
  function removeSelectedToStorage(){
    if(!premiumUnlocked()){sceneMessage('Premium is required to use rooms and furniture.');return;}
    const id=state.selectedDecor;
    const item=id?currentRoomDecor()[id]:null;
    if(!item){sceneMessage('Select a furniture item first.');return}
    delete currentRoomDecor()[id];
    state.premiumFurnitureStorage.push({...item});
    state.selectedDecor=null;
    state.activePremiumFurniture=null;
    save();
    renderRoomButtons();
    renderPremiumFurniture();
    renderPremiumScene();
    syncDecorControls();
    sceneMessage(`${premiumFurniture[item.type].name} moved to storage.`);
  }
  function moveSelectedToRoom(destination){
    if(!premiumUnlocked()){sceneMessage('Premium is required to use rooms and furniture.');return;}
    const id=state.selectedDecor;
    const item=id?currentRoomDecor()[id]:null;
    if(!item){sceneMessage('Select a furniture item first.');return}
    if(!premiumRooms[destination]||destination===state.premiumRoom){sceneMessage('Choose a different room.');return}
    delete currentRoomDecor()[id];
    const pos=nextOpenPosition(destination);
    currentRoomDecor(destination)[id]={...item,x:pos.x,y:pos.y};
    state.selectedDecor=null;
    state.activePremiumFurniture=null;
    save();
    renderRoomButtons();
    renderPremiumFurniture();
    renderPremiumScene();
    syncDecorControls();
    sceneMessage(`${premiumFurniture[item.type].name} moved to ${premiumRooms[destination]}.`);
  }
  function resetCurrentRoomToDefault(){
    if(!premiumUnlocked()){sceneMessage('Premium is required to use rooms and furniture.');return;}
    if(!premiumUnlocked())return;
    state.premiumDecor[state.premiumRoom]=defaultDecorForRoom(state.premiumRoom);
    state.selectedDecor=null;
    state.activePremiumFurniture=null;
    save();
    renderRoomButtons();
    renderPremiumFurniture();
    renderPremiumScene();
    syncDecorControls();
    sceneMessage(`${premiumRooms[state.premiumRoom]} restored to its default setup.`);
  }
  function saveCurrentDecor(){save()}

  function renderPremiumFurniture(){
    const grid=$('premiumFurnitureGrid');if(!grid)return;grid.innerHTML='';
    const locked=!premiumUnlocked();
    const storedTotal=locked?0:state.premiumFurnitureStorage.length;
    const summary=$('furnitureStorageSummary');
    if(summary)summary.textContent=locked
      ?'Premium furniture and room storage are locked.'
      :`Storage: ${storedTotal} item${storedTotal===1?"":"s"}. Current room: ${Object.keys(currentRoomDecor()).length} item${Object.keys(currentRoomDecor()).length===1?"":"s"}.`;
    Object.entries(premiumFurniture).forEach(([type,f])=>{
      const current=locked?[]:roomItemsOfType(type);
      const stored=locked?[]:state.premiumFurnitureStorage.filter(d=>d.type===type);
      const otherRooms=locked?[]:Object.keys(premiumRooms).filter(r=>r!==state.premiumRoom&&roomItemsOfType(type,r).length);
      const card=document.createElement('div');
      card.className='premium-furniture-card';
      card.innerHTML=`${entitlementLockHtml()}<div class="premium-furniture-art">${furnitureSvg(type,state.premiumFurnitureColors[type]||f.color)}</div><strong>${f.name}</strong><p class="muted">${f.description}</p><div class="furniture-location-line">Here: ${current.length} · Storage: ${stored.length} · Other rooms: ${otherRooms.length}</div>`;
      const actions=document.createElement('div');actions.className='premium-furniture-actions';

      const place=document.createElement('button');
      place.className='primary';
      place.textContent=stored.length?'Place stored':'Add another';
      place.disabled=!premiumUnlocked();
      place.addEventListener('click',()=>{
        placeFurnitureType(type);
        renderRoomButtons();renderPremiumFurniture();renderPremiumScene();syncDecorControls();
        sceneMessage(`${f.name} placed in ${premiumRooms[state.premiumRoom]}. Drag it to move it.`);
      });

      const select=document.createElement('button');
      select.className='secondary';
      select.textContent=current.length?'Select':'Not in room';
      select.disabled=!premiumUnlocked()||!current.length;
      select.addEventListener('click',()=>{
        const item=current[0];
        state.selectedDecor=item.id;state.activePremiumFurniture=item.id;
        renderDecorLayer();syncDecorControls();sceneMessage(`${f.name} selected.`);
      });

      const use=document.createElement('button');
      use.className='secondary';
      use.textContent='Use';
      use.disabled=!premiumUnlocked()||!current.length;
      use.addEventListener('click',()=>{
        const item=current[0];
        state.selectedDecor=item.id;state.activePremiumFurniture=item.id;
        renderPremiumScene();syncDecorControls();useSelectedFurniture();
      });
      actions.append(place,select,use);card.appendChild(actions);grid.appendChild(card);
    });
  }

  function renderDecorLayer(){
    const layer=$('decorLayer');if(!layer)return;layer.innerHTML='';if(!premiumUnlocked())return;
    Object.entries(currentRoomDecor()).forEach(([id,d])=>{
      const f=premiumFurniture[d.type];if(!f)return;
      const item=document.createElement('div');
      item.className='decor-item'+(state.selectedDecor===id?' selected':'');
      item.dataset.decorId=id;
      item.dataset.decorType=d.type;
      item.style.left=d.x+'%';item.style.top=d.y+'%';
      item.style.setProperty('--rotation',d.rotation+'deg');
      item.style.setProperty('--scale',d.scale);
      item.style.setProperty('--decor-color',d.color);
      item.style.zIndex=d.z||20;
      item.innerHTML=`${furnitureSvg(d.type,d.color)}<span class="decor-name">${escapeHtml(f.name)}</span><button type="button" class="decor-store-button" aria-label="Remove ${escapeHtml(f.name)} to storage">×</button>`;
      item.addEventListener('pointerdown',startDecorDrag);
      item.addEventListener('click',e=>{
        e.stopPropagation();
        if(e.target.closest('.decor-store-button'))return;
        state.selectedDecor=id;state.activePremiumFurniture=id;
        renderDecorLayer();syncDecorControls();
      });
      item.querySelector('.decor-store-button').addEventListener('click',e=>{
        e.stopPropagation();
        state.selectedDecor=id;
        removeSelectedToStorage();
      });
      layer.appendChild(item);
    });
  }
  let dragState=null;
  function startDecorDrag(e){
    if(!premiumUnlocked()){sceneMessage('Premium is required to use rooms and furniture.');return;}
    if(!premiumUnlocked()||e.target.closest('.decor-store-button'))return;
    e.preventDefault();
    const item=e.currentTarget,id=item.dataset.decorId,scene=$('premiumScene'),rect=scene.getBoundingClientRect();
    state.selectedDecor=id;state.activePremiumFurniture=id;
    dragState={id,rect,pointer:e.pointerId,moved:false};
    document.querySelectorAll('.decor-item').forEach(x=>x.classList.toggle('selected',x===item));
    item.setPointerCapture?.(e.pointerId);
    item.addEventListener('pointermove',moveDecorDrag);
    item.addEventListener('pointerup',endDecorDrag,{once:true});
    item.addEventListener('pointercancel',endDecorDrag,{once:true});
    syncDecorControls();
  }
  function moveDecorDrag(e){
    if(!dragState)return;
    const d=currentRoomDecor()[dragState.id];if(!d)return;
    dragState.moved=true;
    d.x=clamp((e.clientX-dragState.rect.left)/dragState.rect.width*100,4,96);
    d.y=clamp((e.clientY-dragState.rect.top)/dragState.rect.height*100,12,92);
    e.currentTarget.style.left=d.x+'%';e.currentTarget.style.top=d.y+'%';
  }
  function endDecorDrag(e){
    e.currentTarget.removeEventListener('pointermove',moveDecorDrag);
    dragState=null;save();renderDecorLayer();syncDecorControls();
  }
  function syncDecorControls(){
    const d=premiumUnlocked()&&state.selectedDecor?currentRoomDecor()[state.selectedDecor]:null;
    const ids=['decorRotation','decorScale','decorColor','decorLayerSelect','removeDecorBtn','moveDecorRoomSelect','moveDecorBtn'];
    ids.forEach(id=>{const el=$(id);if(el)el.disabled=!d});
    const label=$('selectedDecorLabel');
    if(!d){
      if(label)label.textContent='Tap furniture in the room to select it.';
      return;
    }
    $('decorRotation').value=d.rotation;
    $('decorScale').value=Math.round(d.scale*100);
    $('decorColor').value=d.color;
    $('decorLayerSelect').value=String(d.z||20);
    if(label)label.textContent=`Selected: ${premiumFurniture[d.type].name} in ${premiumRooms[state.premiumRoom]}`;
    const select=$('moveDecorRoomSelect');
    if(select){
      select.innerHTML='';
      Object.entries(premiumRooms).filter(([key])=>key!==state.premiumRoom).forEach(([key,name])=>{
        const option=document.createElement('option');option.value=key;option.textContent=`Move to ${name}`;select.appendChild(option);
      });
    }
  }
  function renderLayoutButtons(){
    const el=$('layoutButtons');if(!el)return;el.innerHTML='';
    if(!premiumUnlocked()){
      const locked=document.createElement('div');
      locked.className='premium-banner';
      locked.textContent='Saved Premium room layouts are locked.';
      el.appendChild(locked);
      return;
    }
    [1,2,3].forEach(slot=>{
      const saveB=document.createElement('button');saveB.textContent=`Save layout ${slot}`;
      saveB.addEventListener('click',()=>{
        if(!premiumUnlocked())return;
        state.premiumLayouts[slot]=structuredClone({room:state.premiumRoom,decor:currentRoomDecor(),weather:state.premiumWeather,night:state.premiumNight});
        save();sceneMessage(`Layout ${slot} saved.`);
      });
      const loadB=document.createElement('button');loadB.textContent=`Load ${slot}`;loadB.disabled=!state.premiumLayouts[slot];
      loadB.addEventListener('click',()=>{
        const data=state.premiumLayouts[slot];if(!data)return;
        state.premiumRoom=data.room;
        state.premiumDecor[data.room]=structuredClone(data.decor);
        normalizePremiumDecor();
        state.premiumWeather=data.weather;state.premiumNight=data.night;state.selectedDecor=null;
        save();renderPremiumAll();sceneMessage(`Layout ${slot} loaded.`);
      });
      el.append(saveB,loadB);
    });
  }

  function costumeMarkupForScene(){const c=clothes[state.equipped];if(!c)return'';if(c.premiumOnly&&!premiumUnlocked())return'';return typeof outfitMarkup==='function'?outfitMarkup(c):`<span class="clothing ${c.type} on" style="--cloth:${c.color}"></span>`}
  function sceneMessage(text){const el=$('sceneMessage');if(el)el.textContent=text}
  function renderPremiumScene(){
    const scene=$('premiumScene');if(!scene)return;
    const locked=!premiumUnlocked();
    const lock=$('premiumRoomLock');
    const decor=$('decorLayer');
    const wrap=scene.querySelector('.premium-hamster-wrap');
    const comp=$('sceneCompanion');

    scene.classList.toggle('premium-room-locked',locked);
    if(lock)lock.classList.toggle('hidden',!locked);

    const atmosphereControls=['weatherSelect','dayNightSelect','wallColor','floorColor','premiumInteractBtn'];
    atmosphereControls.forEach(id=>{const el=$(id);if(el)el.disabled=locked});

    if(locked){
      if(decor)decor.innerHTML='';
      if(wrap)wrap.classList.add('hidden');
      if(comp){comp.classList.add('hidden');comp.innerHTML=''}
      scene.dataset.room='locked';
      scene.dataset.weather='stars';
      scene.classList.remove('night-mode','bg-rainbow');
      scene.classList.add('bg-sparkles');
      sceneMessage('Premium rooms are locked.');
      return;
    }

    ensureDefaultRoomSetups();
    if(wrap)wrap.classList.remove('hidden');
    scene.dataset.room=state.premiumRoom;
    const rc=state.roomColors[state.premiumRoom]||{};
    scene.style.setProperty('--room-wall',rc.wall||'');
    scene.style.setProperty('--room-floor',rc.floor||'');
    if($('wallColor')&&rc.wall)$('wallColor').value=rc.wall;
    if($('floorColor')&&rc.floor)$('floorColor').value=rc.floor;
    scene.dataset.weather=state.premiumWeather;
    scene.classList.toggle('night-mode',state.premiumNight);
    scene.classList.toggle('bg-sparkles',state.backgroundEffect==='sparkles');
    scene.classList.toggle('bg-rainbow',state.backgroundEffect==='rainbow');
    scene.classList.toggle('personality-playful',state.personality==='playful');
    scene.classList.toggle('personality-sleepy',state.personality==='sleepy');
    scene.classList.toggle('personality-adventurous',state.personality==='adventurous');
    scene.classList.toggle('personality-studious',state.personality==='studious');
    scene.classList.toggle('personality-musical',state.personality==='musical');
    scene.classList.toggle('personality-hungry',state.personality==='hungry');
    scene.classList.toggle('personality-shy',state.personality==='shy');
    scene.classList.toggle('personality-energetic',state.personality==='energetic');

    const h=$('premiumHamster');
    applySkinToElement(h,state.skin);
    if(h&&state.equipped)h.classList.add('outfit-'+state.equipped);
    const layer=$('premiumCostumeLayer');
    if(layer)layer.innerHTML=costumeMarkupForScene();

    if(state.companion&&state.companion!=='none'&&state.unlockedCompanions.includes(state.companion)){
      comp.classList.remove('hidden');
      comp.innerHTML=companionSvg(state.companion);
    }else comp.classList.add('hidden');

    renderDecorLayer();
    sceneMessage(`${premiumRooms[state.premiumRoom]} — ${personalities[state.personality]} Nibbles`);
  }

  function clearPremiumFurnitureAction(){
    const wrap=document.querySelector('#premiumScene .premium-hamster-wrap');if(!wrap)return;
    wrap.className='premium-hamster-wrap';wrap.style.left='50%';wrap.style.top='';wrap.style.bottom='43px';wrap.style.transform='translateX(-50%)';
  }
  function useSelectedFurniture(){
    if(!premiumUnlocked()){sceneMessage('Premium is required to use rooms and furniture.');return;}
    const id=state.selectedDecor||state.activePremiumFurniture;
    const decor=id?currentRoomDecor()[id]:null;
    if(!decor){sceneMessage('Select furniture in this room first.');return}
    const type=decor.type;
    const item=document.querySelector(`.decor-item[data-decor-id="${id}"]`),scene=$('premiumScene'),wrap=scene?.querySelector('.premium-hamster-wrap');
    if(item){item.classList.remove('active-use');void item.offsetWidth;item.classList.add('active-use');setTimeout(()=>item.classList.remove('active-use'),3600)}
    if(item&&scene&&wrap){
      const ir=item.getBoundingClientRect(),sr=scene.getBoundingClientRect();
      const x=(ir.left+ir.width/2-sr.left)/sr.width*100,y=(ir.top+ir.height*.55-sr.top)/sr.height*100;
      clearPremiumFurnitureAction();wrap.classList.add('furniture-action','action-'+type);
      wrap.style.left=clamp(x,10,90)+'%';wrap.style.top=clamp(y-18,8,78)+'%';wrap.style.bottom='auto';wrap.style.transform='translate(-50%,-50%)';
      setTimeout(clearPremiumFurnitureAction,type==='portal'?1700:3900);
    }
    const messages={giantWheel:'Nibbles runs inside the giant wheel with speed trails!',bunkBed:'Nibbles climbs the ladder and curls up on the top bunk.',gamingDesk:'Nibbles taps the controls while the screens animate.',pool:'Nibbles swims gentle laps in the indoor pool.',bubbleBath:'Nibbles relaxes while bubbles float upward.',cinema:'Nibbles watches a changing shape movie.',musicStage:'Nibbles performs on the music stage!',capsuleBed:'Nibbles floats to sleep in the space capsule.',treehouse:'Nibbles climbs the ladder and peeks from the treehouse.',aquariumTunnel:'Nibbles walks through the aquarium tunnel under the fish.',kitchenSet:'Nibbles mixes a tiny recipe in the kitchen.',trainSet:'The train circles Nibbles around the room.',clawMachine:'Nibbles tries the claw machine.',playground:'Nibbles slides, swings and bounces!',portal:'The portal carries Nibbles to another premium room!'};
    sceneMessage(messages[type]||premiumFurniture[type].description);
    if(type==='portal'){
      const keys=Object.keys(premiumRooms),i=keys.indexOf(state.premiumRoom);
      setTimeout(()=>{state.premiumRoom=keys[(i+1)%keys.length];state.selectedDecor=null;save();renderPremiumAll()},1100);
    }
    if(type==='clawMachine'&&Math.random()<.35){
      const deco=['Crystal Poster','Moon Garland','Tiny Trophy','Star Cushion'][Math.floor(Math.random()*4)];
      if(!state.rareDecorations.includes(deco))state.rareDecorations.push(deco);
      save();setTimeout(()=>{sceneMessage(`Claw machine prize: ${deco}!`);renderLoot()},900);
    }
  }

  function renderFocusTools(){
    if(!$('dailyGoalInput'))return;$('dailyGoalInput').value=state.dailyGoal;$('weeklyGoalInput').value=state.weeklyGoal;$('timerStyleSelect').value=state.timerStyle;$('reminderInput').value=state.reminder;$('soundscapeSelect').value=state.soundscape;renderPresets();renderChallenge();renderReports();applyTimerStyle();
  }
  function applyTimerStyle(){const focus=$('focusPage');if(!focus)return;focus.classList.remove('timer-style-digital','timer-style-soft','timer-style-neon','timer-style-minimal');focus.classList.add('timer-style-'+state.timerStyle)}
  function renderPresets(){const el=$('presetList');if(!el)return;el.innerHTML='';state.taskPresets.forEach((p,i)=>{const row=document.createElement('div');row.className='preset-item';row.innerHTML=`<span>${escapeHtml(p)}</span>`;const use=document.createElement('button');use.className='secondary';use.textContent='Use';use.addEventListener('click',()=>{$('task').value='custom';$('customTaskRow').classList.remove('hidden');$('customTaskInput').value=p;document.querySelector('[data-page="focus"]').click()});const del=document.createElement('button');del.className='secondary';del.textContent='Remove';del.addEventListener('click',()=>{state.taskPresets.splice(i,1);save();renderPresets()});row.append(use,del);el.appendChild(row)});
  }
  function generateChallenge(){const options=[['Complete one 25-minute focus session',25],['Complete two 15-minute focus sessions',30],['Focus for 45 total minutes today',45],['Complete a reading task for 20 minutes',20],['Complete a 60-minute deep-focus session',60]];const o=options[Math.floor(Math.random()*options.length)];state.challenge={text:o[0],target:o[1],progress:0,date:dateKey()};save();renderChallenge()}
  function renderChallenge(){const el=$('challengeText');if(!el)return;if(!state.challenge||state.challenge.date!==dateKey())generateChallenge();el.textContent=`${state.challenge.text} — ${Math.floor(state.challenge.progress||0)}/${state.challenge.target} minutes`}
  function todayMinutes(){return state.focusHistory.filter(x=>x.date===dateKey()).reduce((a,b)=>a+b.minutes,0)}
  function periodMinutes(days){const cutoff=Date.now()-days*86400000;return state.focusHistory.filter(x=>new Date(x.iso).getTime()>=cutoff).reduce((a,b)=>a+b.minutes,0)}
  function renderReports(){
    const summary=$('reportSummary');if(!summary)return;const today=todayMinutes(),week=periodMinutes(7),month=periodMinutes(30);summary.innerHTML=`<div class="premium-stat"><strong>${Math.round(today)}</strong>Today / ${state.dailyGoal}</div><div class="premium-stat"><strong>${Math.round(week)}</strong>7 days / ${state.weeklyGoal}</div><div class="premium-stat"><strong>${Math.round(month)}</strong>30 days</div><div class="premium-stat"><strong>${state.focusHistory.length}</strong>Sessions</div>`;
    const heat=$('heatmap');heat.innerHTML='';for(let i=55;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dateKey(d),mins=state.focusHistory.filter(x=>x.date===key).reduce((a,b)=>a+b.minutes,0),cell=document.createElement('div');cell.className='heat-day '+(mins>=60?'l4':mins>=30?'l3':mins>=10?'l2':mins>0?'l1':'');cell.title=`${key}: ${Math.round(mins)} minutes`;heat.appendChild(cell)}
    const list=$('historyList');list.innerHTML='';state.focusHistory.slice(-12).reverse().forEach(x=>{const row=document.createElement('div');row.className='history-item';row.innerHTML=`<span><strong>${escapeHtml(x.task)}</strong><br><span class="muted">${x.date}</span></span><span>${Math.round(x.minutes)} min</span>`;list.appendChild(row)});if(!state.focusHistory.length)list.innerHTML='<p class="muted">Complete a focus session to start your reports.</p>';
  }

  let audioCtx=null,audioNodes=[];
  function stopSoundscape(){audioNodes.forEach(n=>{try{n.stop?.();n.disconnect?.()}catch{}});audioNodes=[];if(audioCtx){audioCtx.close().catch(()=>{});audioCtx=null}state.soundscape='off';save();if($('soundscapeSelect'))$('soundscapeSelect').value='off'}
  function startSoundscape(name){stopSoundscape();if(name==='off')return;const C=window.AudioContext||window.webkitAudioContext;if(!C){sceneMessage('Audio is not supported in this browser.');return}audioCtx=new C();const length=audioCtx.sampleRate*2,buffer=audioCtx.createBuffer(1,length,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=Math.random()*2-1;const src=audioCtx.createBufferSource();src.buffer=buffer;src.loop=true;const filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();const settings={rain:['highpass',900,.055],forest:['bandpass',1800,.025],fireplace:['lowpass',900,.045],ocean:['lowpass',550,.065],train:['bandpass',180,.055],library:['lowpass',1200,.018],crickets:['highpass',3200,.018],spaceship:['lowpass',260,.05]}[name]||['lowpass',700,.03];filter.type=settings[0];filter.frequency.value=settings[1];gain.gain.value=settings[2];src.connect(filter).connect(gain).connect(audioCtx.destination);src.start();audioNodes.push(src,filter,gain);if(['fireplace','crickets','spaceship','train'].includes(name)){const osc=audioCtx.createOscillator(),og=audioCtx.createGain();osc.type=name==='spaceship'?'sine':name==='crickets'?'square':'triangle';osc.frequency.value=name==='crickets'?3400:name==='train'?72:110;og.gain.value=name==='crickets'?.008:.015;osc.connect(og).connect(audioCtx.destination);osc.start();audioNodes.push(osc,og)}state.soundscape=name;save()}

  function renderLoot(){
    if(!$('premiumLuckBar'))return;$('premiumLuckBar').style.width=state.premiumLuck+'%';$('premiumLuckText').textContent=state.premiumLuck+'%';$('premiumLuckDescription').textContent=`A ${Math.floor(state.premiumLuck/10)}% small bonus is applied to Premium chest rolls.`;$('eggCount').textContent=state.eggs;$('premiumEggs').textContent=state.eggs;$('shinyFruitCount').textContent=state.shinyFruit;$('badgeShelf').innerHTML=state.badges.length?state.badges.map(x=>`<span class="collectible">${escapeHtml(x)}</span>`).join(''):'<span class="muted">No badges yet</span>';$('decorationShelf').innerHTML=state.rareDecorations.length?state.rareDecorations.map(x=>`<span class="collectible">${escapeHtml(x)}</span>`).join(''):'<span class="muted">No rare decorations yet</span>';
  }
  function hatchEgg(){if(!premiumUnlocked()||state.eggs<=0){$('hatchResult').textContent='You need a mystery egg from a long focus session.';return}state.eggs--;const locked=Object.keys(companions).filter(k=>k!=='none'&&!state.unlockedCompanions.includes(k));if(!locked.length){state.coins+=40;$('hatchResult').textContent='All friends are unlocked, so the egg contained 40 coins.'}else{const key=locked[Math.floor(Math.random()*locked.length)];state.unlockedCompanions.push(key);state.companion=key;$('hatchResult').textContent=`Hatched: ${companions[key].name}!`}save();renderCompanions();renderLoot();renderPremiumScene()}

  function renderCompanions(){
    const grid=$('companionGrid');if(!grid)return;grid.innerHTML='';Object.entries(companions).forEach(([key,c])=>{const unlocked=key==='none'||state.unlockedCompanions.includes(key);const card=document.createElement('div');card.className='companion-card';card.innerHTML=`<div class="companion-preview">${key==='none'?'<span class="muted">Empty</span>':companionSvg(key)}</div><strong>${c.name}</strong><p class="muted">${unlocked?'Unlocked':'Hatch from a mystery egg'}</p>`;const b=document.createElement('button');b.className='secondary';b.textContent=state.companion===key?'Following':unlocked?'Choose':'Locked';b.disabled=!unlocked||state.companion===key;b.addEventListener('click',()=>{state.companion=key;save();renderCompanions();renderPremiumScene()});card.appendChild(b);grid.appendChild(card)});
  }

  function grantPremiumStarterTickets(){
    if(premiumUnlocked()&&!state.premiumStarterTicketsGranted){
      state.tickets+=10;
      state.premiumStarterTicketsGranted=true;
      save();
    }
  }
  function renderMiniGames(){
    grantPremiumStarterTickets();
    const grid=$('miniGameGrid');if(!grid)return;grid.innerHTML='';
    Object.entries(miniGames).forEach(([key,g])=>{
      const card=document.createElement('div');card.className='minigame-card';
      const runs=state.miniGameRuns[key]||0;
      card.innerHTML=`${entitlementLockHtml()}<div class="minigame-art game-art-${key}"><span></span></div><h3>${g.name}</h3><p class="muted">${g.desc}</p><p>Best: <strong>${state.miniGameBest[key]||0}</strong> · Plays: ${runs}</p>`;
      const b=document.createElement('button');b.className='primary';
      b.textContent=state.tickets>0?'Play — 1 ticket':'Earn a ticket first';
      b.disabled=!premiumUnlocked()||state.tickets<=0;
      b.addEventListener('click',()=>launchMiniGame(key));
      card.appendChild(b);grid.appendChild(card);
    });
    $('gameTicketCount').textContent=state.tickets;$('premiumTickets').textContent=state.tickets;
    const notice=$('miniGameNotice');
    if(notice)notice.textContent=state.tickets>0?`You have ${state.tickets} ticket${state.tickets===1?"":"s"}. Closing a game after it starts still uses its ticket.`:'Complete a focus session to earn more tickets.';
  }

  let activeMiniGameModal=null;
  function addGameCleanup(modal,fn){modal._gameCleanup=modal._gameCleanup||[];modal._gameCleanup.push(fn)}
  function runGameCleanup(modal){
    (modal?._gameCleanup||[]).splice(0).forEach(fn=>{try{fn()}catch{}});
  }
  function closeMiniGame(modal){
    if(!modal)return;
    runGameCleanup(modal);
    modal.remove();
    if(activeMiniGameModal===modal)activeMiniGameModal=null;
  }
  function gameModalBase(key){
    if(activeMiniGameModal)closeMiniGame(activeMiniGameModal);
    const modal=document.createElement('div');modal.className='minigame-modal';modal.dataset.gameKey=key;
    modal.innerHTML=`<div class="minigame-box"><div class="row"><div><h2>${miniGames[key].name}</h2><p class="muted">${miniGames[key].desc}</p></div><button class="secondary" data-close-game>Close</button></div><div class="game-progress-shell"><div id="gameProgressBar"></div></div><div id="gameStatus" class="premium-banner">Get ready!</div><div id="gameArea" class="game-area"></div><div id="gameEndActions" class="game-end-actions"></div></div>`;
    modal.querySelector('[data-close-game]').addEventListener('click',()=>closeMiniGame(modal));
    modal.addEventListener('click',e=>{if(e.target===modal)closeMiniGame(modal)});
    document.body.appendChild(modal);activeMiniGameModal=modal;return modal;
  }
  function setGameProgress(modal,value){
    const bar=modal.querySelector('#gameProgressBar');if(bar)bar.style.width=clamp(value,0,100)+'%';
  }
  function finishMiniGame(key,score,message,modal){
    if(!modal||modal.dataset.finished==='1')return;
    modal.dataset.finished='1';runGameCleanup(modal);
    score=Math.max(0,Math.round(score));
    state.miniGameBest[key]=Math.max(state.miniGameBest[key]||0,score);
    state.miniGameRuns[key]=(state.miniGameRuns[key]||0)+1;
    const coins=Math.max(2,Math.floor(score/2));
    state.coins+=coins;save();
    modal.querySelector('#gameStatus').innerHTML=`${escapeHtml(message)} Score: <strong>${score}</strong>. Earned ${coins} coins.`;
    setGameProgress(modal,100);
    const actions=modal.querySelector('#gameEndActions');
    const again=document.createElement('button');again.className='primary';again.textContent=state.tickets>0?'Play again — 1 ticket':'No tickets left';again.disabled=state.tickets<=0;
    again.addEventListener('click',()=>{closeMiniGame(modal);launchMiniGame(key)});
    const close=document.createElement('button');close.className='secondary';close.textContent='Done';close.addEventListener('click',()=>closeMiniGame(modal));
    actions.replaceChildren(again,close);
    renderMiniGames();update();
  }
  function launchMiniGame(key){
    if(!miniGames[key]||!premiumUnlocked()||state.tickets<=0)return;
    state.tickets--;save();renderMiniGames();
    const modal=gameModalBase(key),area=modal.querySelector('#gameArea'),status=modal.querySelector('#gameStatus');
    status.textContent='Game started!';

    if(key==='fruitCatch'){
      let score=0,time=15;
      const target=document.createElement('button');target.className='game-target';target.setAttribute('aria-label','Catch the fruit');area.appendChild(target);
      const move=()=>{target.style.left=(4+Math.random()*82)+'%';target.style.top=(8+Math.random()*68)+'%'};
      target.addEventListener('pointerdown',e=>{e.preventDefault();score++;target.classList.remove('caught');void target.offsetWidth;target.classList.add('caught');move();status.textContent=`Fruit caught: ${score} · ${time}s left`});
      move();
      const iv=setInterval(()=>{time--;setGameProgress(modal,time/15*100);status.textContent=`Fruit caught: ${score} · ${time}s left`;if(time<=0)finishMiniGame(key,score*6,'Time is up!',modal)},1000);
      addGameCleanup(modal,()=>clearInterval(iv));return;
    }

    if(key==='wheelRacing'){
      let taps=0;const target=30;
      area.innerHTML='<div class="race-track"><div id="raceRunner" class="race-runner"><span></span></div><div class="race-finish"></div></div><button id="raceTap" class="primary game-big-button">RUN!</button>';
      const tap=area.querySelector('#raceTap'),runner=area.querySelector('#raceRunner');
      tap.addEventListener('pointerdown',e=>{e.preventDefault();taps++;const pct=Math.min(92,taps/target*92);runner.style.left=pct+'%';setGameProgress(modal,taps/target*100);status.textContent=`${taps}/${target} pushes`;if(taps>=target){tap.disabled=true;finishMiniGame(key,100,'Nibbles reached the finish line!',modal)}});
      return;
    }

    if(key==='rhythmDance'){
      let score=0,round=0,active=false,ended=false;
      area.innerHTML='<button id="rhythmPad" class="rhythm-pad">WAIT</button><p class="game-help">Tap only while the pad says TAP.</p>';
      const pad=area.querySelector('#rhythmPad');
      pad.addEventListener('pointerdown',e=>{e.preventDefault();if(ended)return;if(active){score+=10;active=false;pad.classList.remove('beat');pad.textContent='GREAT';}else{score=Math.max(0,score-4);pad.textContent='TOO EARLY'}status.textContent=`Score ${score} · Beat ${round}/12`});
      const nextBeat=()=>{
        if(modal.dataset.finished==='1'||ended)return;
        if(round>=12){ended=true;pad.disabled=true;finishMiniGame(key,score,'Dance complete!',modal);return}
        const wait=setTimeout(()=>{
          round++;active=true;pad.classList.add('beat');pad.textContent='TAP';setGameProgress(modal,round/12*100);
          const windowTimer=setTimeout(()=>{if(active){active=false;pad.classList.remove('beat');pad.textContent='MISSED'}nextBeat()},620);
          addGameCleanup(modal,()=>clearTimeout(windowTimer));
        },450+Math.random()*500);
        addGameCleanup(modal,()=>clearTimeout(wait));
      };
      nextBeat();return;
    }

    if(key==='hamsterMaze'){
      const size=6,walls=new Set([1,7,8,10,13,16,19,20,22,25,28]),goal=35;let pos=0,moves=0;
      area.innerHTML='<div id="maze" class="maze-grid maze-six"></div><div class="maze-controls"><button data-move="-6" class="secondary">Up</button><button data-move="-1" class="secondary">Left</button><button data-move="1" class="secondary">Right</button><button data-move="6" class="secondary">Down</button></div>';
      const draw=()=>{const g=area.querySelector('#maze');g.innerHTML='';for(let i=0;i<size*size;i++){const c=document.createElement('div');c.className='maze-cell'+(walls.has(i)?' wall':'')+(i===pos?' player':'')+(i===goal?' goal':'');if(i===pos)c.textContent='●';if(i===goal)c.textContent='★';g.appendChild(c)}};
      area.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{
        const delta=Number(b.dataset.move),n=pos+delta;
        const wraps=(delta===1&&pos%size===size-1)||(delta===-1&&pos%size===0);
        if(n>=0&&n<size*size&&!walls.has(n)&&!wraps){pos=n;moves++;setGameProgress(modal,pos/goal*100)}
        draw();status.textContent=`Moves: ${moves}`;
        if(pos===goal){area.querySelectorAll('button').forEach(x=>x.disabled=true);finishMiniGame(key,Math.max(40,130-moves*3),'Maze solved!',modal)}
      }));draw();return;
    }

    if(key==='memoryMatch'){
      const symbols=['●','▲','★','◆','♥','☀'];const vals=[...symbols,...symbols].sort(()=>Math.random()-.5);
      let first=null,lock=false,matches=0,moves=0;
      area.innerHTML='<div id="memory" class="memory-grid"></div>';
      const g=area.querySelector('#memory');
      vals.forEach(v=>{
        const b=document.createElement('button');b.className='memory-card';b.dataset.value=v;b.innerHTML=`<span>${v}</span>`;
        b.addEventListener('click',()=>{
          if(lock||b.classList.contains('matched')||b===first)return;
          b.classList.add('revealed');
          if(!first){first=b;return}
          moves++;
          if(first.dataset.value===b.dataset.value){
            first.classList.add('matched');b.classList.add('matched');first=null;matches++;
            setGameProgress(modal,matches/6*100);status.textContent=`Pairs ${matches}/6 · Moves ${moves}`;
            if(matches===6)finishMiniGame(key,Math.max(35,130-moves*5),'All pairs matched!',modal);
          }else{
            lock=true;const old=first;
            const timer=setTimeout(()=>{old.classList.remove('revealed');b.classList.remove('revealed');first=null;lock=false},700);
            addGameCleanup(modal,()=>clearTimeout(timer));
          }
        });g.appendChild(b);
      });return;
    }

    if(key==='gardenHarvest'){
      let score=0,remaining=7,time=14;
      const ripe=new Set();while(ripe.size<7)ripe.add(Math.floor(Math.random()*12));
      area.innerHTML='<div id="gardenPlots" class="garden-grid"></div>';
      const grid=area.querySelector('#gardenPlots');
      for(let i=0;i<12;i++){
        const b=document.createElement('button');b.className='garden-plot '+(ripe.has(i)?'ripe':'sprout');b.setAttribute('aria-label',ripe.has(i)?'Ripe plant':'Growing plant');
        b.addEventListener('click',()=>{
          if(b.disabled)return;b.disabled=true;
          if(ripe.has(i)){score+=12;remaining--;b.classList.add('harvested')}else{score=Math.max(0,score-5);b.classList.add('wrong')}
          status.textContent=`Ripe plants left: ${remaining} · Score ${score}`;setGameProgress(modal,(7-remaining)/7*100);
          if(remaining<=0)finishMiniGame(key,score+20,'Garden harvested!',modal);
        });grid.appendChild(b);
      }
      const iv=setInterval(()=>{time--;if(time<=0)finishMiniGame(key,score,'Harvest time ended.',modal)},1000);addGameCleanup(modal,()=>clearInterval(iv));return;
    }

    if(key==='treasureDig'){
      let digs=5,score=0;const treasures=new Set();while(treasures.size<3)treasures.add(Math.floor(Math.random()*12));
      area.innerHTML='<div id="digGrid" class="dig-grid"></div>';const grid=area.querySelector('#digGrid');
      for(let i=0;i<12;i++){
        const b=document.createElement('button');b.className='dig-spot';b.textContent='?';
        b.addEventListener('click',()=>{
          if(b.disabled||digs<=0)return;b.disabled=true;digs--;
          if(treasures.has(i)){score+=25;b.textContent='★';b.classList.add('treasure')}else{b.textContent='·';b.classList.add('empty')}
          status.textContent=`Digs left: ${digs} · Score ${score}`;setGameProgress(modal,(5-digs)/5*100);
          if(digs<=0)finishMiniGame(key,score,score>=50?'You found great treasure!':'Digging finished.',modal);
        });grid.appendChild(b);
      }return;
    }

    if(key==='furnitureRepair'){
      let next=1,score=0;const order=[1,2,3,4,5,6,7,8].sort(()=>Math.random()-.5);
      area.innerHTML='<p class="game-help">Tap the parts from 1 to 8 in order.</p><div id="repairGrid" class="repair-grid"></div>';const grid=area.querySelector('#repairGrid');
      order.forEach(number=>{
        const b=document.createElement('button');b.className='repair-part';b.textContent=number;
        b.addEventListener('click',()=>{
          if(b.disabled)return;
          if(number===next){b.disabled=true;b.classList.add('fixed');score+=12;next++;status.textContent=`Next part: ${next<=8?next:'done'}`;setGameProgress(modal,(next-1)/8*100);if(next===9)finishMiniGame(key,score+10,'Furniture repaired!',modal)}
          else{score=Math.max(0,score-4);b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),250);status.textContent=`Find part ${next} first.`}
        });grid.appendChild(b);
      });return;
    }

    if(key==='cookingChallenge'){
      const ingredients=[['Berry','#d86f91'],['Leaf','#69aa71'],['Sun','#efb84e'],['Water','#62aeda']];
      let round=0,position=0,score=0,sequence=[];
      area.innerHTML='<div id="recipeDisplay" class="recipe-display"></div><div id="ingredientButtons" class="ingredient-grid"></div>';
      const display=area.querySelector('#recipeDisplay'),buttons=area.querySelector('#ingredientButtons');
      ingredients.forEach(([name,color],i)=>{
        const b=document.createElement('button');b.className='ingredient-button';b.style.setProperty('--ingredient',color);b.textContent=name;
        b.addEventListener('click',()=>{
          if(Number(b.dataset.index)===sequence[position]){position++;score+=8;status.textContent=`Correct: ${position}/${sequence.length}`;if(position===sequence.length){round++;setGameProgress(modal,round/3*100);if(round>=3)finishMiniGame(key,score+20,'Recipe completed!',modal);else startRound()}}
          else{score=Math.max(0,score-5);position=0;status.textContent='Wrong ingredient. Start this recipe again.'}
        });b.dataset.index=i;buttons.appendChild(b);
      });
      const startRound=()=>{
        position=0;sequence=Array.from({length:3+round},()=>Math.floor(Math.random()*ingredients.length));
        display.innerHTML=sequence.map(i=>`<span style="--recipe:${ingredients[i][1]}" title="${ingredients[i][0]}"></span>`).join('');
        status.textContent=`Recipe ${round+1}/3: copy the shown order.`;
      };startRound();return;
    }

    if(key==='castleExplore'){
      let opens=0,hasKey=false,score=0;
      const keyDoor=Math.floor(Math.random()*9);let treasureDoor=Math.floor(Math.random()*9);while(treasureDoor===keyDoor)treasureDoor=Math.floor(Math.random()*9);
      area.innerHTML='<p class="game-help">Find the key, then find the treasure. You may open six doors.</p><div id="castleDoors" class="castle-grid"></div>';const grid=area.querySelector('#castleDoors');
      for(let i=0;i<9;i++){
        const b=document.createElement('button');b.className='castle-door';b.textContent='Door';
        b.addEventListener('click',()=>{
          if(b.disabled||opens>=6)return;b.disabled=true;opens++;
          if(i===keyDoor){hasKey=true;score+=25;b.textContent='KEY';b.classList.add('key')}
          else if(i===treasureDoor&&hasKey){score+=75;b.textContent='TREASURE';b.classList.add('treasure');finishMiniGame(key,score,'Castle treasure found!',modal);return}
          else if(i===treasureDoor){b.textContent='LOCKED';b.classList.add('locked')}
          else{b.textContent='EMPTY';b.classList.add('empty')}
          status.textContent=`Doors left: ${6-opens} · ${hasKey?'Key found':'Find the key'}`;setGameProgress(modal,opens/6*100);
          if(opens>=6)finishMiniGame(key,score,hasKey?'The treasure stayed hidden.':'The key stayed hidden.',modal);
        });grid.appendChild(b);
      }return;
    }
  }

  function renderEffects(){
    const effects=['fireworks','confetti','rainbow','stars'];
    const el=$('effectChoices');
    if(el){
      el.innerHTML='';
      effects.forEach(key=>{
        const b=document.createElement('button');
        b.textContent=key[0].toUpperCase()+key.slice(1);
        b.classList.toggle('active',state.completionEffect===key);
        b.disabled=!premiumUnlocked();
        b.addEventListener('click',()=>{
          if(!premiumUnlocked())return;
          state.completionEffect=key;save();renderEffects();showCompletionEffect(key);
        });
        el.appendChild(b);
      });
    }
    const bg=$('backgroundEffectSelect');if(bg){bg.value=state.backgroundEffect;bg.disabled=!premiumUnlocked()}
    const status=$('premiumStatusText');
    if(status)status.textContent=premiumUnlocked()
      ?'Premium is active on this device.'
      :'Premium is locked. Icon choices and other Premium features require Premium.';
    renderAppIconChoices();
  }

  function renderAppIconChoices(){
    const grid=$('appIconGrid');if(!grid)return;grid.innerHTML='';
    Object.entries(premiumAppIcons).forEach(([key,icon])=>{
      const card=document.createElement('button');
      card.type='button';
      card.className='app-icon-card'+(state.appIcon===key?' selected':'');
      card.disabled=!premiumUnlocked();
      card.innerHTML=`${entitlementLockHtml()}<img alt="${escapeHtml(icon.name)} icon preview" src="${svgDataUri(appIconSvg(key,180))}"><strong>${escapeHtml(icon.name)}</strong><span>${state.appIcon===key?'Selected':'Choose icon'}</span>`;
      card.addEventListener('click',()=>chooseAppIcon(key));
      grid.appendChild(card);
    });
    const chosen=premiumAppIcons[state.appIcon]||premiumAppIcons.classic;
    if($('selectedAppIconName'))$('selectedAppIconName').textContent=chosen.name;
    if($('currentAppIconPreview'))$('currentAppIconPreview').src=svgDataUri(appIconSvg(state.appIcon,192));
    if($('nativeIconSupport'))$('nativeIconSupport').textContent=window.HammyNative?.setAppIcon
      ?'Installed-app icon changing is available.'
      :'Web version: this changes the browser-tab icon. A native iOS/Android build is required to change the home-screen icon.';
  }

  async function chooseAppIcon(key){
    if(!premiumUnlocked()||!premiumAppIcons[key])return;
    state.appIcon=key;save();applyAppIcon();renderAppIconChoices();
    if(window.HammyNative?.setAppIcon){
      try{
        await window.HammyNative.setAppIcon({name:key});
        sceneMessage(`${premiumAppIcons[key].name} installed-app icon selected.`);
      }catch(error){
        console.error('Native icon change failed',error);
        sceneMessage('The browser icon changed, but the installed icon could not be changed.');
      }
    }else{
      sceneMessage(`${premiumAppIcons[key].name} selected.`);
    }
  }

  function applyAppIcon(){
    if(!premiumAppIcons[state.appIcon])state.appIcon='classic';
    const uri=svgDataUri(appIconSvg(state.appIcon,192));
    let link=document.querySelector('link[rel="icon"]');
    if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}
    link.type='image/svg+xml';link.href=uri;
    const preview=$('currentAppIconPreview');if(preview)preview.src=uri;
  }

  async function startRealPremiumPurchase(){
    const status=$('paymentStatus');
    if(!window.HammyBilling?.purchase){
      if(status)status.textContent='Real payments need Google Play Billing or Apple StoreKit in a packaged app. No money was charged.';
      return;
    }
    try{
      if(status)status.textContent='Opening the app-store purchase screen…';
      const result=await window.HammyBilling.purchase({productId:state.premiumProductId});
      if(result?.verified===true){
        state.premium=true;state.premiumDemoEntitlement=false;
        localStorage.setItem('hammyPremiumEntitlement','store');
        ensureDefaultRoomSetups();grantPremiumStarterTickets();save();renderPremiumAll();
        if(status)status.textContent='Premium purchase verified and unlocked.';
      }else if(status){
        status.textContent=result?.cancelled?'Purchase cancelled.':'The store did not verify the purchase.';
      }
    }catch(error){
      console.error('Purchase failed',error);
      if(status)status.textContent='Purchase failed. Premium was not unlocked.';
    }
  }

  async function restoreRealPremiumPurchase(){
    const status=$('paymentStatus');
    if(!window.HammyBilling?.restore){
      if(status)status.textContent='Restore becomes available after StoreKit or Google Play Billing is connected.';
      return;
    }
    try{
      if(status)status.textContent='Checking the app store…';
      const result=await window.HammyBilling.restore({productId:state.premiumProductId});
      if(result?.verified===true){
        state.premium=true;state.premiumDemoEntitlement=false;
        localStorage.setItem('hammyPremiumEntitlement','store');
        ensureDefaultRoomSetups();grantPremiumStarterTickets();save();renderPremiumAll();
        if(status)status.textContent='Premium purchase restored.';
      }else if(status)status.textContent='No verified Premium purchase was found.';
    }catch(error){
      console.error('Restore failed',error);
      if(status)status.textContent='Could not restore the purchase.';
    }
  }

  function showCompletionEffect(type=state.completionEffect){const overlay=document.createElement('div');overlay.className='completion-overlay';const count=type==='fireworks'?42:type==='confetti'?60:36;for(let i=0;i<count;i++){const p=document.createElement('span');p.className='fx-piece'+(type==='stars'?' fx-star':'');p.style.setProperty('--x',(Math.random()*900-450)+'px');p.style.setProperty('--y',(Math.random()*700-420)+'px');p.style.setProperty('--r',(Math.random()*720)+'deg');p.style.setProperty('--fx',type==='rainbow'?`hsl(${Math.random()*360} 80% 65%)`:['#ffd66d','#ef7999','#79c4e8','#83c991','#a687df'][i%5]);p.style.left=(20+Math.random()*60)+'%';p.style.top=(30+Math.random()*40)+'%';overlay.appendChild(p)}document.body.appendChild(overlay);setTimeout(()=>overlay.remove(),1800)}
  let loadingShown=false;function showPremiumLoadingOnce(){if(loadingShown)return;loadingShown=true;const el=document.createElement('div');el.className='premium-loading';el.innerHTML='<div><div class="loader-hamster"></div><h2>Opening Hammy Premium House</h2><p>Loading rooms, costumes and friends…</p></div>';document.body.appendChild(el);setTimeout(()=>el.remove(),1600)}

  function activatePremiumDemo(){state.premium=true;state.premiumDemoEntitlement=true;localStorage.setItem('hammyPremiumEntitlement','demo');ensureDefaultRoomSetups();grantPremiumStarterTickets();save();const old=$('premiumBtn');if(old){old.textContent='Premium unlocked';old.disabled=true}renderSkins();renderClothing();renderSettings();renderPremiumAll();say('Premium preview unlocked on this device.')}
  function restorePremium(){if(localStorage.getItem('hammyPremiumEntitlement')==='demo'||state.premiumDemoEntitlement){state.premium=true;ensureDefaultRoomSetups();grantPremiumStarterTickets();save();renderPremiumAll();renderSkins();renderClothing();renderSettings();say('Premium preview restored.')}else say('No saved Premium entitlement was found on this device.')}

  function renderPremiumAll(){
    if(!$('premiumPage'))return;if(premiumUnlocked())ensureDefaultRoomSetups();grantPremiumStarterTickets();$('premiumDays').textContent=state.practiceDays;$('premiumTickets').textContent=state.tickets;$('premiumEggs').textContent=state.eggs;$('premiumLuckText').textContent=state.premiumLuck+'%';$('gameTicketCount').textContent=state.tickets;$('premiumPreviewBtn').textContent=premiumUnlocked()?'Premium active':'Open Premium preview';
    renderPremiumHamsters();renderCustomizer();renderPersonalities();renderPremiumCostumes();renderRoomButtons();renderPremiumFurniture();renderLayoutButtons();renderPremiumScene();renderFocusTools();renderLoot();renderCompanions();renderMiniGames();renderEffects();
    $('weatherSelect').value=state.premiumWeather;$('dayNightSelect').value=state.premiumNight?'night':'day';
  }

  function addPremiumChest(task,minutes){
    state.focusHistory.push({iso:new Date().toISOString(),date:dateKey(),task,minutes});if(state.focusHistory.length>180)state.focusHistory=state.focusHistory.slice(-180);state.tickets+=1+Math.floor(minutes/45);state.premiumLuck=clamp(state.premiumLuck+Math.max(4,Math.floor(minutes/5)),0,100);if(state.challenge&&state.challenge.date===dateKey())state.challenge.progress=clamp((state.challenge.progress||0)+minutes,0,state.challenge.target);
    let chestText='';if(minutes>=25){const luckBonus=Math.floor(state.premiumLuck/10),roll=Math.random()*100+luckBonus+minutes/8;let coins=20,rarity='Uncommon';if(roll>95){coins=100;rarity='Legendary';state.eggs++;if(!state.badges.includes('Legendary Chest'))state.badges.push('Legendary Chest')}else if(roll>72){coins=65;rarity='Epic';state.eggs+=Math.random()<.45?1:0}else if(roll>48){coins=40;rarity='Rare'}state.coins+=coins;if(Math.random()<.22+state.premiumLuck/500){state.shinyFruit++;}if(Math.random()<.18){const deco=['Crystal Poster','Moon Garland','Tiny Trophy','Star Cushion','Rainbow Lamp'][Math.floor(Math.random()*5)];if(!state.rareDecorations.includes(deco))state.rareDecorations.push(deco)}state.premiumLuck=Math.max(0,state.premiumLuck-25);chestText=`<p><strong>Premium ${rarity} chest:</strong> ${coins} bonus coins${state.eggs?' and possible egg progress':''}.</p>`}
    save();const reward=$('reward');if(reward&&!reward.classList.contains('hidden'))reward.insertAdjacentHTML('beforeend',`<p><strong>Premium:</strong> +${1+Math.floor(minutes/45)} mini-game ticket${minutes>=45?'s':''}. Luck meter updated.</p>${chestText}`);showCompletionEffect();renderPremiumAll();
  }

  function ensurePremiumCostumeElements(){
    const layer=document.querySelector('#hamster .clothes');if(!layer)return;
    [['headband','headband']].forEach(([id,cls])=>{if(!$(id)){const el=document.createElement('span');el.id=id;el.className='clothing '+cls;layer.appendChild(el)}});
  }
  const baseNextCostume=nextCostume;nextCostume=function(){return Object.values(clothes).filter(c=>c.days>state.practiceDays&&(!c.premiumOnly||premiumUnlocked())).sort((a,b)=>a.days-b.days)[0]||null};

  // Patch core functions while preserving all free systems.
  const baseUpdate=update;update=function(){ensurePremiumCostumeElements();baseUpdate();const live=$('hamster');if(live){Object.keys(skins).map(premiumSkinClass).filter(Boolean).forEach(cls=>live.classList.remove(cls));[...live.classList].filter(c=>c.startsWith('outfit-')).forEach(c=>live.classList.remove(c));live.classList.toggle('premium-skin',Boolean(skins[state.skin]?.effect));const cls=premiumSkinClass(state.skin);if(cls)live.classList.add(cls);if(state.equipped)live.classList.add('outfit-'+state.equipped);if(state.skin==='custom'){live.style.setProperty('--custom-eye',state.customSkin.eye);live.style.setProperty('--custom-ear',state.customSkin.ear);live.style.setProperty('--custom-cheek',state.customSkin.cheek)}}applyTimerStyle();};
  const baseHamsterPreview=hamsterPreview;hamsterPreview=function(key){const s=skins[key];const special=Boolean(s?.effect);if(!special)return baseHamsterPreview(key);return `<div class="skin-preview"><div class="hamster premium-skin ${premiumSkinClass(key)}" style="position:relative;left:50%;bottom:auto;top:0;--fur:${s.fur};--fur2:${s.fur2};--patch:${s.patch};--custom-eye:${state.customSkin.eye};--custom-ear:${state.customSkin.ear};--custom-cheek:${state.customSkin.cheek};pointer-events:none"><span class="tail"></span><span class="ear l"></span><span class="ear r"></span><span class="body"></span><span class="belly"></span><span class="head"></span><span class="patch"></span><span class="muzzle"></span><span class="eye l"></span><span class="eye r"></span><span class="cheek l"></span><span class="cheek r"></span><span class="nose"></span><span class="mouth"></span><span class="paw l"></span><span class="paw r"></span><span class="leg l"></span><span class="leg r"></span><span class="foot l"></span><span class="foot r"></span></div></div>`};
  const baseRenderClothing=renderClothing;renderClothing=function(){baseRenderClothing();document.querySelectorAll('#clothingGrid .card').forEach(card=>{const title=card.querySelector('strong')?.textContent;const entry=Object.entries(clothes).find(([,c])=>c.name===title);if(!entry)return;const [key,c]=entry;if(c.premiumOnly){const unlocked=premiumUnlocked()&&state.practiceDays>=c.days;const p=card.querySelector('.muted');if(p)p.textContent=!premiumUnlocked()?'Premium required':unlocked?'Premium milestone unlocked':`${Math.max(0,c.days-state.practiceDays)} more practice days`;card.querySelectorAll('button').forEach((b,i)=>{if(i===0){b.disabled=!unlocked||state.equipped===key;b.textContent=state.equipped===key?'Wearing':unlocked?'Wear':'Locked'}});const badge=card.querySelector('.costume-milestone');if(badge)badge.textContent='PREMIUM '+c.days+' DAYS'}})};
  const baseRenderSettings=renderSettings;renderSettings=function(){baseRenderSettings();document.querySelectorAll('#themeGrid .theme-card').forEach(card=>{const name=card.querySelector('strong')?.textContent;const entry=Object.entries(themes).find(([,t])=>t.name===name);if(entry?.[1].premium&&!premiumUnlocked()){card.disabled=true;card.style.opacity='.58';card.title='Premium theme'}})};
  const baseStartFocus=startFocus;startFocus=function(){if(state.reminder)say(state.reminder);baseStartFocus();};
  const baseCompleteFocus=completeFocus;completeFocus=function(){const task=selectedTaskName(),minutes=Math.max(1,total/60),before=state.sessionCount,hidden=[];if(!premiumUnlocked()){Object.values(clothes).filter(c=>c.premiumOnly).forEach(c=>{hidden.push([c,c.days]);c.days=Number.MAX_SAFE_INTEGER})}try{baseCompleteFocus()}finally{hidden.forEach(([c,d])=>c.days=d)}if(state.sessionCount>before&&premiumUnlocked())addPremiumChest(task,minutes);};

  function bindPremiumUi(){
    setupPremiumTabs();$('premiumPreviewBtn').addEventListener('click',activatePremiumDemo);$('unlockRoomsBtn').addEventListener('click',activatePremiumDemo);$('restorePremiumBtn').addEventListener('click',restorePremium);$('restorePremiumAgain').addEventListener('click',restorePremium);$('buyPremiumBtn').addEventListener('click',startRealPremiumPurchase);$('restoreStorePurchaseBtn').addEventListener('click',restoreRealPremiumPurchase);$('applyCustomHamster').addEventListener('click',()=>{if(!premiumUnlocked())return;document.querySelectorAll('[data-custom-color]').forEach(i=>state.customSkin[i.dataset.customColor]=i.value);updateCustomSkinObject();state.skin='custom';save();update();renderSkins();renderPremiumAll();});$('premiumInteractBtn').addEventListener('click',useSelectedFurniture);
    $('weatherSelect').addEventListener('change',e=>{if(!premiumUnlocked())return;state.premiumWeather=e.target.value;save();renderPremiumScene()});$('dayNightSelect').addEventListener('change',e=>{if(!premiumUnlocked())return;state.premiumNight=e.target.value==='night';save();renderPremiumScene()});$('wallColor').addEventListener('input',e=>{if(!premiumUnlocked())return;state.roomColors[state.premiumRoom]={...(state.roomColors[state.premiumRoom]||{}),wall:e.target.value};$('premiumScene').style.setProperty('--room-wall',e.target.value);save()});$('floorColor').addEventListener('input',e=>{if(!premiumUnlocked())return;state.roomColors[state.premiumRoom]={...(state.roomColors[state.premiumRoom]||{}),floor:e.target.value};$('premiumScene').style.setProperty('--room-floor',e.target.value);save()});
    $('decorRotation').addEventListener('input',e=>{const d=state.selectedDecor&&currentRoomDecor()[state.selectedDecor];if(d){d.rotation=Number(e.target.value);save();renderDecorLayer()}});
    $('decorScale').addEventListener('input',e=>{const d=state.selectedDecor&&currentRoomDecor()[state.selectedDecor];if(d){d.scale=Number(e.target.value)/100;save();renderDecorLayer()}});
    $('decorColor').addEventListener('input',e=>{const d=state.selectedDecor&&currentRoomDecor()[state.selectedDecor];if(d){d.color=e.target.value;state.premiumFurnitureColors[d.type]=e.target.value;save();renderDecorLayer();renderPremiumFurniture()}});
    $('decorLayerSelect').addEventListener('change',e=>{const d=state.selectedDecor&&currentRoomDecor()[state.selectedDecor];if(d){d.z=Number(e.target.value);save();renderDecorLayer()}});
    $('removeDecorBtn').addEventListener('click',removeSelectedToStorage);
    $('moveDecorBtn').addEventListener('click',()=>moveSelectedToRoom($('moveDecorRoomSelect').value));
    $('resetRoomBtn').addEventListener('click',resetCurrentRoomToDefault);
    $('applyFocusSettings').addEventListener('click',()=>{if(!premiumUnlocked())return;const mins=clamp(Number($('premiumCustomMinutes').value)||25,1,480),value=mins*60;let opt=[...$('duration').options].find(o=>Number(o.value)===value);if(!opt){opt=document.createElement('option');opt.value=String(value);opt.textContent=`${mins} minutes (Premium custom)`;$('duration').appendChild(opt)}$('duration').value=String(value);remaining=value;timerView();state.timerStyle=$('timerStyleSelect').value;state.dailyGoal=clamp(Number($('dailyGoalInput').value)||30,5,600);state.weeklyGoal=clamp(Number($('weeklyGoalInput').value)||180,10,3000);save();applyTimerStyle();renderReports();document.querySelector('[data-page="focus"]').click()});
    $('addPresetBtn').addEventListener('click',()=>{const v=$('presetInput').value.trim();if(!v)return;if(!state.taskPresets.includes(v))state.taskPresets.push(v);$('presetInput').value='';save();renderPresets()});$('saveReminderBtn').addEventListener('click',()=>{state.reminder=$('reminderInput').value.trim();save();say('Reminder saved.')});$('newChallengeBtn').addEventListener('click',generateChallenge);$('startSoundscapeBtn').addEventListener('click',()=>startSoundscape($('soundscapeSelect').value));$('stopSoundscapeBtn').addEventListener('click',stopSoundscape);$('hatchEggBtn').addEventListener('click',hatchEgg);$('backgroundEffectSelect').addEventListener('change',e=>{state.backgroundEffect=e.target.value;save();renderPremiumScene()});
    const oldPremium=$('premiumBtn');if(oldPremium)oldPremium.addEventListener('click',()=>{state.premiumDemoEntitlement=true;localStorage.setItem('hammyPremiumEntitlement','demo');save();setTimeout(renderPremiumAll,0)});
    $('premiumScene').addEventListener('click',e=>{if(e.target===$('premiumScene')||e.target.classList.contains('scene-floor')||e.target.classList.contains('scene-wall')){state.selectedDecor=null;state.activePremiumFurniture=null;renderDecorLayer();syncDecorControls()}});
  }

  ensureDefaultRoomSetups();buildPremiumPage();ensurePremiumCostumeElements();bindPremiumUi();applyAppIcon();renderSkins();renderClothing();renderSettings();renderPremiumAll();save();
  window.addEventListener('beforeunload',stopSoundscape);
})();

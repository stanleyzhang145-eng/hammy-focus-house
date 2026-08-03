"use strict";

const http=require("http");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const db=require("./db");

const ROOT=__dirname;
const PORT=Number(process.env.PORT)||8080;
const HOST=process.env.HOST||"0.0.0.0";
const MAX_BODY=900*1024;
const CODE_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const WORDS=["MAPLE","RIVER","CLOUD","BERRY","MOSS","SUNNY","PEBBLE","STAR","MEADOW","COZY","LANTERN","APPLE","CLOVER","MOON","NIBBLE","GARDEN"];
const allowedTypes=new Set([
  "bed","sofa","desk","plant","aquarium","tunnel","toybox","bookshelf","lamp","rug","wheel","snack","music","castle",
  "giantWheel","bunkBed","gamingDesk","pool","bubbleBath","cinema","musicStage","capsuleBed","treehouse","aquariumTunnel",
  "kitchenSet","trainSet","clawMachine","playground","portal"
]);
const allowedRooms=new Set(["home","bedroom","kitchen","bathroom","study","music","game","garden","rooftop","aquarium","space","winter","beach"]);
const allowedReactions=new Set(["heart","star","cozy","creative"]);
const allowedReportReasons=new Set(["inappropriate_nickname","personal_information","unsafe_content","spam","other"]);
const rewardCodeCatalog=new Map([
  ["SUMMER27",{
    title:"Summer Coin Gift",
    description:"A sunny thank-you reward.",
    coins:200
  }]
]);

const adminExclusiveCatalog=new Map([
  ["solar_crown",{name:"Solar Crown",icon:"♛",description:"A glowing crown reserved for special Hammy rewards."}],
  ["aurora_aura",{name:"Aurora Aura",icon:"✦",description:"A colourful glow that surrounds the selected hamster."}],
  ["star_trail",{name:"Star Trail",icon:"★",description:"A sparkling star effect for the hamster room."}],
  ["crystal_badge",{name:"Crystal Founder Badge",icon:"◆",description:"A rare collectible badge shown in the Exclusive Collection."}],
  ["golden_trophy",{name:"Golden Focus Trophy",icon:"🏆",description:"A trophy for special events and achievements."}],
  ["neon_frame",{name:"Neon Profile Frame",icon:"▣",description:"A bright exclusive frame for special accounts."}]
]);

const randomEventTemplates=[
  {
    eventType:"coin_shower",
    title:"Coin Shower",
    description:"A surprise shower of shiny Hammy coins is happening!",
    reward:{title:"Coin Shower Reward",coins:100}
  },
  {
    eventType:"fruit_festival",
    title:"Fruit Festival",
    description:"The Hammy kitchen is celebrating with a colourful fruit bundle.",
    reward:{title:"Fruit Festival Bundle",fruits:{apple:3,banana:2,berry:3,mango:1}}
  },
  {
    eventType:"cozy_weekend",
    title:"Cozy Weekend",
    description:"Claim a cozy reward and a rare Solar Crown collectible.",
    reward:{title:"Cozy Weekend Gift",coins:50,exclusiveId:"solar_crown"}
  },
  {
    eventType:"star_drop",
    title:"Star Drop",
    description:"A starry surprise has landed in Hammy Focus House.",
    reward:{title:"Star Drop Gift",coins:75,exclusiveId:"star_trail"}
  },
  {
    eventType:"aurora_night",
    title:"Aurora Night",
    description:"A rare aurora is glowing over every Hammy house.",
    reward:{title:"Aurora Night Gift",exclusiveId:"aurora_aura",fruits:{berry:2}}
  },
  {
    eventType:"focus_festival",
    title:"Focus Festival",
    description:"Celebrate focused practice with coins and a Crystal Founder Badge.",
    reward:{title:"Focus Festival Reward",coins:150,exclusiveId:"crystal_badge"}
  }
];
const unsafeNicknamePatterns=[
  /https?:/i,/www\./i,/@/,/discord/i,/snapchat/i,/instagram/i,/tiktok/i,/telegram/i,
  /\b(?:address|school|phone|email|location)\b/i,
  /\b(?:fuck|shit|bitch|cunt|nigger|nigga|porn|sex)\b/i
];
const rateMap=new Map();
const adminLoginMap=new Map();
const ADMIN_SESSION_SECONDS=30*60;
let databaseReady=false;
let databaseError=null;

function now(){return new Date().toISOString()}
function hash(value){return crypto.createHash("sha256").update(String(value)).digest("hex")}
function randomFrom(alphabet,length){
  const bytes=crypto.randomBytes(length);let output="";
  for(let i=0;i<length;i++)output+=alphabet[bytes[i]%alphabet.length];
  return output;
}
function makePlayerId(){return `HF-${randomFrom(CODE_ALPHABET,4)}-${randomFrom(CODE_ALPHABET,4)}`}
function makeRecoveryCode(){
  const a=WORDS[crypto.randomInt(WORDS.length)];
  const b=WORDS[crypto.randomInt(WORDS.length)];
  const c=WORDS[crypto.randomInt(WORDS.length)];
  return `${a}-${b}-${c}-${randomFrom(CODE_ALPHABET,8)}`;
}
function makeFriendCode(){return randomFrom(CODE_ALPHABET,8)}
function makeAccessToken(){return crypto.randomBytes(36).toString("base64url")}
function normalizePlayerId(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^HF/,"HF").replace(/^HF([A-Z2-9]{4})([A-Z2-9]{4})$/,"HF-$1-$2")}
function normalizeRecovery(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}
function normalizeCode(value){return String(value||"").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,8)}
function normalizeRewardCode(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,24)}
function cleanPlayerIdentifier(value){return String(value||"").trim().toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,24)}
function cleanAdminText(value,max=120){
  return String(value||"").trim().replace(/[<>]/g,"").replace(/\s+/g," ").slice(0,max);
}
function safeIsoDate(value,fallback){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?fallback:date.toISOString();
}
function adminRewardCodeView(row){
  if(!row)return null;
  return {
    code:row.code,title:row.title,description:row.description,
    reward:row.reward_data||{},
    maxRedemptions:row.max_redemptions==null?null:Number(row.max_redemptions),
    redemptionCount:Number(row.redemption_count)||0,
    startsAt:row.starts_at,endsAt:row.ends_at,status:row.status,
    createdAt:row.created_at
  };
}
function announcementView(row){
  if(!row)return null;
  return {
    id:row.id,title:row.title,message:row.message,priority:row.priority,
    startsAt:row.starts_at,endsAt:row.ends_at,status:row.status,
    createdAt:row.created_at
  };
}
function cleanAdminReward(input){
  const reward=input&&typeof input==="object"?input:{};
  const exclusiveId=adminExclusiveCatalog.has(String(reward.exclusiveId||""))?String(reward.exclusiveId):null;
  return {
    title:cleanAdminText(reward.title||"Admin Gift",80)||"Admin Gift",
    coins:safeNumber(reward.coins,0,1000000,0),
    fruits:{
      apple:safeNumber(reward.fruits?.apple,0,100,0),
      banana:safeNumber(reward.fruits?.banana,0,100,0),
      berry:safeNumber(reward.fruits?.berry,0,100,0),
      mango:safeNumber(reward.fruits?.mango,0,100,0)
    },
    exclusiveId
  };
}
function publicEvent(event){
  if(!event)return null;
  return {
    id:event.id,
    eventType:event.event_type,
    title:event.title,
    description:event.description,
    reward:event.reward_data||{},
    startsAt:event.starts_at,
    endsAt:event.ends_at,
    status:event.status,
    claimed:Boolean(event.claimed),
    claimedAt:event.claimed_at||null,
    claimCount:Number(event.claim_count)||0
  };
}


function safeEqual(left,right){
  const a=Buffer.from(String(left||""));
  const b=Buffer.from(String(right||""));
  if(a.length!==b.length)return false;
  return crypto.timingSafeEqual(a,b);
}
function adminSecret(){
  return String(process.env.ADMIN_ACCESS_CODE||process.env.ADMIN_KEY||"");
}
function encodeBase64Url(value){
  return Buffer.from(value).toString("base64url");
}
function signAdminPayload(payloadText){
  return crypto.createHmac("sha256",adminSecret()).update(payloadText).digest("base64url");
}
function createAdminSession(){
  const payload={
    role:"hammy-admin",
    issuedAt:Date.now(),
    expiresAt:Date.now()+(ADMIN_SESSION_SECONDS*1000),
    nonce:crypto.randomBytes(12).toString("base64url")
  };
  const encoded=encodeBase64Url(JSON.stringify(payload));
  return `${encoded}.${signAdminPayload(encoded)}`;
}
function verifyAdminSession(token){
  const parts=String(token||"").split(".");
  if(parts.length!==2||!adminSecret())return false;
  const [encoded,signature]=parts;
  const expected=signAdminPayload(encoded);
  if(!safeEqual(signature,expected))return false;
  try{
    const payload=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));
    return payload.role==="hammy-admin"&&Number(payload.expiresAt)>Date.now();
  }catch{return false}
}
function adminAuthorized(req){
  const directKey=String(req.headers["x-admin-key"]||"");
  if(directKey&&adminSecret()&&safeEqual(directKey,adminSecret()))return true;
  const explicitSession=String(req.headers["x-admin-session"]||"");
  const authorization=String(req.headers.authorization||"");
  const bearer=authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
  return verifyAdminSession(explicitSession||bearer);
}
function clientAddress(req){
  const forwarded=String(req.headers["x-forwarded-for"]||"")
    .split(",")[0].trim();
  const realIp=String(req.headers["x-real-ip"]||"").trim();
  return forwarded||realIp||req.socket.remoteAddress||"unknown";
}
function adminLoginEntry(req){
  const key=clientAddress(req);
  const current=Date.now();
  const windowMs=15*60*1000;
  let entry=adminLoginMap.get(key);
  if(!entry||current-entry.start>windowMs){
    entry={start:current,failures:0,blockedUntil:0};
    adminLoginMap.set(key,entry);
  }
  return {key,entry,current};
}
function adminLoginLimited(req){
  const {entry,current}=adminLoginEntry(req);
  return Number(entry.blockedUntil||0)>current;
}
function adminRetrySeconds(req){
  const {entry,current}=adminLoginEntry(req);
  return Math.max(0,Math.ceil((Number(entry.blockedUntil||0)-current)/1000));
}
function recordAdminFailure(req){
  const {key,entry,current}=adminLoginEntry(req);
  entry.failures++;
  // Shorter cooldown, while still slowing repeated guessing.
  if(entry.failures>=5)entry.blockedUntil=current+(2*60*1000);
  adminLoginMap.set(key,entry);
  return {
    failures:entry.failures,
    attemptsRemaining:Math.max(0,5-entry.failures),
    retryAfterSeconds:Math.max(0,Math.ceil((entry.blockedUntil-current)/1000))
  };
}
function clearAdminFailures(req){
  adminLoginMap.delete(clientAddress(req));
}

function json(res,status,data,extraHeaders={}){
  const body=JSON.stringify(data);
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Content-Length":Buffer.byteLength(body),
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"Content-Type, Authorization, X-Admin-Key, X-Admin-Session",
    "Access-Control-Allow-Methods":"GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Cache-Control":"no-store",
    ...extraHeaders
  });
  res.end(body);
}

function rateLimited(req){
  const ip=req.socket.remoteAddress||"unknown";
  const current=Date.now(),windowMs=60_000;
  const entry=rateMap.get(ip);
  if(!entry||current-entry.start>windowMs){rateMap.set(ip,{start:current,count:1});return false}
  entry.count++;
  return entry.count>180;
}

function parseBody(req){
  return new Promise((resolve,reject)=>{
    let size=0;const chunks=[];
    req.on("data",chunk=>{
      size+=chunk.length;
      if(size>MAX_BODY){reject(Object.assign(new Error("Request is too large."),{status:413}));req.destroy();return}
      chunks.push(chunk);
    });
    req.on("end",()=>{
      try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString("utf8")):{})}
      catch{reject(Object.assign(new Error("Invalid JSON."),{status:400}))}
    });
    req.on("error",reject);
  });
}

function requireDatabase(){
  if(databaseReady)return;
  const error=new Error("Cloud database is not configured yet. Connect DATABASE_URL in Render.");
  error.status=503;error.code="DATABASE_REQUIRED";throw error;
}

async function optionalAuth(req){
  if(!databaseReady)return null;
  const value=String(req.headers.authorization||"");
  if(!value.startsWith("Bearer "))return null;
  const token=value.slice(7).trim();if(!token)return null;
  const session=await db.getSession(hash(token));
  return session?{userId:session.user_id,deviceId:session.device_id}:null;
}

async function requireAuth(req){
  requireDatabase();
  const auth=await optionalAuth(req);
  if(!auth){const error=new Error("Sign in to your Hammy cloud account first.");error.status=401;throw error}
  return auth;
}

function safeNumber(value,min,max,fallback=0){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
}
function safeColor(value,fallback){
  return /^#[0-9a-f]{6}$/i.test(String(value||""))?String(value):fallback;
}
function cleanNickname(value){
  const name=String(value||"").trim().replace(/\s+/g," ");
  if(!/^[A-Za-z0-9][A-Za-z0-9 ]{1,14}[A-Za-z0-9]$/.test(name)){
    const error=new Error("Nickname must be 3–16 letters, numbers, or spaces.");error.status=400;throw error;
  }
  if(unsafeNicknamePatterns.some(pattern=>pattern.test(name))){
    const error=new Error("That nickname is not allowed. Do not include contact details or unsafe words.");error.status=400;throw error;
  }
  return name;
}
function cleanJson(value,depth=0){
  if(depth>12)return null;
  if(value===null||["string","number","boolean"].includes(typeof value))return value;
  if(Array.isArray(value))return value.slice(0,500).map(item=>cleanJson(item,depth+1));
  if(typeof value!=="object")return null;
  const output={};
  for(const [key,item] of Object.entries(value)){
    if(["__proto__","prototype","constructor"].includes(key))continue;
    output[String(key).slice(0,80)]=cleanJson(item,depth+1);
  }
  return output;
}
function cleanBase(input,{forceHome=false}={}){
  const base=input&&typeof input==="object"?input:{};
  const items=Array.isArray(base.items)?base.items.slice(0,30):[];
  return {
    room:forceHome?"home":(allowedRooms.has(base.room)&&base.room!=="home"?base.room:"bedroom"),
    wall:safeColor(base.wall,forceHome?"#eee4ff":"#e7ddf8"),
    floor:safeColor(base.floor,forceHome?"#e6c59d":"#d4b98d"),
    items:items.filter(item=>item&&allowedTypes.has(item.type)).map(item=>({
      type:item.type,
      x:safeNumber(item.x,4,96,50),
      y:safeNumber(item.y,12,92,60),
      scale:safeNumber(item.scale,.5,1.6,1),
      rotation:safeNumber(item.rotation,-180,180,0),
      color:safeColor(item.color,"#a88fd5")
    }))
  };
}
function cleanProfile(input,premiumActive){
  if(!input||typeof input!=="object"){const e=new Error("Invalid profile.");e.status=400;throw e}
  const stats=input.stats||{};
  const homeBase=cleanBase(input.homeBase||input.base,{forceHome:true});
  const seen=new Set();
  const premiumRooms=premiumActive&&Array.isArray(input.premiumRooms)
    ?input.premiumRooms.slice(0,12).map(room=>cleanBase(room)).filter(room=>{
      if(!allowedRooms.has(room.room)||room.room==="home"||seen.has(room.room))return false;
      seen.add(room.room);return true;
    })
    :[];
  const profileData={
    nickname:cleanNickname(input.nickname),
    visibility:input.visibility==="public"?"public":"unlisted",
    skin:String(input.skin||"white").replace(/[^A-Za-z0-9_-]/g,"").slice(0,32)||"white",
    skinColors:{
      fur:safeColor(input.skinColors?.fur,"#ffffff"),
      fur2:safeColor(input.skinColors?.fur2,"#f7f5f1"),
      patch:input.skinColors?.patch==="transparent"?"transparent":safeColor(input.skinColors?.patch,"#eadffc")
    },
    costume:String(input.costume||"No costume").replace(/[<>]/g,"").slice(0,40),
    premium:Boolean(premiumActive),
    stats:{
      practiceDays:safeNumber(stats.practiceDays,0,100000),
      totalFocusMinutes:safeNumber(stats.totalFocusMinutes,0,10000000),
      streak:safeNumber(stats.streak,0,100000),
      lootLevel:safeNumber(stats.lootLevel,1,100000,1),
      sessionCount:safeNumber(stats.sessionCount,0,1000000)
    }
  };
  return {profileData,homeBase,premiumRooms};
}

function formatSave(save){
  if(!save)return null;
  return {
    revision:Number(save.revision)||0,
    state:save.state||{},
    deviceId:save.device_id,
    updatedAt:save.updated_at
  };
}
async function accountPayload(userId,{includeSave=false}={}){
  const summary=await db.accountSummary(userId);
  if(!summary.user)return null;
  const profile=summary.profile;
  return {
    playerId:summary.user.player_id,
    premium:{active:Boolean(summary.entitlement?.active),source:summary.entitlement?.source||"none"},
    cloud:{
      revision:Number(summary.save?.revision)||0,
      updatedAt:summary.save?.updated_at||null,
      hasSave:Boolean(summary.save)
    },
    profile:profile?{
      code:profile.code,nickname:profile.nickname,visibility:profile.visibility,updatedAt:profile.updatedAt
    }:null,
    ...(includeSave?{save:formatSave(summary.save)}:{})
  };
}
async function createUniquePlayer(){
  for(let attempt=0;attempt<100;attempt++){
    const playerId=makePlayerId();
    if(!(await db.findUserByPlayerId(playerId)))return playerId;
  }
  throw new Error("Could not create a unique player ID.");
}

function contentType(file){
  const ext=path.extname(file).toLowerCase();
  return ({
    ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",
    ".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json; charset=utf-8",
    ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".txt":"text/plain; charset=utf-8",
    ".sql":"text/plain; charset=utf-8"
  })[ext]||"application/octet-stream";
}
function serveStatic(req,res,urlPath){
  let pathname=decodeURIComponent(urlPath.split("?")[0]);
  if(pathname==="/")pathname="/index.html";
  const safePath=path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const file=path.join(ROOT,safePath);
  if(!file.startsWith(ROOT)||file.includes("server-data")||file.endsWith("schema.sql")||file.endsWith("db.js")){
    return json(res,404,{error:"Not found."});
  }
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile())return json(res,404,{error:"Not found."});
    const updateFile=/\.(?:html|js|css)$/.test(file);
    res.writeHead(200,{
      "Content-Type":contentType(file),
      "Cache-Control":updateFile?"no-store":"public, max-age=3600",
      "X-Content-Type-Options":"nosniff",
      "Referrer-Policy":"same-origin"
    });
    fs.createReadStream(file).pipe(res);
  });
}

async function handleApi(req,res,url){
  if(req.method==="GET"&&url.pathname==="/api/health/ready"){
    if(!databaseReady){
      return json(res,503,{
        ok:false,
        version:24.1,
        databaseReady:false,
        error:String(databaseError?.message||"Database is not ready.")
      });
    }
    return json(res,200,{ok:true,version:24.1,databaseReady:true,databaseMode:db.mode()});
  }

  if(req.method==="GET"&&url.pathname==="/api/health"){
    return json(res,200,{
      ok:true,name:"Hammy Cloud server",version:24.1,
      databaseReady,databaseMode:databaseReady?db.mode():"not-configured",
      setupRequired:!databaseReady,
      databaseError:databaseReady?null:String(databaseError?.message||"DATABASE_URL is missing")
    });
  }

  if(req.method==="POST"&&url.pathname==="/api/account/guest"){
    requireDatabase();
    const body=await parseBody(req);
    const deviceId=String(body.deviceId||"device").slice(0,80);
    const id=crypto.randomUUID();
    const playerId=await createUniquePlayer();
    const recoveryCode=makeRecoveryCode();
    await db.createUser({id,playerId,recoveryHash:hash(normalizeRecovery(recoveryCode))});
    const token=makeAccessToken();
    await db.createSession({tokenHash:hash(token),userId:id,deviceId});

    if(body.premiumMode==="demo"&&process.env.ALLOW_PREMIUM_PREVIEW!=="false"){
      await db.setEntitlement(id,{active:true,source:"demo"});
    }
    const entitlement=await db.getEntitlement(id);
    if(body.state&&typeof body.state==="object"){
      const state=cleanJson(body.state);
      state.premium=Boolean(entitlement.active);
      state.premiumDemoEntitlement=entitlement.source==="demo";
      await db.saveCloud(id,{baseRevision:0,deviceId,state,force:true});
    }
    const account=await accountPayload(id,{includeSave:true});
    return json(res,201,{accessToken:token,recoveryCode,account});
  }

  if(req.method==="POST"&&url.pathname==="/api/account/sign-in"){
    requireDatabase();
    const body=await parseBody(req);
    const playerId=normalizePlayerId(body.playerId);
    const recovery=normalizeRecovery(body.recoveryCode);
    const user=await db.findUserByPlayerId(playerId);
    if(!user||!recovery||hash(recovery)!==user.recovery_hash){
      return json(res,401,{error:"Player ID or recovery code is incorrect."});
    }
    const token=makeAccessToken();
    await db.createSession({tokenHash:hash(token),userId:user.id,deviceId:String(body.deviceId||"device").slice(0,80)});
    return json(res,200,{accessToken:token,account:await accountPayload(user.id,{includeSave:true})});
  }

  if(req.method==="GET"&&url.pathname==="/api/account/me"){
    const auth=await requireAuth(req);
    return json(res,200,{account:await accountPayload(auth.userId,{includeSave:false})});
  }

  if(req.method==="DELETE"&&url.pathname==="/api/account"){
    const auth=await requireAuth(req);
    const body=await parseBody(req);
    if(String(body.confirm||"")!=="DELETE"){
      return json(res,400,{error:'Type "DELETE" to confirm account deletion.'});
    }
    await db.deleteUser(auth.userId);
    return json(res,200,{deleted:true});
  }

  if(req.method==="GET"&&url.pathname==="/api/cloud/save"){
    const auth=await requireAuth(req);
    const save=await db.getCloudSave(auth.userId);
    const entitlement=await db.getEntitlement(auth.userId);
    const formatted=formatSave(save);
    if(formatted?.state){
      formatted.state.premium=Boolean(entitlement.active);
      formatted.state.premiumDemoEntitlement=entitlement.source==="demo";
    }
    return json(res,200,{save:formatted,premium:{active:Boolean(entitlement.active),source:entitlement.source||"none"}});
  }

  if(req.method==="PUT"&&url.pathname==="/api/cloud/save"){
    const auth=await requireAuth(req);
    const body=await parseBody(req);
    let entitlement=await db.getEntitlement(auth.userId);
    if(body.premiumMode==="demo"&&process.env.ALLOW_PREMIUM_PREVIEW!=="false"&&!entitlement.active){
      entitlement=await db.setEntitlement(auth.userId,{active:true,source:"demo"});
    }
    const state=cleanJson(body.state||{});
    if(!state||typeof state!=="object"||Array.isArray(state))return json(res,400,{error:"Invalid cloud save."});
    state.premium=Boolean(entitlement.active);
    state.premiumDemoEntitlement=entitlement.source==="demo";
    const result=await db.saveCloud(auth.userId,{
      baseRevision:safeNumber(body.baseRevision,0,Number.MAX_SAFE_INTEGER,0),
      deviceId:String(body.deviceId||auth.deviceId||"device").slice(0,80),
      state,
      force:body.force===true
    });
    if(result.conflict){
      const current=formatSave(result.current);
      if(current?.state){
        current.state.premium=Boolean(entitlement.active);
        current.state.premiumDemoEntitlement=entitlement.source==="demo";
      }
      return json(res,409,{error:"A newer cloud save already exists.",conflict:true,save:current});
    }
    return json(res,200,{saved:true,save:formatSave(result.row),premium:{active:Boolean(entitlement.active),source:entitlement.source||"none"}});
  }


  if(req.method==="POST"&&url.pathname==="/api/rewards/redeem"){
    const auth=await requireAuth(req);
    const body=await parseBody(req);
    const code=normalizeRewardCode(body.code);
    if(!code)return json(res,400,{error:"Enter a reward code."});

    const builtInReward=rewardCodeCatalog.get(code);
    if(builtInReward){
      const result=await db.redeemRewardCode(auth.userId,{
        code,reward:builtInReward,
        deviceId:String(body.deviceId||auth.deviceId||"reward-code").slice(0,80)
      });
      if(result.alreadyRedeemed){
        return json(res,409,{
          error:"This reward code was already redeemed on this Hammy account.",
          code,alreadyRedeemed:true,save:formatSave(result.save)
        });
      }
      return json(res,200,{
        redeemed:true,code,reward:builtInReward,save:formatSave(result.save)
      });
    }

    const result=await db.redeemManagedRewardCode(
      auth.userId,code,
      String(body.deviceId||auth.deviceId||"reward-code").slice(0,80)
    );
    if(result.notFound)return json(res,404,{error:"That reward code is not valid."});
    if(result.inactive)return json(res,410,{error:"That reward code is not active right now."});
    if(result.limitReached)return json(res,410,{error:"That reward code reached its redemption limit."});
    if(result.alreadyRedeemed){
      return json(res,409,{
        error:"This reward code was already redeemed on this Hammy account.",
        code,alreadyRedeemed:true,save:formatSave(result.save)
      });
    }
    const row=result.codeRow;
    return json(res,200,{
      redeemed:true,code,
      reward:{
        title:row.title,description:row.description,...(row.reward_data||{})
      },
      save:formatSave(result.save)
    });
  }

  if(req.method==="POST"&&url.pathname==="/api/account/premium-preview"){
    const auth=await requireAuth(req);
    if(process.env.ALLOW_PREMIUM_PREVIEW==="false")return json(res,403,{error:"Premium preview syncing is disabled."});
    const entitlement=await db.setEntitlement(auth.userId,{active:true,source:"demo"});
    return json(res,200,{premium:{active:true,source:entitlement.source}});
  }


  if(req.method==="GET"&&url.pathname==="/api/announcements/active"){
    requireDatabase();
    const announcement=await db.getActiveAnnouncement();
    return json(res,200,{announcement:announcementView(announcement)});
  }

  if(req.method==="GET"&&url.pathname==="/api/events/active"){
    requireDatabase();
    const auth=await optionalAuth(req);
    const event=await db.getActiveEvent(auth?.userId||null);
    return json(res,200,{event:publicEvent(event)});
  }

  const eventClaimMatch=url.pathname.match(/^\/api\/events\/([0-9a-f-]{36})\/claim$/i);
  if(eventClaimMatch&&req.method==="POST"){
    const auth=await requireAuth(req);
    const body=await parseBody(req);
    const result=await db.claimAdminEvent(
      eventClaimMatch[1],
      auth.userId,
      String(body.deviceId||auth.deviceId||"event-claim").slice(0,80)
    );
    if(result.notActive)return json(res,404,{error:"This event is no longer active."});
    if(result.alreadyClaimed){
      return json(res,409,{
        error:"This event reward was already claimed on this Hammy account.",
        alreadyClaimed:true,
        event:publicEvent(result.event),
        save:formatSave(result.save)
      });
    }
    return json(res,200,{
      claimed:true,
      event:publicEvent(result.event),
      save:formatSave(result.save)
    });
  }

  if(req.method==="POST"&&url.pathname==="/api/profile"){
    const auth=await requireAuth(req);
    const body=await parseBody(req);
    const entitlement=await db.getEntitlement(auth.userId);
    const cleaned=cleanProfile(body.profile,Boolean(entitlement.active));
    const profile=await db.publishProfile(auth.userId,{...cleaned,makeCode:makeFriendCode});
    return json(res,200,{code:profile.code,profile});
  }

  if(req.method==="PATCH"&&url.pathname==="/api/profile/visibility"){
    const auth=await requireAuth(req);
    const body=await parseBody(req);
    const existing=await db.getProfileForUser(auth.userId);
    if(!existing)return json(res,404,{error:"Publish a profile first."});
    const entitlement=await db.getEntitlement(auth.userId);
    const cleaned=cleanProfile({...existing,visibility:body.visibility==="public"?"public":"unlisted"},Boolean(entitlement.active));
    const profile=await db.publishProfile(auth.userId,{...cleaned,makeCode:makeFriendCode});
    return json(res,200,{profile});
  }

  if(req.method==="DELETE"&&url.pathname==="/api/profile"){
    const auth=await requireAuth(req);
    await db.deleteProfile(auth.userId);
    return json(res,200,{deleted:true});
  }

  const profileMatch=url.pathname.match(/^\/api\/profile\/([A-Z2-9]{8})$/);
  if(profileMatch&&req.method==="GET"){
    const auth=await optionalAuth(req);
    const profile=await db.getProfileByCode(profileMatch[1],auth?.userId||null);
    if(!profile)return json(res,404,{error:"Friend code not found or the profile is hidden."});
    return json(res,200,{profile});
  }
  if(profileMatch&&req.method==="DELETE"){
    const auth=await requireAuth(req);
    const own=await db.getProfileForUser(auth.userId);
    if(!own||own.code!==profileMatch[1])return json(res,403,{error:"You can only delete your own profile."});
    await db.deleteProfile(auth.userId);
    return json(res,200,{deleted:true});
  }

  if(req.method==="GET"&&url.pathname==="/api/gallery"){
    const auth=await optionalAuth(req);
    const page=Math.max(0,Math.min(10000,Number(url.searchParams.get("page"))||0));
    const limit=Math.max(1,Math.min(30,Number(url.searchParams.get("limit"))||12));
    const sort=["newest","practice","streak"].includes(url.searchParams.get("sort"))?url.searchParams.get("sort"):"newest";
    const result=await db.gallery({viewerUserId:auth?.userId||null,page,limit,sort});
    return json(res,200,{...result,page});
  }

  if(req.method==="GET"&&url.pathname==="/api/friends"){
    const auth=await requireAuth(req);
    return json(res,200,{profiles:await db.listFriends(auth.userId)});
  }
  if(req.method==="POST"&&url.pathname==="/api/friends"){
    const auth=await requireAuth(req);const body=await parseBody(req);const code=normalizeCode(body.code);
    if(code.length!==8||!(await db.saveFriend(auth.userId,code)))return json(res,404,{error:"Friend code not found."});
    return json(res,200,{saved:true});
  }
  const friendMatch=url.pathname.match(/^\/api\/friends\/([A-Z2-9]{8})$/);
  if(friendMatch&&req.method==="DELETE"){
    const auth=await requireAuth(req);await db.removeFriend(auth.userId,friendMatch[1]);
    return json(res,200,{removed:true});
  }

  const reactionMatch=url.pathname.match(/^\/api\/profiles\/([A-Z2-9]{8})\/reaction$/);
  if(reactionMatch&&req.method==="POST"){
    const auth=await requireAuth(req);const body=await parseBody(req);
    const reaction=body.reaction===null?null:String(body.reaction||"");
    if(reaction!==null&&!allowedReactions.has(reaction))return json(res,400,{error:"Choose one of the preset reactions."});
    const target=await db.getProfileByCode(reactionMatch[1],auth.userId);
    if(!target)return json(res,404,{error:"Profile not found or hidden."});
    await db.setReaction(auth.userId,reactionMatch[1],reaction);
    return json(res,200,{profile:await db.getProfileByCode(reactionMatch[1],auth.userId)});
  }

  const reportMatch=url.pathname.match(/^\/api\/profiles\/([A-Z2-9]{8})\/report$/);
  if(reportMatch&&req.method==="POST"){
    const auth=await requireAuth(req);const body=await parseBody(req);const reason=String(body.reason||"");
    if(!allowedReportReasons.has(reason))return json(res,400,{error:"Choose a report reason."});
    const target=await db.getProfileByCode(reportMatch[1],auth.userId);
    if(!target)return json(res,404,{error:"Profile not found."});
    await db.addReport(auth.userId,reportMatch[1],reason);
    return json(res,201,{reported:true});
  }

  const blockMatch=url.pathname.match(/^\/api\/profiles\/([A-Z2-9]{8})\/block$/);
  if(blockMatch&&req.method==="POST"){
    const auth=await requireAuth(req);await db.blockProfile(auth.userId,blockMatch[1]);
    return json(res,200,{blocked:true});
  }
  const hideMatch=url.pathname.match(/^\/api\/profiles\/([A-Z2-9]{8})\/hide$/);
  if(hideMatch&&req.method==="POST"){
    const auth=await requireAuth(req);await db.hideProfile(auth.userId,hideMatch[1]);
    return json(res,200,{hidden:true});
  }


  if(req.method==="POST"&&url.pathname==="/api/admin/login"){
    requireDatabase();
    const body=await parseBody(req);
    const submitted=String(body.code||"").trim();
    const secret=adminSecret();
    if(!secret){
      return json(res,503,{error:"ADMIN_ACCESS_CODE is not configured."});
    }

    // A correct secret always clears the temporary lock immediately.
    if(submitted&&safeEqual(submitted,secret)){
      clearAdminFailures(req);
      return json(res,200,{
        authenticated:true,
        sessionToken:createAdminSession(),
        expiresInSeconds:ADMIN_SESSION_SECONDS
      });
    }

    if(adminLoginLimited(req)){
      const retryAfterSeconds=adminRetrySeconds(req);
      return json(
        res,
        429,
        {
          error:`Too many incorrect attempts. Try again in ${retryAfterSeconds} seconds.`,
          retryAfterSeconds
        },
        {"Retry-After":String(retryAfterSeconds)}
      );
    }

    const failure=recordAdminFailure(req);
    if(failure.retryAfterSeconds>0){
      return json(
        res,
        429,
        {
          error:`Too many incorrect attempts. Try again in ${failure.retryAfterSeconds} seconds.`,
          retryAfterSeconds:failure.retryAfterSeconds,
          attemptsRemaining:0
        },
        {"Retry-After":String(failure.retryAfterSeconds)}
      );
    }

    return json(res,401,{
      error:"The top secret admin code is incorrect.",
      attemptsRemaining:failure.attemptsRemaining
    });
  }

  if(req.method==="GET"&&url.pathname==="/api/admin/session"){
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing or expired."});
    return json(res,200,{authenticated:true,expiresInSeconds:ADMIN_SESSION_SECONDS});
  }


  if(url.pathname==="/api/admin/stats"&&req.method==="GET"){
    requireDatabase();
    if(!adminSecret())return json(res,503,{error:"ADMIN_ACCESS_CODE is not configured."});
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    return json(res,200,{stats:await db.adminStats()});
  }

  if(url.pathname==="/api/admin/exclusives"&&req.method==="GET"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    return json(res,200,{exclusives:[...adminExclusiveCatalog.entries()].map(([id,item])=>({id,...item}))});
  }

  if(url.pathname==="/api/admin/player-search"&&req.method==="GET"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const query=cleanAdminText(url.searchParams.get("q")||"",40);
    return json(res,200,{players:await db.searchAdminPlayers(query,25)});
  }

  const adminPlayerMatch=url.pathname.match(/^\/api\/admin\/players\/([A-Z0-9-]{4,24})$/i);
  if(adminPlayerMatch&&req.method==="GET"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const player=await db.adminPlayerSummary(cleanPlayerIdentifier(adminPlayerMatch[1]));
    return player?json(res,200,{player}):json(res,404,{error:"Player ID or friend code was not found."});
  }

  const adminGrantMatch=url.pathname.match(/^\/api\/admin\/players\/([A-Z0-9-]{4,24})\/grant$/i);
  if(adminGrantMatch&&req.method==="POST"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const reward=cleanAdminReward(body.reward);
    const hasReward=reward.coins>0||Object.values(reward.fruits).some(value=>value>0)||Boolean(reward.exclusiveId);
    if(!hasReward)return json(res,400,{error:"Choose coins, fruit, or an exclusive item to grant."});
    const result=await db.adminGrant(cleanPlayerIdentifier(adminGrantMatch[1]),{
      reward,
      note:cleanAdminText(body.note,160),
      deviceId:"admin-live-ops"
    });
    return result?json(res,200,{granted:true,save:formatSave(result.save),player:result.player})
      :json(res,404,{error:"Player ID or friend code was not found."});
  }

  const adminCoinSetMatch=url.pathname.match(/^\/api\/admin\/players\/([A-Z0-9-]{4,24})\/coins$/i);
  if(adminCoinSetMatch&&req.method==="PATCH"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const result=await db.adminSetCoins(
      cleanPlayerIdentifier(adminCoinSetMatch[1]),
      safeNumber(body.coins,0,1000000000,0)
    );
    return result?json(res,200,{
      updated:true,save:formatSave(result.save),player:result.player
    }):json(res,404,{error:"Player ID or friend code was not found."});
  }

  const adminPremiumMatch=url.pathname.match(/^\/api\/admin\/players\/([A-Z0-9-]{4,24})\/premium$/i);
  if(adminPremiumMatch&&req.method==="PATCH"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const result=await db.adminSetPremium(
      cleanPlayerIdentifier(adminPremiumMatch[1]),body.active===true
    );
    return result?json(res,200,{updated:true,player:result.player})
      :json(res,404,{error:"Player ID or friend code was not found."});
  }

  const adminExclusiveRemoveMatch=url.pathname.match(
    /^\/api\/admin\/players\/([A-Z0-9-]{4,24})\/exclusives\/([a-z0-9_]{3,40})$/i
  );
  if(adminExclusiveRemoveMatch&&req.method==="DELETE"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const exclusiveId=String(adminExclusiveRemoveMatch[2]).toLowerCase();
    if(!adminExclusiveCatalog.has(exclusiveId)){
      return json(res,400,{error:"Unknown exclusive item."});
    }
    const result=await db.adminRemoveExclusive(
      cleanPlayerIdentifier(adminExclusiveRemoveMatch[1]),exclusiveId
    );
    return result?json(res,200,{
      removed:true,save:formatSave(result.save),player:result.player
    }):json(res,404,{error:"Player ID or friend code was not found."});
  }

  if(url.pathname==="/api/admin/events"&&req.method==="GET"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const events=await db.listAdminEvents(100);
    return json(res,200,{events:events.map(publicEvent)});
  }

  if(url.pathname==="/api/admin/events/random"&&req.method==="POST"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const durationMinutes=safeNumber(body.durationMinutes,5,10080,60);
    const template=randomEventTemplates[crypto.randomInt(randomEventTemplates.length)];
    const event=await db.createAdminEvent({
      id:crypto.randomUUID(),
      eventType:template.eventType,
      title:template.title,
      description:template.description,
      reward:cleanAdminReward(template.reward),
      startsAt:now(),
      endsAt:new Date(Date.now()+(durationMinutes*60*1000)).toISOString()
    });
    return json(res,201,{event:publicEvent(event)});
  }

  if(url.pathname==="/api/admin/events"&&req.method==="POST"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const durationMinutes=safeNumber(body.durationMinutes,5,10080,60);
    const title=cleanAdminText(body.title,40);
    const description=cleanAdminText(body.description,140);
    if(title.length<3||description.length<3)return json(res,400,{error:"Enter an event title and description."});
    const reward=cleanAdminReward(body.reward);
    const hasReward=reward.coins>0||Object.values(reward.fruits).some(value=>value>0)||Boolean(reward.exclusiveId);
    if(!hasReward)return json(res,400,{error:"The event needs a reward."});
    const requestedStart=safeIsoDate(body.startsAt,now());
    const startsMs=Math.max(Date.now(),new Date(requestedStart).getTime());
    const event=await db.createAdminEvent({
      id:crypto.randomUUID(),
      eventType:cleanAdminText(body.eventType||"custom",30)||"custom",
      title,description,reward,
      startsAt:new Date(startsMs).toISOString(),
      endsAt:new Date(startsMs+(durationMinutes*60*1000)).toISOString()
    });
    return json(res,201,{event:publicEvent(event)});
  }

  const adminEventMatch=url.pathname.match(/^\/api\/admin\/events\/([0-9a-f-]{36})$/i);
  if(adminEventMatch&&req.method==="PATCH"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const status=["active","ended","cancelled"].includes(body.status)?body.status:"ended";
    const event=await db.updateAdminEventStatus(adminEventMatch[1],status);
    return event?json(res,200,{event:publicEvent(event)}):json(res,404,{error:"Event not found."});
  }

  if(url.pathname==="/api/admin/reward-codes"&&req.method==="GET"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const codes=await db.listAdminRewardCodes(150);
    return json(res,200,{codes:codes.map(adminRewardCodeView)});
  }

  if(url.pathname==="/api/admin/reward-codes"&&req.method==="POST"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const code=normalizeRewardCode(body.code);
    const title=cleanAdminText(body.title,60);
    const description=cleanAdminText(body.description,140);
    if(code.length<4)return json(res,400,{error:"Reward codes need at least four letters or numbers."});
    if(rewardCodeCatalog.has(code)){
      return json(res,409,{error:"That code is reserved by the built-in reward catalog."});
    }
    if(title.length<3||description.length<3){
      return json(res,400,{error:"Enter a title and description."});
    }
    const reward=cleanAdminReward(body.reward);
    const hasReward=reward.coins>0||
      Object.values(reward.fruits).some(value=>value>0)||
      Boolean(reward.exclusiveId);
    if(!hasReward)return json(res,400,{error:"The code needs a reward."});
    const startsAt=safeIsoDate(body.startsAt,now());
    const endsAt=body.endsAt?safeIsoDate(body.endsAt,null):null;
    if(endsAt&&new Date(endsAt).getTime()<=new Date(startsAt).getTime()){
      return json(res,400,{error:"The code end time must be after its start time."});
    }
    try{
      const row=await db.createAdminRewardCode({
        code,title,description,reward,
        maxRedemptions:body.maxRedemptions==null||body.maxRedemptions===""
          ?null:safeNumber(body.maxRedemptions,1,1000000,1),
        startsAt,endsAt
      });
      return json(res,201,{code:adminRewardCodeView(row)});
    }catch(error){
      if(error.code==="DUPLICATE_CODE")return json(res,409,{error:error.message});
      throw error;
    }
  }

  const adminRewardCodeMatch=url.pathname.match(
    /^\/api\/admin\/reward-codes\/([A-Z0-9]{4,24})$/
  );
  if(adminRewardCodeMatch&&req.method==="PATCH"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const row=await db.updateAdminRewardCodeStatus(
      adminRewardCodeMatch[1],body.status==="active"?"active":"disabled"
    );
    return row?json(res,200,{code:adminRewardCodeView(row)})
      :json(res,404,{error:"Reward code not found."});
  }

  if(url.pathname==="/api/admin/announcements"&&req.method==="GET"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const rows=await db.listAnnouncements(100);
    return json(res,200,{announcements:rows.map(announcementView)});
  }

  if(url.pathname==="/api/admin/announcements"&&req.method==="POST"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const title=cleanAdminText(body.title,50);
    const message=cleanAdminText(body.message,180);
    const priority=["normal","important","celebration"].includes(body.priority)
      ?body.priority:"normal";
    const durationMinutes=safeNumber(body.durationMinutes,5,10080,60);
    if(title.length<3||message.length<3){
      return json(res,400,{error:"Enter an announcement title and message."});
    }
    const requestedStart=safeIsoDate(body.startsAt,now());
    const startsMs=Math.max(Date.now(),new Date(requestedStart).getTime());
    const row=await db.createAnnouncement({
      id:crypto.randomUUID(),title,message,priority,
      startsAt:new Date(startsMs).toISOString(),
      endsAt:new Date(startsMs+(durationMinutes*60*1000)).toISOString()
    });
    return json(res,201,{announcement:announcementView(row)});
  }

  const adminAnnouncementMatch=url.pathname.match(
    /^\/api\/admin\/announcements\/([0-9a-f-]{36})$/i
  );
  if(adminAnnouncementMatch&&req.method==="PATCH"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const row=await db.updateAnnouncementStatus(
      adminAnnouncementMatch[1],body.status==="active"?"active":"ended"
    );
    return row?json(res,200,{announcement:announcementView(row)})
      :json(res,404,{error:"Announcement not found."});
  }

  if(url.pathname==="/api/admin/audit"&&req.method==="GET"){
    requireDatabase();
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const limit=safeNumber(url.searchParams.get("limit"),1,300,100);
    return json(res,200,{entries:await db.listAudit(limit)});
  }

  if(url.pathname==="/api/admin/reports"&&req.method==="GET"){
    requireDatabase();
    if(!adminSecret())return json(res,503,{error:"ADMIN_ACCESS_CODE is not configured."});
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const status=["open","reviewed","dismissed","all"].includes(url.searchParams.get("status"))?url.searchParams.get("status"):"open";
    return json(res,200,{reports:await db.listReports(status)});
  }

  const adminReportMatch=url.pathname.match(/^\/api\/admin\/reports\/(\d+)$/);
  if(adminReportMatch&&req.method==="PATCH"){
    requireDatabase();
    if(!adminSecret())return json(res,503,{error:"ADMIN_ACCESS_CODE is not configured."});
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const status=["reviewed","dismissed","open"].includes(body.status)?body.status:"reviewed";
    const report=await db.setReportStatus(Number(adminReportMatch[1]),status);
    return report?json(res,200,{report}):json(res,404,{error:"Report not found."});
  }

  const adminProfileMatch=url.pathname.match(/^\/api\/admin\/profiles\/([A-Z2-9]{8})$/);
  if(adminProfileMatch&&req.method==="PATCH"){
    requireDatabase();
    if(!adminSecret())return json(res,503,{error:"ADMIN_ACCESS_CODE is not configured."});
    if(!adminAuthorized(req))return json(res,401,{error:"Admin session is missing, incorrect, or expired."});
    const body=await parseBody(req);
    const status=["active","hidden","removed"].includes(body.status)?body.status:"hidden";
    const profile=await db.moderateProfile(adminProfileMatch[1],status);
    return profile?json(res,200,{updated:true,status}):json(res,404,{error:"Profile not found."});
  }

  return json(res,404,{error:"API route not found."});
}

const server=http.createServer(async(req,res)=>{
  if(rateLimited(req))return json(res,429,{error:"Too many requests. Try again in a minute."});
  if(req.method==="OPTIONS")return json(res,204,{});
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  try{
    if(url.pathname.startsWith("/api/"))return await handleApi(req,res,url);
    return serveStatic(req,res,url.pathname);
  }catch(error){
    console.error(error);
    const status=Number(error.status)||500;
    return json(res,status,{error:status>=500&&error.code!=="DATABASE_REQUIRED"?"The server could not complete that request.":error.message,code:error.code||null});
  }
});

(async()=>{
  try{
    await db.init();
    databaseReady=true;
    console.log(`Database connected (${db.mode()}).`);
  }catch(error){
    databaseReady=false;databaseError=error;
    console.error("Cloud database setup incomplete:",error.message);
  }
  server.listen(PORT,HOST,()=>console.log(`Hammy Focus House v24.1 running at http://${HOST}:${PORT}`));
})();

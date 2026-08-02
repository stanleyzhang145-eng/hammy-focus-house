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
const unsafeNicknamePatterns=[
  /https?:/i,/www\./i,/@/,/discord/i,/snapchat/i,/instagram/i,/tiktok/i,/telegram/i,
  /\b(?:address|school|phone|email|location)\b/i,
  /\b(?:fuck|shit|bitch|cunt|nigger|nigga|porn|sex)\b/i
];
const rateMap=new Map();
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

function json(res,status,data,extraHeaders={}){
  const body=JSON.stringify(data);
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Content-Length":Buffer.byteLength(body),
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"Content-Type, Authorization, X-Admin-Key",
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
  if(req.method==="GET"&&url.pathname==="/api/health"){
    return json(res,200,{
      ok:true,name:"Hammy Cloud server",version:20,
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

  if(req.method==="POST"&&url.pathname==="/api/account/premium-preview"){
    const auth=await requireAuth(req);
    if(process.env.ALLOW_PREMIUM_PREVIEW==="false")return json(res,403,{error:"Premium preview syncing is disabled."});
    const entitlement=await db.setEntitlement(auth.userId,{active:true,source:"demo"});
    return json(res,200,{premium:{active:true,source:entitlement.source}});
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

  if(url.pathname==="/api/admin/reports"&&req.method==="GET"){
    requireDatabase();
    const adminKey=String(req.headers["x-admin-key"]||"");
    if(!process.env.ADMIN_KEY)return json(res,503,{error:"ADMIN_KEY is not configured."});
    if(!adminKey||adminKey!==process.env.ADMIN_KEY)return json(res,401,{error:"Admin key is incorrect."});
    const status=["open","reviewed","dismissed","all"].includes(url.searchParams.get("status"))?url.searchParams.get("status"):"open";
    return json(res,200,{reports:await db.listReports(status)});
  }

  const adminReportMatch=url.pathname.match(/^\/api\/admin\/reports\/(\d+)$/);
  if(adminReportMatch&&req.method==="PATCH"){
    requireDatabase();
    const adminKey=String(req.headers["x-admin-key"]||"");
    if(!process.env.ADMIN_KEY||adminKey!==process.env.ADMIN_KEY)return json(res,401,{error:"Admin key is incorrect."});
    const body=await parseBody(req);
    const status=["reviewed","dismissed","open"].includes(body.status)?body.status:"reviewed";
    const report=await db.setReportStatus(Number(adminReportMatch[1]),status);
    return report?json(res,200,{report}):json(res,404,{error:"Report not found."});
  }

  const adminProfileMatch=url.pathname.match(/^\/api\/admin\/profiles\/([A-Z2-9]{8})$/);
  if(adminProfileMatch&&req.method==="PATCH"){
    requireDatabase();
    const adminKey=String(req.headers["x-admin-key"]||"");
    if(!process.env.ADMIN_KEY||adminKey!==process.env.ADMIN_KEY)return json(res,401,{error:"Admin key is incorrect."});
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
  server.listen(PORT,HOST,()=>console.log(`Hammy Focus House v20 running at http://${HOST}:${PORT}`));
})();

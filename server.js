"use strict";
const http=require("http");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");

const ROOT=__dirname;
const DATA_DIR=path.join(ROOT,"server-data");
const DATA_FILE=path.join(DATA_DIR,"profiles.json");
const PORT=Number(process.env.PORT)||8080;
const HOST=process.env.HOST||"0.0.0.0";
const MAX_BODY=80*1024;
const CODE_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const allowedTypes=new Set([
  "bed","sofa","desk","plant","aquarium","tunnel","toybox","bookshelf","lamp","rug","wheel","snack","music","castle",
  "giantWheel","bunkBed","gamingDesk","pool","bubbleBath","cinema","musicStage","capsuleBed","treehouse","aquariumTunnel",
  "kitchenSet","trainSet","clawMachine","playground","portal"
]);
const allowedRooms=new Set(["home","bedroom","kitchen","bathroom","study","music","game","garden","rooftop","aquarium","space","winter","beach"]);
const rateMap=new Map();

fs.mkdirSync(DATA_DIR,{recursive:true});
if(!fs.existsSync(DATA_FILE))fs.writeFileSync(DATA_FILE,"{}\n");

function readProfiles(){
  try{return JSON.parse(fs.readFileSync(DATA_FILE,"utf8")||"{}")}catch{return {}}
}
function writeProfiles(data){
  const temp=DATA_FILE+".tmp";
  fs.writeFileSync(temp,JSON.stringify(data,null,2));
  fs.renameSync(temp,DATA_FILE);
}
function json(res,status,data){
  const body=JSON.stringify(data);
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Content-Length":Buffer.byteLength(body),
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"Content-Type, X-Profile-Token",
    "Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS",
    "Cache-Control":"no-store"
  });
  res.end(body);
}
function safeNumber(value,min,max,fallback=0){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
}
function safeColor(value,fallback){
  return /^#[0-9a-f]{6}$/i.test(String(value||""))?String(value):fallback;
}
function cleanName(value){
  const name=String(value||"").trim().replace(/\s+/g," ");
  if(!/^[A-Za-z0-9][A-Za-z0-9 ]{1,14}[A-Za-z0-9]$/.test(name))throw new Error("Nickname must be 3–16 letters, numbers, or spaces.");
  if(/https?:|www\.|@|discord|snapchat|instagram|tiktok/i.test(name))throw new Error("Links and social usernames are not allowed.");
  return name;
}
function cleanProfile(input){
  if(!input||typeof input!=="object")throw new Error("Invalid profile.");
  const stats=input.stats||{},base=input.base||{};
  const items=Array.isArray(base.items)?base.items.slice(0,30):[];
  const visibility=input.visibility==="public"?"public":"unlisted";
  return {
    nickname:cleanName(input.nickname),
    visibility,
    skin:String(input.skin||"white").replace(/[^A-Za-z0-9_-]/g,"").slice(0,32)||"white",
    skinColors:{
      fur:safeColor(input.skinColors?.fur,"#ffffff"),
      fur2:safeColor(input.skinColors?.fur2,"#f7f5f1"),
      patch:input.skinColors?.patch==="transparent"?"transparent":safeColor(input.skinColors?.patch,"#eadffc")
    },
    costume:String(input.costume||"No costume").replace(/[<>]/g,"").slice(0,40),
    premium:Boolean(input.premium),
    stats:{
      practiceDays:safeNumber(stats.practiceDays,0,100000),
      totalFocusMinutes:safeNumber(stats.totalFocusMinutes,0,10000000),
      streak:safeNumber(stats.streak,0,100000),
      lootLevel:safeNumber(stats.lootLevel,1,100000,1),
      sessionCount:safeNumber(stats.sessionCount,0,1000000)
    },
    base:{
      room:allowedRooms.has(base.room)?base.room:"home",
      wall:safeColor(base.wall,"#eadffc"),
      floor:safeColor(base.floor,"#dfbf91"),
      items:items.filter(item=>item&&allowedTypes.has(item.type)).map(item=>({
        type:item.type,
        x:safeNumber(item.x,4,96,50),
        y:safeNumber(item.y,12,92,60),
        scale:safeNumber(item.scale,.5,1.6,1),
        rotation:safeNumber(item.rotation,-180,180,0),
        color:safeColor(item.color,"#a88fd5")
      }))
    }
  };
}
function makeCode(profiles){
  for(let attempt=0;attempt<100;attempt++){
    let code="";
    const bytes=crypto.randomBytes(8);
    for(const byte of bytes)code+=CODE_ALPHABET[byte%CODE_ALPHABET.length];
    if(!profiles[code])return code;
  }
  throw new Error("Could not create a friend code.");
}
function publicProfile(record,code){
  return {...record.profile,code,updatedAt:record.updatedAt};
}
function rateLimited(req){
  const ip=req.socket.remoteAddress||"unknown";
  const now=Date.now(),windowMs=60_000;
  const entry=rateMap.get(ip);
  if(!entry||now-entry.start>windowMs){rateMap.set(ip,{start:now,count:1});return false}
  entry.count++;
  return entry.count>120;
}
function parseBody(req){
  return new Promise((resolve,reject)=>{
    let size=0,chunks=[];
    req.on("data",chunk=>{
      size+=chunk.length;
      if(size>MAX_BODY){reject(new Error("Request is too large."));req.destroy();return}
      chunks.push(chunk);
    });
    req.on("end",()=>{
      try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString("utf8")):{})}
      catch{reject(new Error("Invalid JSON."))}
    });
    req.on("error",reject);
  });
}
function contentType(file){
  const ext=path.extname(file).toLowerCase();
  return ({
    ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",
    ".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json; charset=utf-8",
    ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".txt":"text/plain; charset=utf-8"
  })[ext]||"application/octet-stream";
}
function serveStatic(req,res,urlPath){
  let pathname=decodeURIComponent(urlPath.split("?")[0]);
  if(pathname==="/")pathname="/index.html";
  const safePath=path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const file=path.join(ROOT,safePath);
  if(!file.startsWith(ROOT)||file.includes("server-data"))return json(res,404,{error:"Not found."});
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile())return json(res,404,{error:"Not found."});
    res.writeHead(200,{"Content-Type":contentType(file),"Cache-Control":file.endsWith(".html")?"no-cache":"public, max-age=3600"});
    fs.createReadStream(file).pipe(res);
  });
}

const server=http.createServer(async(req,res)=>{
  if(rateLimited(req))return json(res,429,{error:"Too many requests. Try again in a minute."});
  if(req.method==="OPTIONS")return json(res,204,{});
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  try{
    if(req.method==="GET"&&url.pathname==="/api/health"){
      return json(res,200,{ok:true,name:"Hammy Friends server",version:1});
    }

    if(req.method==="GET"&&url.pathname==="/api/gallery"){
      const profiles=readProfiles();
      const page=Math.max(0,Math.min(10000,Number(url.searchParams.get("page"))||0));
      const limit=Math.max(1,Math.min(30,Number(url.searchParams.get("limit"))||12));
      const sort=url.searchParams.get("sort")||"newest";
      let entries=Object.entries(profiles).filter(([,r])=>r?.profile?.visibility==="public").map(([code,r])=>publicProfile(r,code));
      if(sort==="practice")entries.sort((a,b)=>(b.stats?.practiceDays||0)-(a.stats?.practiceDays||0)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
      else if(sort==="streak")entries.sort((a,b)=>(b.stats?.streak||0)-(a.stats?.streak||0)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
      else entries.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
      const start=page*limit,selected=entries.slice(start,start+limit);
      return json(res,200,{profiles:selected,page,hasMore:start+limit<entries.length,total:entries.length});
    }
    if(req.method==="POST"&&url.pathname==="/api/profile"){
      const body=await parseBody(req),profiles=readProfiles();
      const profile=cleanProfile(body.profile);
      const requested=String(body.code||"").toUpperCase();
      const token=String(req.headers["x-profile-token"]||"");
      if(requested){
        if(!/^[A-Z2-9]{8}$/.test(requested)||!profiles[requested])return json(res,404,{error:"Profile not found."});
        const expected=profiles[requested].tokenHash;
        const actual=crypto.createHash("sha256").update(token).digest("hex");
        if(!token||actual!==expected)return json(res,403,{error:"This profile belongs to another device."});
        profiles[requested]={...profiles[requested],profile,updatedAt:new Date().toISOString()};
        writeProfiles(profiles);
        return json(res,200,{code:requested,profile:publicProfile(profiles[requested],requested)});
      }
      const code=makeCode(profiles);
      const newToken=crypto.randomBytes(32).toString("base64url");
      profiles[code]={
        tokenHash:crypto.createHash("sha256").update(newToken).digest("hex"),
        profile,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
      };
      writeProfiles(profiles);
      return json(res,201,{code,token:newToken,profile:publicProfile(profiles[code],code)});
    }
    const match=url.pathname.match(/^\/api\/profile\/([A-Z2-9]{8})$/);
    if(match&&req.method==="GET"){
      const profiles=readProfiles(),record=profiles[match[1]];
      if(!record)return json(res,404,{error:"Friend code not found."});
      return json(res,200,{profile:publicProfile(record,match[1])});
    }
    if(match&&req.method==="DELETE"){
      const profiles=readProfiles(),record=profiles[match[1]];
      if(!record)return json(res,404,{error:"Profile not found."});
      const token=String(req.headers["x-profile-token"]||"");
      const actual=crypto.createHash("sha256").update(token).digest("hex");
      if(!token||actual!==record.tokenHash)return json(res,403,{error:"This profile belongs to another device."});
      delete profiles[match[1]];writeProfiles(profiles);
      return json(res,200,{deleted:true});
    }
    if(url.pathname.startsWith("/api/"))return json(res,404,{error:"API route not found."});
    return serveStatic(req,res,url.pathname);
  }catch(error){
    console.error(error);
    return json(res,400,{error:error.message||"Request failed."});
  }
});

server.listen(PORT,HOST,()=>console.log(`Hammy Focus House online server running at http://${HOST}:${PORT}`));

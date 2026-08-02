"use strict";

const crypto=require("crypto");
const fs=require("fs");
const path=require("path");

const memoryMode=process.env.DEV_MEMORY_DB==="1";
let pool=null;
const mem={
  users:new Map(), sessions:new Map(), saves:new Map(), entitlements:new Map(),
  profiles:new Map(), codes:new Map(), codeByUser:new Map(), friends:new Map(),
  reports:[], blocks:new Map(), hidden:new Map(), reactions:new Map(),
  rewardRedemptions:new Map()
};

function now(){return new Date().toISOString()}
function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value))}
function setFor(map,key){if(!map.has(key))map.set(key,new Set());return map.get(key)}
function reactionKey(userId,code){return `${userId}|${code}`}

async function init(){
  if(memoryMode)return;
  if(!process.env.DATABASE_URL){
    const error=new Error("DATABASE_URL is not configured.");
    error.code="DATABASE_REQUIRED";
    throw error;
  }
  const {Pool}=require("pg");
  pool=new Pool({connectionString:process.env.DATABASE_URL,max:10});
  const schema=fs.readFileSync(path.join(__dirname,"schema.sql"),"utf8");
  await pool.query(schema);
}

function mode(){return memoryMode?"memory":"postgres"}

async function createUser({id,playerId,recoveryHash}){
  if(memoryMode){
    const row={id,player_id:playerId,recovery_hash:recoveryHash,created_at:now(),updated_at:now()};
    mem.users.set(id,row);return clone(row);
  }
  const {rows}=await pool.query(
    `INSERT INTO users(id,player_id,recovery_hash) VALUES($1,$2,$3) RETURNING *`,
    [id,playerId,recoveryHash]
  );
  return rows[0];
}

async function findUserByPlayerId(playerId){
  if(memoryMode){
    return clone([...mem.users.values()].find(row=>row.player_id===playerId)||null);
  }
  const {rows}=await pool.query(`SELECT * FROM users WHERE player_id=$1`,[playerId]);
  return rows[0]||null;
}

async function getUserById(id){
  if(memoryMode)return clone(mem.users.get(id)||null);
  const {rows}=await pool.query(`SELECT * FROM users WHERE id=$1`,[id]);
  return rows[0]||null;
}

async function createSession({tokenHash,userId,deviceId}){
  if(memoryMode){
    const row={token_hash:tokenHash,user_id:userId,device_id:deviceId,created_at:now(),last_used_at:now()};
    mem.sessions.set(tokenHash,row);return clone(row);
  }
  const {rows}=await pool.query(
    `INSERT INTO user_sessions(token_hash,user_id,device_id) VALUES($1,$2,$3)
     ON CONFLICT(token_hash) DO UPDATE SET last_used_at=NOW()
     RETURNING *`,
    [tokenHash,userId,deviceId]
  );
  return rows[0];
}

async function getSession(tokenHash){
  if(memoryMode){
    const row=mem.sessions.get(tokenHash);
    if(!row)return null;
    row.last_used_at=now();
    return clone(row);
  }
  const {rows}=await pool.query(
    `UPDATE user_sessions SET last_used_at=NOW() WHERE token_hash=$1 RETURNING *`,
    [tokenHash]
  );
  return rows[0]||null;
}

async function deleteSessionsForUser(userId){
  if(memoryMode){
    for(const [key,row] of mem.sessions.entries())if(row.user_id===userId)mem.sessions.delete(key);
    return;
  }
  await pool.query(`DELETE FROM user_sessions WHERE user_id=$1`,[userId]);
}

async function getEntitlement(userId){
  if(memoryMode)return clone(mem.entitlements.get(userId)||{user_id:userId,active:false,source:"none",updated_at:null});
  const {rows}=await pool.query(`SELECT * FROM premium_entitlements WHERE user_id=$1`,[userId]);
  return rows[0]||{user_id:userId,active:false,source:"none",updated_at:null};
}

async function setEntitlement(userId,{active,source}){
  if(memoryMode){
    const row={user_id:userId,active:Boolean(active),source:String(source||"none"),updated_at:now()};
    mem.entitlements.set(userId,row);return clone(row);
  }
  const {rows}=await pool.query(
    `INSERT INTO premium_entitlements(user_id,active,source,updated_at)
     VALUES($1,$2,$3,NOW())
     ON CONFLICT(user_id) DO UPDATE SET active=EXCLUDED.active,source=EXCLUDED.source,updated_at=NOW()
     RETURNING *`,
    [userId,Boolean(active),String(source||"none")]
  );
  return rows[0];
}

async function getCloudSave(userId){
  if(memoryMode)return clone(mem.saves.get(userId)||null);
  const {rows}=await pool.query(`SELECT * FROM cloud_saves WHERE user_id=$1`,[userId]);
  return rows[0]||null;
}

async function saveCloud(userId,{baseRevision,deviceId,state,force=false}){
  if(memoryMode){
    const current=mem.saves.get(userId)||null;
    const revision=current?Number(current.revision):0;
    if(current&&!force&&Number(baseRevision)!==revision)return {conflict:true,current:clone(current)};
    const row={user_id:userId,revision:revision+1,device_id:deviceId,state:clone(state),updated_at:now()};
    mem.saves.set(userId,row);return {conflict:false,row:clone(row)};
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const currentResult=await client.query(`SELECT * FROM cloud_saves WHERE user_id=$1 FOR UPDATE`,[userId]);
    const current=currentResult.rows[0]||null;
    const revision=current?Number(current.revision):0;
    if(current&&!force&&Number(baseRevision)!==revision){
      await client.query("ROLLBACK");
      return {conflict:true,current};
    }
    const next=revision+1;
    const {rows}=await client.query(
      `INSERT INTO cloud_saves(user_id,revision,device_id,state,updated_at)
       VALUES($1,$2,$3,$4::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        revision=EXCLUDED.revision,device_id=EXCLUDED.device_id,state=EXCLUDED.state,updated_at=NOW()
       RETURNING *`,
      [userId,next,deviceId,JSON.stringify(state)]
    );
    await client.query("COMMIT");
    return {conflict:false,row:rows[0]};
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

function publicProfileFromParts(profile,code,home,premiumRooms,reactions,userReaction){
  if(!profile)return null;
  const data=clone(profile.profile_data||{});
  return {
    ...data,
    nickname:profile.nickname,
    visibility:profile.visibility,
    premium:Boolean(data.premium),
    homeBase:clone(home||{room:"home",wall:"#eee4ff",floor:"#e6c59d",items:[]}),
    base:clone(home||{room:"home",wall:"#eee4ff",floor:"#e6c59d",items:[]}),
    premiumRooms:Boolean(data.premium)?clone(premiumRooms||[]):[],
    code,
    moderationStatus:profile.moderation_status,
    reactions:reactions||{heart:0,star:0,cozy:0,creative:0},
    myReaction:userReaction||null,
    updatedAt:profile.updated_at
  };
}

async function ensureFriendCode(userId,makeCode){
  if(memoryMode){
    if(mem.codeByUser.has(userId))return mem.codeByUser.get(userId);
    let code;
    do{code=makeCode()}while(mem.codes.has(code));
    mem.codes.set(code,userId);mem.codeByUser.set(userId,code);return code;
  }
  const existing=await pool.query(`SELECT code FROM friend_codes WHERE user_id=$1`,[userId]);
  if(existing.rows[0])return existing.rows[0].code;
  for(let attempt=0;attempt<50;attempt++){
    const code=makeCode();
    try{
      await pool.query(`INSERT INTO friend_codes(code,user_id) VALUES($1,$2)`,[code,userId]);
      return code;
    }catch(error){if(error.code!=="23505")throw error}
  }
  throw new Error("Could not create a friend code.");
}

async function publishProfile(userId,{profileData,homeBase,premiumRooms,makeCode}){
  const code=await ensureFriendCode(userId,makeCode);
  const profileRow={
    user_id:userId,nickname:profileData.nickname,visibility:profileData.visibility,
    profile_data:clone(profileData),moderation_status:"active",updated_at:now()
  };
  if(memoryMode){
    const previous=mem.profiles.get(userId);
    if(previous?.moderation_status&&previous.moderation_status!=="active")profileRow.moderation_status=previous.moderation_status;
    mem.profiles.set(userId,profileRow);
    profileRow.home=clone(homeBase);
    profileRow.premiumRooms=clone(profileData.premium?premiumRooms:[]);
    return getProfileByCode(code,userId);
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO profiles(user_id,nickname,visibility,profile_data,moderation_status,updated_at)
       VALUES($1,$2,$3,$4::jsonb,'active',NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        nickname=EXCLUDED.nickname,visibility=EXCLUDED.visibility,profile_data=EXCLUDED.profile_data,
        updated_at=NOW(),
        moderation_status=CASE WHEN profiles.moderation_status IN ('hidden','removed') THEN profiles.moderation_status ELSE 'active' END`,
      [userId,profileData.nickname,profileData.visibility,JSON.stringify(profileData)]
    );
    await client.query(
      `INSERT INTO normal_home_rooms(user_id,room_data,updated_at)
       VALUES($1,$2::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET room_data=EXCLUDED.room_data,updated_at=NOW()`,
      [userId,JSON.stringify(homeBase)]
    );
    await client.query(`DELETE FROM premium_rooms WHERE user_id=$1`,[userId]);
    if(profileData.premium){
      for(const room of premiumRooms||[]){
        await client.query(
          `INSERT INTO premium_rooms(user_id,room_key,room_data) VALUES($1,$2,$3::jsonb)`,
          [userId,room.room,JSON.stringify(room)]
        );
      }
    }
    await client.query("COMMIT");
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
  return getProfileByCode(code,userId);
}

function countMemoryReactions(code,viewerUserId){
  const counts={heart:0,star:0,cozy:0,creative:0};let mine=null;
  for(const [key,row] of mem.reactions.entries()){
    if(row.profile_code!==code)continue;
    if(counts[row.reaction]!==undefined)counts[row.reaction]++;
    if(row.user_id===viewerUserId)mine=row.reaction;
  }
  return {counts,mine};
}

async function getProfileByCode(code,viewerUserId=null){
  if(memoryMode){
    const userId=mem.codes.get(code);if(!userId)return null;
    if(viewerUserId&&(setFor(mem.blocks,viewerUserId).has(code)||setFor(mem.hidden,viewerUserId).has(code)))return null;
    const profile=mem.profiles.get(userId);if(!profile||profile.moderation_status!=="active")return null;
    const {counts,mine}=countMemoryReactions(code,viewerUserId);
    return publicProfileFromParts(profile,code,profile.home,profile.premiumRooms,counts,mine);
  }
  const {rows}=await pool.query(
    `SELECT p.*,f.code,h.room_data,
      COALESCE((SELECT jsonb_agg(pr.room_data ORDER BY pr.room_key) FROM premium_rooms pr WHERE pr.user_id=p.user_id),'[]'::jsonb) premium_rooms,
      COALESCE((SELECT jsonb_object_agg(x.reaction,x.count) FROM
        (SELECT reaction,COUNT(*)::int count FROM reactions WHERE profile_code=f.code GROUP BY reaction)x),'{}'::jsonb) reaction_counts,
      (SELECT reaction FROM reactions WHERE user_id=$2 AND profile_code=f.code) my_reaction
     FROM profiles p
     JOIN friend_codes f ON f.user_id=p.user_id
     LEFT JOIN normal_home_rooms h ON h.user_id=p.user_id
     WHERE f.code=$1 AND p.moderation_status='active'
       AND ($2::uuid IS NULL OR NOT EXISTS(SELECT 1 FROM blocks b WHERE b.user_id=$2 AND b.profile_code=f.code))
       AND ($2::uuid IS NULL OR NOT EXISTS(SELECT 1 FROM hidden_profiles hp WHERE hp.user_id=$2 AND hp.profile_code=f.code))`,
    [code,viewerUserId]
  );
  const row=rows[0];if(!row)return null;
  return publicProfileFromParts(row,row.code,row.room_data,row.premium_rooms,row.reaction_counts,row.my_reaction);
}

async function getProfileForUser(userId){
  const code=memoryMode?mem.codeByUser.get(userId):null;
  if(memoryMode)return code?getProfileByCode(code,userId):null;
  const {rows}=await pool.query(`SELECT code FROM friend_codes WHERE user_id=$1`,[userId]);
  return rows[0]?getProfileByCode(rows[0].code,userId):null;
}

async function deleteProfile(userId){
  if(memoryMode){
    const code=mem.codeByUser.get(userId);
    mem.profiles.delete(userId);
    if(code){
      mem.codes.delete(code);mem.codeByUser.delete(userId);
      for(const set of mem.friends.values())set.delete(code);
      for(const set of mem.blocks.values())set.delete(code);
      for(const set of mem.hidden.values())set.delete(code);
      for(const key of [...mem.reactions.keys()])if(mem.reactions.get(key).profile_code===code)mem.reactions.delete(key);
      mem.reports=mem.reports.filter(report=>report.profile_code!==code);
    }
    return true;
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const codeResult=await client.query(`SELECT code FROM friend_codes WHERE user_id=$1`,[userId]);
    const code=codeResult.rows[0]?.code||null;
    if(code){
      await client.query(`DELETE FROM reactions WHERE profile_code=$1`,[code]);
      await client.query(`DELETE FROM reports WHERE profile_code=$1`,[code]);
      await client.query(`DELETE FROM blocks WHERE profile_code=$1`,[code]);
      await client.query(`DELETE FROM hidden_profiles WHERE profile_code=$1`,[code]);
    }
    await client.query(`DELETE FROM friend_codes WHERE user_id=$1`,[userId]);
    await client.query(`DELETE FROM profiles WHERE user_id=$1`,[userId]);
    await client.query(`DELETE FROM normal_home_rooms WHERE user_id=$1`,[userId]);
    await client.query(`DELETE FROM premium_rooms WHERE user_id=$1`,[userId]);
    await client.query("COMMIT");
    return true;
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function gallery({viewerUserId,page,limit,sort}){
  if(memoryMode){
    let rows=[];
    for(const [userId,profile] of mem.profiles.entries()){
      if(profile.visibility!=="public"||profile.moderation_status!=="active")continue;
      const code=mem.codeByUser.get(userId);if(!code)continue;
      if(viewerUserId&&(setFor(mem.blocks,viewerUserId).has(code)||setFor(mem.hidden,viewerUserId).has(code)))continue;
      const item=await getProfileByCode(code,viewerUserId);if(item)rows.push(item);
    }
    const metric=sort==="practice"?"practiceDays":sort==="streak"?"streak":null;
    rows.sort((a,b)=>metric?Number(b.stats?.[metric]||0)-Number(a.stats?.[metric]||0):String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const start=page*limit;return {profiles:rows.slice(start,start+limit),total:rows.length,hasMore:start+limit<rows.length};
  }
  const order=sort==="practice"
    ?`COALESCE((p.profile_data->'stats'->>'practiceDays')::int,0) DESC,p.updated_at DESC`
    :sort==="streak"
      ?`COALESCE((p.profile_data->'stats'->>'streak')::int,0) DESC,p.updated_at DESC`
      :`p.updated_at DESC`;
  const offset=page*limit;
  const {rows}=await pool.query(
    `SELECT f.code FROM profiles p JOIN friend_codes f ON f.user_id=p.user_id
     WHERE p.visibility='public' AND p.moderation_status='active'
      AND ($1::uuid IS NULL OR NOT EXISTS(SELECT 1 FROM blocks b WHERE b.user_id=$1 AND b.profile_code=f.code))
      AND ($1::uuid IS NULL OR NOT EXISTS(SELECT 1 FROM hidden_profiles h WHERE h.user_id=$1 AND h.profile_code=f.code))
     ORDER BY ${order} LIMIT $2 OFFSET $3`,
    [viewerUserId,limit+1,offset]
  );
  const hasMore=rows.length>limit;
  const selected=rows.slice(0,limit);
  const profiles=[];
  for(const row of selected){
    const profile=await getProfileByCode(row.code,viewerUserId);
    if(profile)profiles.push(profile);
  }
  return {profiles,total:null,hasMore};
}

async function listFriends(userId){
  if(memoryMode){
    const result=[];for(const code of setFor(mem.friends,userId)){const p=await getProfileByCode(code,userId);if(p)result.push(p)}
    return result;
  }
  const {rows}=await pool.query(`SELECT friend_code FROM saved_friends WHERE user_id=$1 ORDER BY created_at DESC`,[userId]);
  const result=[];for(const row of rows){const p=await getProfileByCode(row.friend_code,userId);if(p)result.push(p)}
  return result;
}

async function saveFriend(userId,code){
  if(memoryMode){if(!mem.codes.has(code))return false;setFor(mem.friends,userId).add(code);return true}
  const exists=await pool.query(`SELECT 1 FROM friend_codes WHERE code=$1`,[code]);if(!exists.rows[0])return false;
  await pool.query(`INSERT INTO saved_friends(user_id,friend_code) VALUES($1,$2) ON CONFLICT DO NOTHING`,[userId,code]);
  return true;
}

async function removeFriend(userId,code){
  if(memoryMode){setFor(mem.friends,userId).delete(code);return}
  await pool.query(`DELETE FROM saved_friends WHERE user_id=$1 AND friend_code=$2`,[userId,code]);
}

async function setReaction(userId,code,reaction){
  if(memoryMode){
    if(!mem.codes.has(code))return false;
    if(reaction)mem.reactions.set(reactionKey(userId,code),{user_id:userId,profile_code:code,reaction,updated_at:now()});
    else mem.reactions.delete(reactionKey(userId,code));
    return true;
  }
  if(!reaction)await pool.query(`DELETE FROM reactions WHERE user_id=$1 AND profile_code=$2`,[userId,code]);
  else await pool.query(
    `INSERT INTO reactions(user_id,profile_code,reaction) VALUES($1,$2,$3)
     ON CONFLICT(user_id,profile_code) DO UPDATE SET reaction=EXCLUDED.reaction,updated_at=NOW()`,
    [userId,code,reaction]
  );
  return true;
}

async function addReport(userId,code,reason){
  if(memoryMode){
    const row={id:mem.reports.length+1,reporter_user_id:userId,profile_code:code,reason,status:"open",created_at:now(),reviewed_at:null};
    mem.reports.push(row);return clone(row);
  }
  const {rows}=await pool.query(
    `INSERT INTO reports(reporter_user_id,profile_code,reason) VALUES($1,$2,$3) RETURNING *`,
    [userId,code,reason]
  );
  return rows[0];
}

async function blockProfile(userId,code){
  if(memoryMode){setFor(mem.blocks,userId).add(code);setFor(mem.hidden,userId).add(code);return}
  await pool.query(`INSERT INTO blocks(user_id,profile_code) VALUES($1,$2) ON CONFLICT DO NOTHING`,[userId,code]);
  await pool.query(`INSERT INTO hidden_profiles(user_id,profile_code) VALUES($1,$2) ON CONFLICT DO NOTHING`,[userId,code]);
}

async function hideProfile(userId,code){
  if(memoryMode){setFor(mem.hidden,userId).add(code);return}
  await pool.query(`INSERT INTO hidden_profiles(user_id,profile_code) VALUES($1,$2) ON CONFLICT DO NOTHING`,[userId,code]);
}

async function listReports(status="open"){
  if(memoryMode)return clone(mem.reports.filter(r=>status==="all"||r.status===status).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))));
  const {rows}=await pool.query(
    `SELECT r.*,p.nickname,p.moderation_status FROM reports r
     LEFT JOIN friend_codes f ON f.code=r.profile_code
     LEFT JOIN profiles p ON p.user_id=f.user_id
     WHERE $1='all' OR r.status=$1 ORDER BY r.created_at DESC LIMIT 300`,
    [status]
  );
  return rows;
}

async function setReportStatus(id,status){
  if(memoryMode){
    const row=mem.reports.find(r=>Number(r.id)===Number(id));if(!row)return null;
    row.status=status;row.reviewed_at=now();return clone(row);
  }
  const {rows}=await pool.query(`UPDATE reports SET status=$2,reviewed_at=NOW() WHERE id=$1 RETURNING *`,[id,status]);
  return rows[0]||null;
}

async function moderateProfile(code,status){
  if(memoryMode){
    const userId=mem.codes.get(code);const row=userId&&mem.profiles.get(userId);if(!row)return null;
    row.moderation_status=status;row.updated_at=now();return clone(row);
  }
  const {rows}=await pool.query(
    `UPDATE profiles p SET moderation_status=$2,updated_at=NOW()
     FROM friend_codes f WHERE f.user_id=p.user_id AND f.code=$1 RETURNING p.*`,
    [code,status]
  );
  return rows[0]||null;
}

async function deleteUser(userId){
  if(memoryMode){
    await deleteProfile(userId);
    mem.reports=mem.reports.filter(report=>report.reporter_user_id!==userId);
    mem.users.delete(userId);mem.saves.delete(userId);mem.entitlements.delete(userId);
    await deleteSessionsForUser(userId);mem.friends.delete(userId);mem.blocks.delete(userId);mem.hidden.delete(userId);
    for(const key of [...mem.reactions.keys()])if(mem.reactions.get(key).user_id===userId)mem.reactions.delete(key);
    return;
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const codeResult=await client.query(`SELECT code FROM friend_codes WHERE user_id=$1`,[userId]);
    const code=codeResult.rows[0]?.code||null;
    await client.query(`DELETE FROM reports WHERE reporter_user_id=$1`,[userId]);
    if(code){
      await client.query(`DELETE FROM reports WHERE profile_code=$1`,[code]);
      await client.query(`DELETE FROM reactions WHERE profile_code=$1`,[code]);
      await client.query(`DELETE FROM blocks WHERE profile_code=$1`,[code]);
      await client.query(`DELETE FROM hidden_profiles WHERE profile_code=$1`,[code]);
    }
    await client.query(`DELETE FROM users WHERE id=$1`,[userId]);
    await client.query("COMMIT");
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}


async function redeemRewardCode(userId,{code,reward,deviceId="reward-code"}){
  const normalized=String(code||"").toUpperCase();
  const rewardData=clone(reward||{});
  const redemptionKey=`${userId}|${normalized}`;

  if(memoryMode){
    if(mem.rewardRedemptions.has(redemptionKey)){
      return {
        alreadyRedeemed:true,
        redemption:clone(mem.rewardRedemptions.get(redemptionKey)),
        save:clone(mem.saves.get(userId)||null)
      };
    }
    const current=mem.saves.get(userId)||{
      user_id:userId,revision:0,device_id:deviceId,state:{},updated_at:now()
    };
    const nextState=clone(current.state||{});
    nextState.coins=Math.max(0,Number(nextState.coins)||0)+Math.max(0,Number(rewardData.coins)||0);
    const row={
      user_id:userId,
      revision:Number(current.revision||0)+1,
      device_id:deviceId,
      state:nextState,
      updated_at:now()
    };
    const redemption={
      user_id:userId,
      code:normalized,
      reward_data:rewardData,
      redeemed_at:now()
    };
    mem.saves.set(userId,row);
    mem.rewardRedemptions.set(redemptionKey,redemption);
    return {alreadyRedeemed:false,redemption:clone(redemption),save:clone(row)};
  }

  const client=await pool.connect();
  try{
    await client.query("BEGIN");

    // Lock the account row so two simultaneous requests cannot both grant coins.
    await client.query(`SELECT id FROM users WHERE id=$1 FOR UPDATE`,[userId]);

    const redeemed=await client.query(
      `SELECT * FROM reward_code_redemptions WHERE user_id=$1 AND code=$2`,
      [userId,normalized]
    );
    if(redeemed.rows[0]){
      const current=await client.query(`SELECT * FROM cloud_saves WHERE user_id=$1`,[userId]);
      await client.query("COMMIT");
      return {
        alreadyRedeemed:true,
        redemption:redeemed.rows[0],
        save:current.rows[0]||null
      };
    }

    const currentResult=await client.query(
      `SELECT * FROM cloud_saves WHERE user_id=$1 FOR UPDATE`,
      [userId]
    );
    const current=currentResult.rows[0]||{
      user_id:userId,revision:0,device_id:deviceId,state:{},updated_at:new Date()
    };
    const nextState=clone(current.state||{});
    nextState.coins=Math.max(0,Number(nextState.coins)||0)+Math.max(0,Number(rewardData.coins)||0);
    const nextRevision=Number(current.revision||0)+1;

    const saveResult=await client.query(
      `INSERT INTO cloud_saves(user_id,revision,device_id,state,updated_at)
       VALUES($1,$2,$3,$4::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        revision=EXCLUDED.revision,
        device_id=EXCLUDED.device_id,
        state=EXCLUDED.state,
        updated_at=NOW()
       RETURNING *`,
      [userId,nextRevision,String(deviceId||"reward-code").slice(0,80),JSON.stringify(nextState)]
    );

    const redemptionResult=await client.query(
      `INSERT INTO reward_code_redemptions(user_id,code,reward_data)
       VALUES($1,$2,$3::jsonb)
       RETURNING *`,
      [userId,normalized,JSON.stringify(rewardData)]
    );

    await client.query("COMMIT");
    return {
      alreadyRedeemed:false,
      redemption:redemptionResult.rows[0],
      save:saveResult.rows[0]
    };
  }catch(error){
    await client.query("ROLLBACK");
    throw error;
  }finally{
    client.release();
  }
}

async function accountSummary(userId){
  const user=await getUserById(userId);
  const save=await getCloudSave(userId);
  const entitlement=await getEntitlement(userId);
  const profile=await getProfileForUser(userId);
  return {user,save,entitlement,profile};
}

module.exports={
  init,mode,createUser,findUserByPlayerId,getUserById,createSession,getSession,deleteSessionsForUser,
  getEntitlement,setEntitlement,getCloudSave,saveCloud,publishProfile,getProfileByCode,getProfileForUser,
  deleteProfile,gallery,listFriends,saveFriend,removeFriend,setReaction,addReport,blockProfile,hideProfile,
  listReports,setReportStatus,moderateProfile,redeemRewardCode,deleteUser,accountSummary
};

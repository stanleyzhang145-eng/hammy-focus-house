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
  rewardRedemptions:new Map(), events:new Map(), eventClaims:new Map(),
  rewardCodes:new Map(), announcements:new Map(),
  audit:[], eventSequence:0, auditSequence:0
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


function applyAdminReward(stateInput,rewardInput,source="admin"){
  const state=clone(stateInput||{});
  const reward=clone(rewardInput||{});
  state.coins=Math.max(0,Number(state.coins)||0)+Math.max(0,Number(reward.coins)||0);
  state.foods={apple:0,banana:0,berry:0,mango:0,...(state.foods||{})};
  for(const key of ["apple","banana","berry","mango"]){
    state.foods[key]=Math.max(0,Number(state.foods[key])||0)+Math.max(0,Number(reward.fruits?.[key])||0);
  }
  if(!Array.isArray(state.adminExclusives))state.adminExclusives=[];
  if(reward.exclusiveId&&!state.adminExclusives.includes(reward.exclusiveId)){
    state.adminExclusives.push(String(reward.exclusiveId));
  }
  if(reward.exclusiveId){
    state.equippedAdminExclusive=String(reward.exclusiveId);
    state.adminExclusiveDisplayDisabled=false;
  }
  if(!Array.isArray(state.adminGiftHistory))state.adminGiftHistory=[];
  state.adminGiftHistory.unshift({
    source,
    title:String(reward.title||"Admin Gift").slice(0,80),
    coins:Math.max(0,Number(reward.coins)||0),
    fruits:clone(reward.fruits||{}),
    exclusiveId:reward.exclusiveId||null,
    grantedAt:now()
  });
  state.adminGiftHistory=state.adminGiftHistory.slice(0,30);
  return state;
}

function appendAdminCommand(stateInput,type,payload={},title="Admin Delivery"){
  const state=clone(stateInput||{});
  if(!Array.isArray(state.adminCommands))state.adminCommands=[];
  state.adminCommands.push({
    id:crypto.randomUUID(),
    type:String(type||"admin"),
    title:String(title||"Admin Delivery").slice(0,80),
    payload:clone(payload||{}),
    createdAt:now()
  });
  state.adminCommands=state.adminCommands.slice(-100);
  return state;
}

async function findUserByIdentifier(identifier){
  const value=String(identifier||"").trim().toUpperCase();
  if(memoryMode){
    let user=null,friendCode=null;
    if(mem.codes.has(value)){
      const userId=mem.codes.get(value);
      user=mem.users.get(userId)||null;
      friendCode=value;
    }else{
      user=[...mem.users.values()].find(row=>String(row.player_id).toUpperCase()===value)||null;
      if(user)friendCode=mem.codeByUser.get(user.id)||null;
    }
    return user?{...clone(user),friend_code:friendCode}:null;
  }
  const {rows}=await pool.query(
    `SELECT u.*,f.code friend_code
     FROM users u
     LEFT JOIN friend_codes f ON f.user_id=u.id
     WHERE UPPER(u.player_id)=UPPER($1) OR UPPER(COALESCE(f.code,''))=UPPER($1)
     LIMIT 1`,
    [value]
  );
  return rows[0]||null;
}

async function addAudit(action,{targetUserId=null,targetPlayerId=null,details={}}={}){
  if(memoryMode){
    const row={
      id:++mem.auditSequence,
      action:String(action),
      target_user_id:targetUserId,
      target_player_id:targetPlayerId,
      details:clone(details),
      created_at:now()
    };
    mem.audit.unshift(row);
    mem.audit=mem.audit.slice(0,500);
    return clone(row);
  }
  const {rows}=await pool.query(
    `INSERT INTO admin_audit_log(action,target_user_id,target_player_id,details)
     VALUES($1,$2,$3,$4::jsonb) RETURNING *`,
    [String(action),targetUserId,targetPlayerId,JSON.stringify(details||{})]
  );
  return rows[0];
}

async function adminPlayerSummary(identifier){
  const user=await findUserByIdentifier(identifier);
  if(!user)return null;
  const save=await getCloudSave(user.id);
  const entitlement=await getEntitlement(user.id);
  const profile=await getProfileForUser(user.id);
  const state=clone(save?.state||{});
  return {
    userId:user.id,
    playerId:user.player_id,
    friendCode:user.friend_code||profile?.code||null,
    nickname:profile?.nickname||null,
    premium:Boolean(entitlement?.active),
    premiumSource:entitlement?.source||"none",
    revision:Number(save?.revision)||0,
    updatedAt:save?.updated_at||null,
    progress:{
      coins:Math.max(0,Number(state.coins)||0),
      practiceDays:Math.max(0,Number(state.practiceDays)||0),
      totalFocusMinutes:Math.max(0,Number(state.totalFocusMinutes)||0),
      streak:Math.max(0,Number(state.streak)||0),
      skin:String(state.skin||"white"),
      adminExclusives:Array.isArray(state.adminExclusives)?state.adminExclusives:[]
    }
  };
}

async function adminGrant(identifier,{reward,note="",deviceId="admin-panel"}){
  const user=await findUserByIdentifier(identifier);
  if(!user)return null;
  const safeReward=clone(reward||{});

  if(memoryMode){
    const current=mem.saves.get(user.id)||{
      user_id:user.id,revision:0,device_id:deviceId,state:{},updated_at:now()
    };
    let nextState=applyAdminReward(current.state,safeReward,"admin-grant");
    nextState=appendAdminCommand(
      nextState,
      "grantReward",
      {reward:safeReward},
      safeReward.title||"Admin Gift"
    );
    const row={
      user_id:user.id,
      revision:Number(current.revision||0)+1,
      device_id:deviceId,
      state:nextState,
      updated_at:now()
    };
    mem.saves.set(user.id,row);
    await addAudit("player_reward_grant",{
      targetUserId:user.id,targetPlayerId:user.player_id,
      details:{reward:safeReward,note:String(note||"").slice(0,160),revision:row.revision}
    });
    return {save:clone(row),player:await adminPlayerSummary(user.player_id)};
  }

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(`SELECT id FROM users WHERE id=$1 FOR UPDATE`,[user.id]);
    const currentResult=await client.query(`SELECT * FROM cloud_saves WHERE user_id=$1 FOR UPDATE`,[user.id]);
    const current=currentResult.rows[0]||{
      user_id:user.id,revision:0,device_id:deviceId,state:{},updated_at:new Date()
    };
    let nextState=applyAdminReward(current.state,safeReward,"admin-grant");
    nextState=appendAdminCommand(
      nextState,
      "grantReward",
      {reward:safeReward},
      safeReward.title||"Admin Gift"
    );
    const nextRevision=Number(current.revision||0)+1;
    const {rows}=await client.query(
      `INSERT INTO cloud_saves(user_id,revision,device_id,state,updated_at)
       VALUES($1,$2,$3,$4::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        revision=EXCLUDED.revision,device_id=EXCLUDED.device_id,
        state=EXCLUDED.state,updated_at=NOW()
       RETURNING *`,
      [user.id,nextRevision,String(deviceId||"admin-panel").slice(0,80),JSON.stringify(nextState)]
    );
    await client.query(
      `INSERT INTO admin_audit_log(action,target_user_id,target_player_id,details)
       VALUES('player_reward_grant',$1,$2,$3::jsonb)`,
      [user.id,user.player_id,JSON.stringify({
        reward:safeReward,note:String(note||"").slice(0,160),revision:nextRevision
      })]
    );
    await client.query("COMMIT");
    return {save:rows[0],player:await adminPlayerSummary(user.player_id)};
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function createAdminEvent(event){
  const row={
    id:event.id,
    event_type:event.eventType,
    title:event.title,
    description:event.description,
    reward_data:clone(event.reward||{}),
    starts_at:event.startsAt||now(),
    ends_at:event.endsAt,
    status:"active",
    created_at:now()
  };
  if(memoryMode){
    for(const existing of mem.events.values()){
      if(existing.status==="active"){
        existing.status="ended";
        existing.ends_at=now();
      }
    }
    mem.events.set(row.id,row);
    await addAudit("event_created",{details:{
      eventId:row.id,eventType:row.event_type,title:row.title,
      endsAt:row.ends_at,reward:row.reward_data,replacedPreviousEvent:true
    }});
    return clone(row);
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(
      `UPDATE admin_events SET status='ended',ends_at=NOW()
       WHERE status='active' AND ends_at>NOW()`
    );
    const {rows}=await client.query(
      `INSERT INTO admin_events(id,event_type,title,description,reward_data,starts_at,ends_at,status)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,'active') RETURNING *`,
      [row.id,row.event_type,row.title,row.description,JSON.stringify(row.reward_data),row.starts_at,row.ends_at]
    );
    await client.query(
      `INSERT INTO admin_audit_log(action,details)
       VALUES('event_created',$1::jsonb)`,
      [JSON.stringify({
        eventId:row.id,eventType:row.event_type,title:row.title,
        endsAt:row.ends_at,reward:row.reward_data,replacedPreviousEvent:true
      })]
    );
    await client.query("COMMIT");
    return rows[0];
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function listAdminEvents(limit=50){
  if(memoryMode){
    return clone([...mem.events.values()]
      .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0,limit)
      .map(event=>({
        ...event,
        claim_count:[...mem.eventClaims.values()].filter(claim=>claim.event_id===event.id).length
      })));
  }
  const {rows}=await pool.query(
    `SELECT e.*,(SELECT COUNT(*)::int FROM event_claims c WHERE c.event_id=e.id) claim_count
     FROM admin_events e ORDER BY e.created_at DESC LIMIT $1`,
    [Math.max(1,Math.min(200,Number(limit)||50))]
  );
  return rows;
}

async function getActiveEvent(userId=null){
  const currentTime=Date.now();
  if(memoryMode){
    const events=[...mem.events.values()].filter(event=>
      event.status==="active" &&
      new Date(event.starts_at).getTime()<=currentTime &&
      new Date(event.ends_at).getTime()>currentTime
    ).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    const event=events[0]||null;
    if(!event)return null;
    const claim=userId?mem.eventClaims.get(`${event.id}|${userId}`):null;
    return {...clone(event),claimed:Boolean(claim),claimed_at:claim?.claimed_at||null};
  }
  const {rows}=await pool.query(
    `SELECT e.*,
      CASE WHEN $1::uuid IS NULL THEN FALSE
      ELSE EXISTS(SELECT 1 FROM event_claims c WHERE c.event_id=e.id AND c.user_id=$1) END claimed,
      (SELECT claimed_at FROM event_claims c WHERE c.event_id=e.id AND c.user_id=$1) claimed_at
     FROM admin_events e
     WHERE e.status='active' AND e.starts_at<=NOW() AND e.ends_at>NOW()
     ORDER BY e.created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0]||null;
}

async function claimAdminEvent(eventId,userId,deviceId="event-claim"){
  if(memoryMode){
    const event=mem.events.get(eventId);
    if(!event||event.status!=="active"||new Date(event.ends_at).getTime()<=Date.now())return {notActive:true};
    const key=`${eventId}|${userId}`;
    if(mem.eventClaims.has(key)){
      return {alreadyClaimed:true,event:clone(event),save:clone(mem.saves.get(userId)||null)};
    }
    const current=mem.saves.get(userId)||{
      user_id:userId,revision:0,device_id:deviceId,state:{},updated_at:now()
    };
    const nextState=applyAdminReward(current.state,event.reward_data,`event:${eventId}`);
    const row={
      user_id:userId,revision:Number(current.revision||0)+1,
      device_id:deviceId,state:nextState,updated_at:now()
    };
    const claim={event_id:eventId,user_id:userId,reward_data:clone(event.reward_data),claimed_at:now()};
    mem.saves.set(userId,row);mem.eventClaims.set(key,claim);
    return {alreadyClaimed:false,event:clone(event),save:clone(row),claim:clone(claim)};
  }

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(`SELECT id FROM users WHERE id=$1 FOR UPDATE`,[userId]);
    const eventResult=await client.query(
      `SELECT * FROM admin_events WHERE id=$1 FOR UPDATE`,
      [eventId]
    );
    const event=eventResult.rows[0];
    if(!event||event.status!=="active"||new Date(event.ends_at).getTime()<=Date.now()){
      await client.query("ROLLBACK");return {notActive:true};
    }
    const claimed=await client.query(
      `SELECT * FROM event_claims WHERE event_id=$1 AND user_id=$2`,
      [eventId,userId]
    );
    if(claimed.rows[0]){
      const current=await client.query(`SELECT * FROM cloud_saves WHERE user_id=$1`,[userId]);
      await client.query("COMMIT");
      return {alreadyClaimed:true,event,save:current.rows[0]||null,claim:claimed.rows[0]};
    }
    const currentResult=await client.query(`SELECT * FROM cloud_saves WHERE user_id=$1 FOR UPDATE`,[userId]);
    const current=currentResult.rows[0]||{
      user_id:userId,revision:0,device_id:deviceId,state:{},updated_at:new Date()
    };
    const nextState=applyAdminReward(current.state,event.reward_data,`event:${eventId}`);
    const nextRevision=Number(current.revision||0)+1;
    const saveResult=await client.query(
      `INSERT INTO cloud_saves(user_id,revision,device_id,state,updated_at)
       VALUES($1,$2,$3,$4::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        revision=EXCLUDED.revision,device_id=EXCLUDED.device_id,
        state=EXCLUDED.state,updated_at=NOW()
       RETURNING *`,
      [userId,nextRevision,String(deviceId||"event-claim").slice(0,80),JSON.stringify(nextState)]
    );
    const claimResult=await client.query(
      `INSERT INTO event_claims(event_id,user_id,reward_data)
       VALUES($1,$2,$3::jsonb) RETURNING *`,
      [eventId,userId,JSON.stringify(event.reward_data||{})]
    );
    await client.query("COMMIT");
    return {alreadyClaimed:false,event,save:saveResult.rows[0],claim:claimResult.rows[0]};
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function updateAdminEventStatus(eventId,status){
  const safeStatus=["active","ended","cancelled"].includes(status)?status:"ended";
  if(memoryMode){
    const event=mem.events.get(eventId);if(!event)return null;
    event.status=safeStatus;
    if(safeStatus!=="active")event.ends_at=now();
    await addAudit("event_status_changed",{details:{eventId,status:safeStatus}});
    return clone(event);
  }
  const {rows}=await pool.query(
    `UPDATE admin_events SET status=$2,
      ends_at=CASE WHEN $2='active' THEN ends_at ELSE NOW() END
     WHERE id=$1 RETURNING *`,
    [eventId,safeStatus]
  );
  if(rows[0])await addAudit("event_status_changed",{details:{eventId,status:safeStatus}});
  return rows[0]||null;
}


async function searchAdminPlayers(query,limit=25){
  const value=String(query||"").trim().toLowerCase();
  const safeLimit=Math.max(1,Math.min(50,Number(limit)||25));
  if(memoryMode){
    const results=[];
    for(const user of mem.users.values()){
      const profile=mem.profiles.get(user.id);
      const code=mem.codeByUser.get(user.id)||null;
      const haystack=[user.player_id,code,profile?.nickname].filter(Boolean).join(" ").toLowerCase();
      if(value&&!haystack.includes(value))continue;
      const summary=await adminPlayerSummary(user.player_id);
      if(summary)results.push(summary);
      if(results.length>=safeLimit)break;
    }
    return results;
  }
  const {rows}=await pool.query(
    `SELECT u.player_id
     FROM users u
     LEFT JOIN friend_codes f ON f.user_id=u.id
     LEFT JOIN profiles p ON p.user_id=u.id
     WHERE $1='' OR LOWER(u.player_id) LIKE '%'||$1||'%'
       OR LOWER(COALESCE(f.code,'')) LIKE '%'||$1||'%'
       OR LOWER(COALESCE(p.nickname,'')) LIKE '%'||$1||'%'
     ORDER BY u.updated_at DESC LIMIT $2`,
    [value,safeLimit]
  );
  const results=[];
  for(const row of rows){
    const summary=await adminPlayerSummary(row.player_id);
    if(summary)results.push(summary);
  }
  return results;
}

async function adminSetCoins(identifier,coins){
  const user=await findUserByIdentifier(identifier);
  if(!user)return null;
  const exact=Math.max(0,Math.min(1000000000,Number(coins)||0));

  if(memoryMode){
    const current=mem.saves.get(user.id)||{
      user_id:user.id,revision:0,device_id:"admin-set-coins",state:{},updated_at:now()
    };
    let nextState=clone(current.state||{});
    nextState.coins=exact;
    nextState=appendAdminCommand(
      nextState,"setCoins",{coins:exact},"Coin Balance Correction"
    );
    const row={
      user_id:user.id,revision:Number(current.revision||0)+1,
      device_id:"admin-set-coins",state:nextState,updated_at:now()
    };
    mem.saves.set(user.id,row);
    await addAudit("player_coins_set",{
      targetUserId:user.id,targetPlayerId:user.player_id,
      details:{coins:exact,revision:row.revision}
    });
    return {save:clone(row),player:await adminPlayerSummary(user.player_id)};
  }

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(`SELECT id FROM users WHERE id=$1 FOR UPDATE`,[user.id]);
    const currentResult=await client.query(
      `SELECT * FROM cloud_saves WHERE user_id=$1 FOR UPDATE`,
      [user.id]
    );
    const current=currentResult.rows[0]||{revision:0,state:{}};
    let nextState=clone(current.state||{});
    nextState.coins=exact;
    nextState=appendAdminCommand(
      nextState,"setCoins",{coins:exact},"Coin Balance Correction"
    );
    const nextRevision=Number(current.revision||0)+1;
    const {rows}=await client.query(
      `INSERT INTO cloud_saves(user_id,revision,device_id,state,updated_at)
       VALUES($1,$2,'admin-set-coins',$3::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        revision=EXCLUDED.revision,device_id=EXCLUDED.device_id,
        state=EXCLUDED.state,updated_at=NOW()
       RETURNING *`,
      [user.id,nextRevision,JSON.stringify(nextState)]
    );
    await client.query(
      `INSERT INTO admin_audit_log(action,target_user_id,target_player_id,details)
       VALUES('player_coins_set',$1,$2,$3::jsonb)`,
      [user.id,user.player_id,JSON.stringify({coins:exact,revision:nextRevision})]
    );
    await client.query("COMMIT");
    return {save:rows[0],player:await adminPlayerSummary(user.player_id)};
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function adminRemoveExclusive(identifier,exclusiveId){
  const user=await findUserByIdentifier(identifier);
  if(!user)return null;
  const id=String(exclusiveId||"");

  if(memoryMode){
    const current=mem.saves.get(user.id)||{
      user_id:user.id,revision:0,device_id:"admin-remove-exclusive",state:{},updated_at:now()
    };
    let nextState=clone(current.state||{});
    nextState.adminExclusives=(Array.isArray(nextState.adminExclusives)?nextState.adminExclusives:[])
      .filter(item=>item!==id);
    if(nextState.equippedAdminExclusive===id)nextState.equippedAdminExclusive=null;
    nextState=appendAdminCommand(
      nextState,"removeExclusive",{exclusiveId:id},"Exclusive Item Removed"
    );
    const row={
      user_id:user.id,revision:Number(current.revision||0)+1,
      device_id:"admin-remove-exclusive",state:nextState,updated_at:now()
    };
    mem.saves.set(user.id,row);
    await addAudit("player_exclusive_removed",{
      targetUserId:user.id,targetPlayerId:user.player_id,
      details:{exclusiveId:id,revision:row.revision}
    });
    return {save:clone(row),player:await adminPlayerSummary(user.player_id)};
  }

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(`SELECT id FROM users WHERE id=$1 FOR UPDATE`,[user.id]);
    const currentResult=await client.query(
      `SELECT * FROM cloud_saves WHERE user_id=$1 FOR UPDATE`,
      [user.id]
    );
    const current=currentResult.rows[0]||{revision:0,state:{}};
    let nextState=clone(current.state||{});
    nextState.adminExclusives=(Array.isArray(nextState.adminExclusives)?nextState.adminExclusives:[])
      .filter(item=>item!==id);
    if(nextState.equippedAdminExclusive===id)nextState.equippedAdminExclusive=null;
    nextState=appendAdminCommand(
      nextState,"removeExclusive",{exclusiveId:id},"Exclusive Item Removed"
    );
    const nextRevision=Number(current.revision||0)+1;
    const {rows}=await client.query(
      `INSERT INTO cloud_saves(user_id,revision,device_id,state,updated_at)
       VALUES($1,$2,'admin-remove-exclusive',$3::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        revision=EXCLUDED.revision,device_id=EXCLUDED.device_id,
        state=EXCLUDED.state,updated_at=NOW()
       RETURNING *`,
      [user.id,nextRevision,JSON.stringify(nextState)]
    );
    await client.query(
      `INSERT INTO admin_audit_log(action,target_user_id,target_player_id,details)
       VALUES('player_exclusive_removed',$1,$2,$3::jsonb)`,
      [user.id,user.player_id,JSON.stringify({exclusiveId:id,revision:nextRevision})]
    );
    await client.query("COMMIT");
    return {save:rows[0],player:await adminPlayerSummary(user.player_id)};
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function adminSetPremium(identifier,active){
  const user=await findUserByIdentifier(identifier);
  if(!user)return null;
  const enabled=Boolean(active);
  const entitlement=await setEntitlement(user.id,{
    active:enabled,source:enabled?"admin-preview":"none"
  });
  const current=await getCloudSave(user.id);
  let state=clone(current?.state||{});
  state.premium=enabled;
  state.premiumDemoEntitlement=enabled;
  if(!enabled)state.skin="normal_white";
  state=appendAdminCommand(
    state,
    "setPremium",
    {active:enabled},
    enabled?"Premium Preview Granted":"Premium Preview Revoked"
  );
  await saveCloud(user.id,{
    baseRevision:Number(current?.revision)||0,
    deviceId:"admin-premium",
    state,force:true
  });
  await addAudit(
    enabled?"player_premium_preview_granted":"player_premium_preview_revoked",
    {targetUserId:user.id,targetPlayerId:user.player_id,details:{active:enabled}}
  );
  return {entitlement,player:await adminPlayerSummary(user.player_id)};
}

async function createAdminRewardCode(input){
  const row={
    code:String(input.code||"").toUpperCase(),
    title:String(input.title||"Reward Code"),
    description:String(input.description||"Special Hammy reward."),
    reward_data:clone(input.reward||{}),
    max_redemptions:input.maxRedemptions==null?null:Number(input.maxRedemptions),
    starts_at:input.startsAt||now(),
    ends_at:input.endsAt||null,
    status:"active",
    created_at:now()
  };
  if(memoryMode){
    if(mem.rewardCodes.has(row.code)){
      const error=new Error("That reward code already exists.");
      error.code="DUPLICATE_CODE";throw error;
    }
    mem.rewardCodes.set(row.code,row);
    await addAudit("reward_code_created",{details:{
      code:row.code,title:row.title,reward:row.reward_data,
      maxRedemptions:row.max_redemptions,endsAt:row.ends_at
    }});
    return clone(row);
  }
  try{
    const {rows}=await pool.query(
      `INSERT INTO admin_reward_codes(
        code,title,description,reward_data,max_redemptions,starts_at,ends_at,status
       ) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,'active') RETURNING *`,
      [row.code,row.title,row.description,JSON.stringify(row.reward_data),
       row.max_redemptions,row.starts_at,row.ends_at]
    );
    await addAudit("reward_code_created",{details:{
      code:row.code,title:row.title,reward:row.reward_data,
      maxRedemptions:row.max_redemptions,endsAt:row.ends_at
    }});
    return rows[0];
  }catch(error){
    if(error.code==="23505"){
      const duplicate=new Error("That reward code already exists.");
      duplicate.code="DUPLICATE_CODE";throw duplicate;
    }
    throw error;
  }
}

async function listAdminRewardCodes(limit=100){
  const safeLimit=Math.max(1,Math.min(300,Number(limit)||100));
  if(memoryMode){
    return clone([...mem.rewardCodes.values()]
      .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0,safeLimit)
      .map(row=>({
        ...row,
        redemption_count:[...mem.rewardRedemptions.values()]
          .filter(item=>item.code===row.code).length
      })));
  }
  const {rows}=await pool.query(
    `SELECT c.*,
      (SELECT COUNT(*)::int FROM reward_code_redemptions r WHERE r.code=c.code)
      redemption_count
     FROM admin_reward_codes c
     ORDER BY c.created_at DESC LIMIT $1`,
    [safeLimit]
  );
  return rows;
}

async function updateAdminRewardCodeStatus(code,status){
  const safeStatus=status==="active"?"active":"disabled";
  if(memoryMode){
    const row=mem.rewardCodes.get(code);if(!row)return null;
    row.status=safeStatus;
    await addAudit("reward_code_status_changed",{details:{code,status:safeStatus}});
    return clone(row);
  }
  const {rows}=await pool.query(
    `UPDATE admin_reward_codes SET status=$2 WHERE code=$1 RETURNING *`,
    [code,safeStatus]
  );
  if(rows[0])await addAudit("reward_code_status_changed",{details:{code,status:safeStatus}});
  return rows[0]||null;
}

async function redeemManagedRewardCode(userId,code,deviceId="reward-code"){
  const normalized=String(code||"").toUpperCase();
  if(memoryMode){
    const row=mem.rewardCodes.get(normalized);
    if(!row)return {notFound:true};
    const currentTime=Date.now();
    if(row.status!=="active"||
      new Date(row.starts_at).getTime()>currentTime||
      (row.ends_at&&new Date(row.ends_at).getTime()<=currentTime)){
      return {inactive:true};
    }
    const key=`${userId}|${normalized}`;
    if(mem.rewardRedemptions.has(key)){
      return {
        alreadyRedeemed:true,
        save:clone(mem.saves.get(userId)||null),
        codeRow:clone(row)
      };
    }
    const count=[...mem.rewardRedemptions.values()]
      .filter(item=>item.code===normalized).length;
    if(row.max_redemptions!=null&&count>=Number(row.max_redemptions)){
      return {limitReached:true};
    }
    const current=mem.saves.get(userId)||{
      user_id:userId,revision:0,device_id:deviceId,state:{},updated_at:now()
    };
    const nextState=applyAdminReward(current.state,row.reward_data,`reward-code:${normalized}`);
    const save={
      user_id:userId,revision:Number(current.revision||0)+1,
      device_id:deviceId,state:nextState,updated_at:now()
    };
    const redemption={
      user_id:userId,code:normalized,
      reward_data:clone(row.reward_data),redeemed_at:now()
    };
    mem.saves.set(userId,save);
    mem.rewardRedemptions.set(key,redemption);
    return {redeemed:true,save:clone(save),codeRow:clone(row),redemption:clone(redemption)};
  }

  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const codeResult=await client.query(
      `SELECT * FROM admin_reward_codes WHERE code=$1 FOR UPDATE`,
      [normalized]
    );
    const row=codeResult.rows[0];
    if(!row){await client.query("ROLLBACK");return {notFound:true}}
    const currentTime=Date.now();
    if(row.status!=="active"||
      new Date(row.starts_at).getTime()>currentTime||
      (row.ends_at&&new Date(row.ends_at).getTime()<=currentTime)){
      await client.query("ROLLBACK");return {inactive:true};
    }
    const redeemedResult=await client.query(
      `SELECT * FROM reward_code_redemptions WHERE user_id=$1 AND code=$2`,
      [userId,normalized]
    );
    if(redeemedResult.rows[0]){
      const saveResult=await client.query(
        `SELECT * FROM cloud_saves WHERE user_id=$1`,[userId]
      );
      await client.query("COMMIT");
      return {alreadyRedeemed:true,save:saveResult.rows[0]||null,codeRow:row};
    }
    if(row.max_redemptions!=null){
      const countResult=await client.query(
        `SELECT COUNT(*)::int count FROM reward_code_redemptions WHERE code=$1`,
        [normalized]
      );
      if(Number(countResult.rows[0].count)>=Number(row.max_redemptions)){
        await client.query("ROLLBACK");return {limitReached:true};
      }
    }
    await client.query(`SELECT id FROM users WHERE id=$1 FOR UPDATE`,[userId]);
    const currentResult=await client.query(
      `SELECT * FROM cloud_saves WHERE user_id=$1 FOR UPDATE`,[userId]
    );
    const current=currentResult.rows[0]||{revision:0,state:{}};
    const nextState=applyAdminReward(current.state,row.reward_data,`reward-code:${normalized}`);
    const nextRevision=Number(current.revision||0)+1;
    const saveResult=await client.query(
      `INSERT INTO cloud_saves(user_id,revision,device_id,state,updated_at)
       VALUES($1,$2,$3,$4::jsonb,NOW())
       ON CONFLICT(user_id) DO UPDATE SET
        revision=EXCLUDED.revision,device_id=EXCLUDED.device_id,
        state=EXCLUDED.state,updated_at=NOW()
       RETURNING *`,
      [userId,nextRevision,String(deviceId||"reward-code").slice(0,80),
       JSON.stringify(nextState)]
    );
    const redemptionResult=await client.query(
      `INSERT INTO reward_code_redemptions(user_id,code,reward_data)
       VALUES($1,$2,$3::jsonb) RETURNING *`,
      [userId,normalized,JSON.stringify(row.reward_data||{})]
    );
    await client.query("COMMIT");
    return {
      redeemed:true,save:saveResult.rows[0],
      codeRow:row,redemption:redemptionResult.rows[0]
    };
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function createAnnouncement(input){
  const row={
    id:input.id,
    title:String(input.title||"Hammy News"),
    message:String(input.message||""),
    priority:["normal","important","celebration"].includes(input.priority)
      ?input.priority:"normal",
    starts_at:input.startsAt||now(),
    ends_at:input.endsAt,
    status:"active",
    created_at:now()
  };
  if(memoryMode){
    for(const item of mem.announcements.values()){
      if(item.status==="active")item.status="ended";
    }
    mem.announcements.set(row.id,row);
    await addAudit("announcement_created",{details:{
      id:row.id,title:row.title,priority:row.priority,endsAt:row.ends_at
    }});
    return clone(row);
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(
      `UPDATE admin_announcements SET status='ended' WHERE status='active'`
    );
    const {rows}=await client.query(
      `INSERT INTO admin_announcements(
        id,title,message,priority,starts_at,ends_at,status
       ) VALUES($1,$2,$3,$4,$5,$6,'active') RETURNING *`,
      [row.id,row.title,row.message,row.priority,row.starts_at,row.ends_at]
    );
    await client.query(
      `INSERT INTO admin_audit_log(action,details)
       VALUES('announcement_created',$1::jsonb)`,
      [JSON.stringify({
        id:row.id,title:row.title,priority:row.priority,endsAt:row.ends_at
      })]
    );
    await client.query("COMMIT");
    return rows[0];
  }catch(error){
    await client.query("ROLLBACK");throw error;
  }finally{client.release()}
}

async function listAnnouncements(limit=100){
  const safeLimit=Math.max(1,Math.min(200,Number(limit)||100));
  if(memoryMode){
    return clone([...mem.announcements.values()]
      .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0,safeLimit));
  }
  const {rows}=await pool.query(
    `SELECT * FROM admin_announcements ORDER BY created_at DESC LIMIT $1`,
    [safeLimit]
  );
  return rows;
}

async function getActiveAnnouncement(){
  const current=Date.now();
  if(memoryMode){
    return clone([...mem.announcements.values()]
      .filter(row=>row.status==="active"&&
        new Date(row.starts_at).getTime()<=current&&
        new Date(row.ends_at).getTime()>current)
      .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0]||null);
  }
  const {rows}=await pool.query(
    `SELECT * FROM admin_announcements
     WHERE status='active' AND starts_at<=NOW() AND ends_at>NOW()
     ORDER BY created_at DESC LIMIT 1`
  );
  return rows[0]||null;
}

async function updateAnnouncementStatus(id,status){
  const safeStatus=status==="active"?"active":"ended";
  if(memoryMode){
    const row=mem.announcements.get(id);if(!row)return null;
    row.status=safeStatus;
    if(safeStatus==="ended")row.ends_at=now();
    await addAudit("announcement_status_changed",{details:{id,status:safeStatus}});
    return clone(row);
  }
  const {rows}=await pool.query(
    `UPDATE admin_announcements SET status=$2,
      ends_at=CASE WHEN $2='ended' THEN NOW() ELSE ends_at END
     WHERE id=$1 RETURNING *`,
    [id,safeStatus]
  );
  if(rows[0])await addAudit("announcement_status_changed",{details:{id,status:safeStatus}});
  return rows[0]||null;
}

async function adminStats(){
  if(memoryMode){
    const saveStates=[...mem.saves.values()].map(row=>row.state||{});
    return {
      users:mem.users.size,
      cloudSaves:mem.saves.size,
      publicProfiles:[...mem.profiles.values()]
        .filter(profile=>profile.visibility==="public"&&profile.moderation_status==="active").length,
      openReports:mem.reports.filter(report=>report.status==="open").length,
      activeEvents:[...mem.events.values()]
        .filter(event=>event.status==="active"&&
          new Date(event.starts_at).getTime()<=Date.now()&&
          new Date(event.ends_at).getTime()>Date.now()).length,
      totalEventClaims:mem.eventClaims.size,
      totalAdminActions:mem.audit.length,
      premiumAccounts:[...mem.entitlements.values()].filter(row=>row.active).length,
      totalCoins:saveStates.reduce((sum,state)=>sum+Math.max(0,Number(state.coins)||0),0),
      totalFocusMinutes:saveStates.reduce((sum,state)=>sum+
        Math.max(0,Number(state.totalFocusMinutes)||0),0),
      rewardCodeRedemptions:mem.rewardRedemptions.size,
      activeRewardCodes:[...mem.rewardCodes.values()]
        .filter(row=>row.status==="active").length,
      activeAnnouncements:[...mem.announcements.values()]
        .filter(row=>row.status==="active"&&
          new Date(row.starts_at).getTime()<=Date.now()&&
          new Date(row.ends_at).getTime()>Date.now()).length
    };
  }
  const {rows}=await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM users) users,
      (SELECT COUNT(*)::int FROM cloud_saves) cloud_saves,
      (SELECT COUNT(*)::int FROM profiles
        WHERE visibility='public' AND moderation_status='active') public_profiles,
      (SELECT COUNT(*)::int FROM reports WHERE status='open') open_reports,
      (SELECT COUNT(*)::int FROM admin_events
        WHERE status='active' AND starts_at<=NOW() AND ends_at>NOW()) active_events,
      (SELECT COUNT(*)::int FROM event_claims) total_event_claims,
      (SELECT COUNT(*)::int FROM admin_audit_log) total_admin_actions,
      (SELECT COUNT(*)::int FROM premium_entitlements WHERE active=TRUE) premium_accounts,
      (SELECT COALESCE(SUM(GREATEST(
        0,COALESCE((state->>'coins')::bigint,0)
      )),0)::bigint FROM cloud_saves) total_coins,
      (SELECT COALESCE(SUM(GREATEST(
        0,COALESCE((state->>'totalFocusMinutes')::numeric,0)
      )),0)::numeric FROM cloud_saves) total_focus_minutes,
      (SELECT COUNT(*)::int FROM reward_code_redemptions) reward_code_redemptions,
      (SELECT COUNT(*)::int FROM admin_reward_codes
        WHERE status='active') active_reward_codes,
      (SELECT COUNT(*)::int FROM admin_announcements
        WHERE status='active' AND starts_at<=NOW() AND ends_at>NOW())
        active_announcements`
  );
  const row=rows[0];
  return {
    users:row.users,cloudSaves:row.cloud_saves,
    publicProfiles:row.public_profiles,openReports:row.open_reports,
    activeEvents:row.active_events,totalEventClaims:row.total_event_claims,
    totalAdminActions:row.total_admin_actions,premiumAccounts:row.premium_accounts,
    totalCoins:Number(row.total_coins)||0,
    totalFocusMinutes:Number(row.total_focus_minutes)||0,
    rewardCodeRedemptions:row.reward_code_redemptions,
    activeRewardCodes:row.active_reward_codes,
    activeAnnouncements:row.active_announcements
  };
}

async function listAudit(limit=100){
  if(memoryMode)return clone(mem.audit.slice(0,Math.max(1,Math.min(300,Number(limit)||100))));
  const {rows}=await pool.query(
    `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT $1`,
    [Math.max(1,Math.min(300,Number(limit)||100))]
  );
  return rows;
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
  listReports,setReportStatus,moderateProfile,redeemRewardCode,
  findUserByIdentifier,searchAdminPlayers,adminPlayerSummary,adminGrant,
  adminSetCoins,adminRemoveExclusive,adminSetPremium,
  createAdminEvent,listAdminEvents,getActiveEvent,claimAdminEvent,updateAdminEventStatus,
  createAdminRewardCode,listAdminRewardCodes,updateAdminRewardCodeStatus,
  redeemManagedRewardCode,createAnnouncement,listAnnouncements,
  getActiveAnnouncement,updateAnnouncementStatus,
  adminStats,listAudit,addAudit,deleteUser,accountSummary
};

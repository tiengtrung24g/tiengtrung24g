const RURL = process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN;
const TPASS = process.env.TEACHER_PASS || '';

async function redis(cmd){
  const r = await fetch(RURL, { method:'POST', headers:{ Authorization:'Bearer '+RTOK, 'Content-Type':'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  return j.result;
}
async function pipe(cmds){
  await fetch(RURL+'/pipeline', { method:'POST', headers:{ Authorization:'Bearer '+RTOK, 'Content-Type':'application/json' }, body: JSON.stringify(cmds) });
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json' };
  if (event.httpMethod==='OPTIONS') return { statusCode:204, headers, body:'' };
  if (event.httpMethod!=='POST') return { statusCode:405, headers, body:'{}' };
  if (!RURL || !RTOK) return { statusCode:200, headers, body: JSON.stringify({ error:'NO_STORE' }) };
  let req; try { req = JSON.parse(event.body||'{}'); } catch(e){ return { statusCode:400, headers, body:'{}' }; }

  try {
    if (req.action === 'submit'){
      const rec = req.record || {};
      const cls = String(rec.cls||'?').slice(0,40);
      rec.ts = Date.now();
      const key = 'cls:'+cls;
      await pipe([['LPUSH', key, JSON.stringify(rec)], ['LTRIM', key, '0', '19999'], ['SADD', 'classes', cls]]);
      return { statusCode:200, headers, body: JSON.stringify({ ok:true }) };
    }
    if (req.action === 'report'){
      if (TPASS && req.pass !== TPASS) return { statusCode:200, headers, body: JSON.stringify({ error:'BAD_PASS' }) };
      if (req.cls === '__list__'){
        const cl = await redis(['SMEMBERS','classes']);
        return { statusCode:200, headers, body: JSON.stringify({ classes: cl||[] }) };
      }
      const cls = String(req.cls||'').slice(0,40);
      const arr = await redis(['LRANGE', 'cls:'+cls, '0', '-1']) || [];
      const records = arr.map(function(s){ try { return JSON.parse(s); } catch(e){ return null; } }).filter(Boolean);
      return { statusCode:200, headers, body: JSON.stringify({ records: records }) };
    }
    return { statusCode:400, headers, body:'{}' };
  } catch(e){
    return { statusCode:502, headers, body: JSON.stringify({ error: String(e) }) };
  }
};

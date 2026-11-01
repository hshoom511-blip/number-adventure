const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const eq=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;let x=new TextEncoder().encode(a),y=new TextEncoder().encode(b),v=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)v|=(x[i]||0)^(y[i]||0);return v===0};
export default {async fetch(request,env){let url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
if(request.method==='OPTIONS')return new Response(null,{status:405});
try{
if(url.pathname==='/api/submit'&&request.method==='POST'){
const len=Number(request.headers.get('content-length')||0);if(len>12000)return json({error:'حجم البيانات كبير'},413);
let body=await request.json(),name=String(body.name||'').trim().replace(/\s+/g,' '),answers=body.answers;
if(name.length<2||name.length>70||!Array.isArray(answers)||answers.length!==10)return json({error:'بيانات غير صالحة'},400);
let correct=0,attempts=0,clean=[];
for(const a of answers){if(!a||!['order','pick'].includes(a.type)||!Array.isArray(a.expected)||!Array.isArray(a.given)||a.expected.length<1||a.expected.length>5||a.given.length!==a.expected.length||!a.expected.every(n=>Number.isInteger(n)&&n>=1&&n<=10)||!a.given.every(n=>Number.isInteger(n)&&n>=1&&n<=10)||!Number.isInteger(a.mistakes)||a.mistakes<0||a.mistakes>100)return json({error:'إجابات غير صالحة'},400);
let ok=a.expected.every((n,i)=>n===a.given[i]);if(ok)correct++;attempts+=a.mistakes;clean.push({type:a.type,expected:a.expected,given:a.given,mistakes:a.mistakes});}
const score=correct*10,level=score>=90?'ممتاز':score>=75?'متقدم':score>=50?'جيد':'يحتاج دعمًا';let id=crypto.randomUUID();
await env.DB.prepare('INSERT INTO results(id,student_name,score,correct,attempts,level,answers_json) VALUES(?,?,?,?,?,?,?)').bind(id,name,score,correct,attempts,level,JSON.stringify(clean)).run();return json({saved:true,id,score,correct,level});}
if(url.pathname==='/api/results'&&request.method==='GET'){
let secret=env.TEACHER_PASSWORD;if(!secret||secret.length<12)return json({error:'لم يتم إعداد كلمة مرور آمنة'},503);
if(!eq(request.headers.get('Authorization')?.replace(/^Bearer /,'')||'',secret))return json({error:'كلمة المرور غير صحيحة'},401);
let data=await env.DB.prepare('SELECT id,student_name AS name,score,correct,attempts,level,created_at AS date FROM results ORDER BY created_at DESC LIMIT 5000').all();return json({results:data.results});}
return json({error:'غير موجود'},404);
}catch(e){return json({error:'حدث خطأ في الخادم'},500)}
}};

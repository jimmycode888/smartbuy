import {adjustmentOptions,changesBetween,groundedFollowup} from './advisor.mjs';
import {mice,mousePrompt,validateMouse,parseMouse,recommendMouse} from './mouse.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {products,prompt,parse,validate,recommend} from './core.mjs';
export function createServer({key=process.env.DEEPSEEK_API_KEY,fetchImpl=fetch}={}){
const sessions=new Map();const busy=new Set();
return http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json; charset=utf-8');let lock;
try{
 const staticFiles={'/advisor-ui.js':['public/advisor-ui.js','text/javascript'],'/mouse-ui.js':['public/mouse-ui.js','text/javascript'],'/i18n.js':['public/i18n.js','text/javascript'],'/':['index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css']};
 for(const p of [...products,...mice]){const local=p.image?.local;if(local&&/^\/images\/[a-z0-9.-]+$/i.test(local)){const ext=local.split('.').at(-1),type={png:'image/png',jpg:'image/jpeg',webp:'image/webp'}[ext];if(type)staticFiles[local]=['public'+local,type];}}
 if(req.method==='GET'&&staticFiles[req.url]){const [path,type]=staticFiles[req.url];res.setHeader('Content-Type',type+'; charset=utf-8');return res.end(await readFile(new URL(path,import.meta.url)));}
 const mode=key?'DeepSeek 模型模式':'演示模式 · 规则理解';
 if(req.method==='GET'&&req.url==='/api/status')return res.end(JSON.stringify({mode,modelEnabled:!!key,count:products.length+mice.length,collected:[...products,...mice].map(p=>p.collected).sort().at(-1),dataset:'真实商品资料'}));
 if(req.method==='GET'&&req.url==='/api/products')return res.end(JSON.stringify({products:[...products.map(p=>({...p,category:'headphone'})),...mice]}));
 if(req.method!=='POST'||!['/api/chat','/api/reset'].includes(req.url)){res.statusCode=404;return res.end('{}');}
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000){res.statusCode=413;return res.end(JSON.stringify({error:'请求过长'}));}}
 const body=JSON.parse(raw);const category=body.category==='mouse'?'mouse':'headphone';const parser=category==='mouse'?parseMouse:parse;const validator=category==='mouse'?validateMouse:validate;const recommender=category==='mouse'?recommendMouse:recommend;const systemPrompt=category==='mouse'?mousePrompt:prompt;const rawId=String(body.id||'').slice(0,100);const id=category+':'+rawId;if(!rawId)throw Error('input');
 if(busy.has(id)){res.statusCode=409;return res.end(JSON.stringify({error:'上一条请求仍在处理，请稍后。'}));}
 if(req.url==='/api/reset'){sessions.delete(id);return res.end('{}');}
 busy.add(id);lock=id;
 const previous=sessions.get(id)||{state:{currency:'HKD'},history:[]};const old=previous.state;const text=String(body.text||'').slice(0,2000);let patch;let advice=null;let appliedAdjustment=null;
 if(body.adjustmentId){const option=adjustmentOptions(old,category).find(p=>p.id===body.adjustmentId);if(!option)throw Error('Invalid or stale adjustment');body.patch=option.patch;appliedAdjustment=option.id;}
 if(!body.patch&&!Object.keys(parser(text,old)).length)advice=groundedFollowup(text,old,category,previous.resultIds||[],body.contextIds);
 if(advice){const result=recommender(old);const reply={state:old,...result,changed:[],changes:[],advice,mode,inputMethod:'资料库约束回答',adjustments:adjustmentOptions(old,category)};sessions.set(id,{...previous,history:[...previous.history,{user:text,assistant:advice.text}].slice(-8)});return res.end(JSON.stringify(reply));}
 if(body.patch){patch=validator(body.patch);}else if(key){
 const r=await fetchImpl('https://api.deepseek.com/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'deepseek-chat',temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:systemPrompt},{role:'user',content:JSON.stringify({current:old,lastQuestion:recommender(old).question,recentTurns:previous.history.slice(-4),message:text})}]}),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('provider');const d=await r.json();patch=validator(JSON.parse(d.choices[0].message.content));
 }else patch=parser(text,old);
 const state={...old,...patch};const result=recommender(state);const changed=Object.keys(patch).filter(k=>old[k]!==state[k]);
 const reply={state,...result,changed,changes:changesBetween(old,state),adjustments:adjustmentOptions(state,category),appliedAdjustment,mode,inputMethod:body.patch?'手动更新条件':key?'DeepSeek':'规则解析'};
 if(!body.patch&&!Object.keys(patch).length&&!result.question)reply.message='没有识别到新的选购条件，保留现有需求。可以使用左侧条件编辑器。'+reply.message;
 if(sessions.size>=1000&&!sessions.has(id))sessions.delete(sessions.keys().next().value);
 sessions.set(id,{state,resultIds:result.products.map(p=>p.id),history:[...previous.history,{user:body.patch?'手动更新条件':text,assistant:reply.message}].slice(-8)});
 res.end(JSON.stringify(reply));
}catch(e){res.statusCode=502;res.end(JSON.stringify({error:e.name==='TimeoutError'?'模型请求超时，需求未更新，请重试。':'请求未完成，需求未更新。请检查输入、API密钥、额度或网络后重试。'}));}finally{if(lock)busy.delete(lock);}
});}
if(process.argv[1]&&new URL(import.meta.url).pathname.replace(/^\//,'').toLowerCase()===process.argv[1].replaceAll('\\','/').toLowerCase()){
 const port=Number(process.env.PORT)||8017;createServer().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`SmartBuy: http://127.0.0.1:${port}`));
}



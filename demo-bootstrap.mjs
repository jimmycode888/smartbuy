import {products,parse,validate,recommend} from './core.mjs';
import {mice,parseMouse,validateMouse,recommendMouse} from './mouse.mjs';
import {adjustmentOptions,changesBetween,groundedFollowup} from './advisor.mjs';
const sessions=new Map();const originalFetch=globalThis.fetch.bind(globalThis);
let finishStartup;const startup=new Promise(resolve=>{finishStartup=resolve});
globalThis.fetch=async(input,init={})=>{
 const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;
 if(!path.startsWith('/api/'))return originalFetch(input,init);
 await startup;
 try{
 let result;const mode='演示模式 · 规则理解';
 if(path==='/api/status')result={mode,modelEnabled:false,count:products.length+mice.length};
 else if(path==='/api/products')result={products:[...products.map(p=>({...p,category:'headphone'})),...mice.map(p=>({...p,image:{...p.image,local:p.image.local?.replace(/^\/images\//,'./images/')}}))]};
 else {
 const body=JSON.parse(init.body||'{}'),cat=body.category==='mouse'?'mouse':'headphone',id=cat+':'+body.id;
 if(path==='/api/reset'){sessions.delete(id);result={};}
 else if(path==='/api/chat'){
 const oldRecord=sessions.get(id)||{state:{currency:'HKD'},resultIds:[]},old=oldRecord.state;
 const parser=cat==='mouse'?parseMouse:parse,validator=cat==='mouse'?validateMouse:validate,recommender=cat==='mouse'?recommendMouse:recommend;
 if(body.adjustmentId){const option=adjustmentOptions(old,cat).find(p=>p.id===body.adjustmentId);if(!option)throw Error('调整方案已过期，请重新筛选。');body.patch=option.patch;}
 const text=String(body.text||'').slice(0,2000);let advice=null;
 if(!body.patch&&!Object.keys(parser(text,old)).length)advice=groundedFollowup(text,old,cat,oldRecord.resultIds,body.contextIds);
 const patch=advice?{}:body.patch?validator(body.patch):parser(text,old),state={...old,...patch};
 result={state,...recommender(state),changed:Object.keys(patch).filter(k=>old[k]!==state[k]),changes:changesBetween(old,state),advice,mode,inputMethod:'浏览器规则演示',adjustments:adjustmentOptions(state,cat)};
 sessions.set(id,{state,resultIds:result.products.map(p=>p.id)});
 }else return new Response('{}',{status:404});
 }
 return Response.json(result);
 }catch(e){return Response.json({error:e.message||'演示请求失败，需求未更新。'},{status:400})}
};
for(const src of ['./i18n.js','./app.js','./mouse-ui.js','./advisor-ui.js'])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s)});
finishStartup();
const disclosure=document.createElement('p');disclosure.textContent='GitHub Pages 功能演示 · 在浏览器内执行规则筛选，不调用真实 AI；刷新会清空对话。';disclosure.style.cssText='margin:0;padding:10px 24px;background:#e9f0e5;color:#254333;text-align:center;font-size:14px';document.body.prepend(disclosure);

document.dispatchEvent(new Event('DOMContentLoaded'));


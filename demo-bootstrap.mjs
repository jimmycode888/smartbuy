import {products,parse,validate,recommend} from './core.mjs?v=dcb1f02c7032';
import {mice,parseMouse,validateMouse,recommendMouse} from './mouse.mjs?v=f41c4693c1df';
import {adjustmentOptions,changesBetween,groundedFollowup,pendingPreference,preferenceTurn,withPreferenceQuestion} from './advisor.mjs?v=222e343ca649';
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
 const parsed=parser(text,old);
 const guided=body.patch?null:preferenceTurn(text,cat,oldRecord.pending,parsed);
 if(!body.patch&&!guided&&!Object.keys(parsed).length)advice=groundedFollowup(text,old,cat,oldRecord.resultIds,body.contextIds);
 const patch=advice?{}:body.patch?validator(body.patch):guided?guided.patch:parsed;
 const state={...old,...patch};
 const pending=guided?guided.pending:pendingPreference(oldRecord.pending,patch);
 const recommendation=withPreferenceQuestion(recommender(state),pending);
 result={state,...recommendation,changed:Object.keys(patch).filter(k=>old[k]!==state[k]),changes:changesBetween(old,state),advice,mode,inputMethod:guided?'偏好澄清':'浏览器规则演示',adjustments:recommendation.question?[]:adjustmentOptions(state,cat)};
 sessions.set(id,{state,pending,resultIds:advice?oldRecord.resultIds:result.products.map(p=>p.id)});
 }else return new Response('{}',{status:404});
 }
 return Response.json(result);
 }catch(e){return Response.json({error:e.message||'演示请求失败，需求未更新。'},{status:400})}
};
for(const src of ['./i18n.js?v=f353f876399d','./app.js?v=6852151dfb38','./mouse-ui.js?v=e7a2efee95fd','./advisor-ui.js?v=356c502a74f8'])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s)});
finishStartup();
document.body.inert=false;
document.querySelector('#about-mode').textContent='当前为浏览器规则演示，不调用真实 AI；刷新会清空对话。';

document.dispatchEvent(new Event('DOMContentLoaded'));


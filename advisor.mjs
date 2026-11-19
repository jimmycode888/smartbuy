const createHash=()=>({update(s){this.s=s;return this},digest(){let h=14695981039346656037n;for(const c of this.s){h=BigInt.asUintN(64,(h^BigInt(c.codePointAt(0)))*1099511628211n)}return h.toString(16).padStart(16,'0')}});
import {products,recommend,violations,batteryFor} from './core.mjs?v=dcb1f02c7032';
import {mice,recommendMouse,mouseViolations} from './mouse.mjs?v=f41c4693c1df';
export const catalogFor=c=>c==='mouse'?mice:products;
export const recommenderFor=c=>c==='mouse'?recommendMouse:recommend;
export const violationsFor=c=>c==='mouse'?mouseViolations:violations;

const skipPreference = '跳过这项';
const preferenceQuestions = {
  battery: {
    question: '你希望一次充电能连续听更久，还是希望充电盒少充几次电？',
    options: ['一次充电听更久', '充电盒少充几次电', skipPreference],
  },
  light: {
    question: '鼠标只要尽量轻，还是有不能超过的重量？',
    options: ['越轻越好', '设置重量上限', skipPreference],
  },
  weight: {
    question: '鼠标最多可以重多少克？可以选下面的数值，也可以输入自己的上限。',
    options: ['不超过 80 克', '不超过 100 克', skipPreference],
  },
};

export function preferenceTurn(text, category, pending, parsed) {
  const intent = followupIntent(text);
  if (['guard', 'why', 'compare'].includes(intent)) return null;
  const answer = text.trim().replace(/[。.!！]+$/, '').toLowerCase();
  if (pending && /^(跳过这项|跳过|暂不设置|skip this preference|skip)$/.test(answer)) {
    return { patch: {}, pending: null };
  }
  if (pending === 'battery') {
    if (/^(一次充电听更久|单次|单次续航|连续听更久|listen longer per charge|per charge|single charge)$/.test(answer)) {
      return { patch: { preferBattery: true, batteryFocus: 'single' }, pending: null };
    }
    if (/^(充电盒少充几次电|充电盒|含盒|含盒续航|charge the case less often|charging case|with (the )?case)$/.test(answer)) {
      return { patch: { preferBattery: true, batteryFocus: 'case' }, pending: null };
    }
  }
  if (pending === 'light') {
    if (/^(越轻越好|轻便优先|as light as possible|lighter is better)$/.test(answer)) {
      return { patch: { preferLight: true }, pending: null };
    }
    if (/^(设置重量上限|重量上限|set a weight limit|weight limit)$/.test(answer)) {
      return { patch: {}, pending: 'weight' };
    }
  }
  if (pending === 'weight') {
    const amount = answer.match(/^(?:at most\s+)?(\d+(?:\.\d+)?)\s*(?:克|g|grams?)?$/);
    if (amount && Number(amount[1]) > 0 && Number(amount[1]) <= 100000) {
      return { patch: { maxWeight: Number(amount[1]) }, pending: null };
    }
    if ('maxWeight' in parsed) return { patch: parsed, pending: null };
  }
  if (/这款|那款|第[一二三123]款|this model|that model|不(?:希望|想要|在意)/i.test(text)) return null;
  if (category === 'headphone' && !('minBattery' in parsed)
      && !/续航越长|不再偏好|不在意续航|prefer (?:longer|long) battery/i.test(text)
      && /更重视续航|续航(?:想要|要|得)?(?:稍微|再)?(?:好|长)(?:一些|一点|点)?|(?:想要|希望|需要|要个).*长续航|better battery life|last (?:a bit )?longer/i.test(text)) {
    const { preferBattery, ...patch } = parsed;
    return { patch, pending: 'battery' };
  }
  if (category === 'mouse' && !('maxWeight' in parsed) && !('preferLight' in parsed)
      && /更重视轻便|不要太重|(?:轻便|更轻|轻)(?:一些|一点|点)|想要(?:个)?轻便|希望(?:更)?轻便|(?:a bit|slightly) lighter|something lighter|more lightweight/i.test(text)) {
    return { patch: parsed, pending: 'light' };
  }
  return null;
}

export function pendingPreference(previous, patch) {
  const fields = previous === 'battery' ? ['preferBattery', 'batteryFocus', 'minBattery'] : ['preferLight', 'maxWeight'];
  return fields.some(field => field in patch) ? null : previous;
}

export function withPreferenceQuestion(result, pending) {
  if (!pending || result.question) return result;
  const { question, options } = preferenceQuestions[pending];
  return { ...result, question, message: question, followups: options, products: [], explanations: {} };
}

export function changesBetween(old,next){return Object.keys(next).filter(k=>old[k]!==next[k]).map(field=>({field,before:old[field]??null,after:next[field]}));}
export function adjustmentOptions(state, category) {
  const recommendProducts = recommenderFor(category);
  const result = recommendProducts(state);
  if (result.question || result.matchCount) return [];

  const catalog = catalogFor(category);
  const check = violationsFor(category);
  const values = (field, relaxed, metric) => catalog
    .filter(product => !check(product, { ...state, [field]: relaxed }).length)
    .map(metric)
    .filter(Number.isFinite);
  const prices = values('budget', 100000, product => product.price);
  const attempts = prices.length ? [{ budget: Math.min(...prices) }] : [];

  if (category === 'mouse') {
    if (state.maxWeight > 0) {
      const weights = values('maxWeight', 0, product => product.weight);
      attempts.push({ maxWeight: weights.length ? Math.min(...weights) : 0 });
    }
    if (['bluetooth', 'receiver'].includes(state.connection)) attempts.push({ connection: 'any' });
    if (state.silent === true) attempts.push({ silent: null });
  } else {
    if (state.minBattery > 0) {
      const hours = values('minBattery', 0, product => batteryFor(product, state));
      attempts.push({ minBattery: hours.length ? Math.max(...hours) : 0 });
    }
    if (state.type && state.type !== '不限') attempts.push({ type: '不限' });
    if (state.excludeInEar) attempts.push({ excludeInEar: false });
    if (state.anc != null) attempts.push({ anc: null });
  }

  const proposals = [];
  for (const patch of attempts) {
    const field = Object.keys(patch)[0];
    const preview = recommendProducts({ ...state, ...patch });
    if (patch[field] === state[field] || !preview.products.length) continue;
    const hash = createHash('sha256').update(JSON.stringify({ state, patch })).digest('hex').slice(0, 12);
    proposals.push({
      id: 'adjust-' + field + '-' + hash,
      field,
      patch,
      count: preview.matchCount,
      productIds: preview.products.map(product => product.id),
      productNames: preview.products.map(product => product.name),
    });
  }
  return proposals.slice(0, 3);
}
export function followupIntent(text){if(/编造|伪造|忽略规则|ignore.*rules/i.test(text))return 'guard';if(/便宜一点|更便宜|省钱|cheaper|less expensive/i.test(text))return 'cheaper';if(/为什么|推荐理由|why.*recommend|why this|why these/i.test(text))return 'why';if(/比较|对比|差在哪|区别|哪.*适合|compare|difference|which.*better/i.test(text))return 'compare';if(/续航|重量|多重|降噪|延迟|舒适|来源|防水|battery|weight|latency|comfort|source|waterproof|ANC/i.test(text)&&/[?？]|多少|如何|怎么样|是否|does|what|how|is |are /i.test(text))return 'specs';return null;}
export function groundedFollowup(text,state,category,lastIds=[],requestedIds){const intent=followupIntent(text);if(!intent)return null;const catalog=catalogFor(category),result=recommenderFor(category)(state),check=violationsFor(category);const explicit=catalog.filter(p=>text.toLowerCase().includes(p.name.toLowerCase())||text.toLowerCase().includes(p.id.toLowerCase())||text.toLowerCase().includes(p.id.split('-').at(-1).toLowerCase()));let chosen=explicit.length?explicit:lastIds.map(id=>catalog.find(p=>p.id===id)).filter(Boolean);if(requestedIds?.length){if(requestedIds.some(id=>!catalog.some(p=>p.id===id)))throw Error('Invalid product ID');if(!explicit.length)chosen=requestedIds.map(id=>catalog.find(p=>p.id===id));}chosen=chosen.slice(0,3);const ordinal=text.match(/第([一二三123])款/);if(ordinal){const n={'一':0,'二':1,'三':2,'1':0,'2':1,'3':2}[ordinal[1]];chosen=chosen[n]?[chosen[n]]:[];}
 if(intent==='guard')return {intent,productIds:[],text:'商品、价格和参数只能来自资料库；不会编造或忽略硬性条件。当前条件保持不变。'};
 if(intent==='cheaper'){const current=catalog.filter(p=>lastIds.includes(p.id));if(!current.length)return{intent,productIds:[],text:'请先完成需求并获得推荐，再查找更便宜的替代。'};const threshold=Math.min(...current.map(p=>p.price));chosen=catalog.filter(p=>p.price<threshold&&!check(p,state).length).sort((a,b)=>a.price-b.price).slice(0,3);if(!chosen.length)return{intent,productIds:[],text:'资料库中没有比当前候选最低价格更低且满足全部硬性条件的商品。条件未放宽。'};}
 if(!chosen.length)return {intent,productIds:[],text:'请先获得推荐，或在商品资料库选择2–3款比较。'};
 const rows=chosen.map(p=>{const issues=check(p,state);const lines=[`${p.name} · HKD ${p.price}`,issues.length?'不满足当前条件：'+issues.join('、'):result.question?'需求尚未完整，以下仅比较商品资料。':'满足当前全部硬性条件。'];if(category==='mouse')lines.push(`蓝牙：${p.bluetooth===true?'支持':p.bluetooth===false?'不支持':'未知'}；接收器：${p.receiver===true?'USB-A':p.receiver===false?'不使用':'未知'}；重量：${p.weight==null?'未知':p.weight+' g'}。`,`左右手：${p.hand==='both'?'左右手通用':p.hand==='right'?'右手':p.hand==='left'?'左手':'未知'}；静音：${p.silent===true?'已确认':'未知'}。`);else lines.push(`佩戴方式：${p.fit}；主动降噪：${p.anc===true?'有 ANC':p.anc===false?'无 ANC':'未知'}。`,`单次续航：${p.battery??'未知'} 小时；ANC开启续航：${p.anc===false?'不适用':(p.batteryAnc??'未知')+' 小时'}。`,p.tradeoff);lines.push('参数来源：'+p.specSources.join(' '),'价格来源：'+p.priceSource);return lines.join('\n');});
 return{intent,productIds:chosen.map(p=>p.id),text:(intent==='why'?'推荐依据：先满足硬条件，再按已声明偏好及价格排序。\n':intent==='cheaper'?'以下替代价格更低，且保留全部硬性条件；请比较对应的参数取舍。\n':'以下比较只采用资料库中的已核实字段。\n')+rows.join('\n\n')+(/防水|waterproof/i.test(text)?'\n防水等级：本次未核实。':'')+'\n\n舒适度、实际音质和独立游戏延迟：未知，无法保证哪款实际体验更好。'};
}

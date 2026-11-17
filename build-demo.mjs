import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=new URL('./site/',import.meta.url);await mkdir(out,{recursive:true});
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
for(const name of ['core','mouse']){let s=await read(name+'.mjs');s=s.replace(/import \{readFileSync\} from 'node:fs';\s*/,'').replace(/JSON\.parse\(readFileSync\(new URL\('[^']+',import.meta.url\),'utf8'\)\)/,await read(name==='core'?'data/products.json':'data/mice.json'));s=s.replaceAll('"/images/','"./images/');await writeFile(new URL(name+'.mjs',out),s);}
let a=await read('advisor.mjs');a=a.replace("import {createHash} from 'node:crypto';",`const createHash=()=>({update(s){this.s=s;return this},digest(){let h=14695981039346656037n;for(const c of this.s){h=BigInt.asUintN(64,(h^BigInt(c.codePointAt(0)))*1099511628211n)}return h.toString(16).padStart(16,'0')}});`);await writeFile(new URL('advisor.mjs',out),a);
for(const n of ['app.js','mouse-ui.js','advisor-ui.js','i18n.js','style.css','translations.txt'])await writeFile(new URL(n,out),(await read('public/'+n)).replaceAll("'/images/","'./images/").replaceAll('"/images/','"./images/'));
await cp(new URL('public/images/',import.meta.url),new URL('images/',out),{recursive:true});
let html=await read('index.html');html=html.replace('<body>','<body inert>');html=html.replaceAll('href="/','href="./').replaceAll('src="/','src="./');html=html.replace('<script src="./i18n.js" defer></script>', '<script type="module" src="./demo-bootstrap.mjs"></script>');html=html.replace(/<script src="\.\/(?:app|mouse-ui|advisor-ui)\.js" defer><\/script>/g,'');await writeFile(new URL('index.html',out),html);
const mousePath=new URL('mouse.mjs',out);await writeFile(mousePath,(await readFile(mousePath,'utf8')).replaceAll('"/images/','"./images/'));
await cp(new URL('demo-bootstrap.mjs',import.meta.url),new URL('demo-bootstrap.mjs',out));await writeFile(new URL('.nojekyll',out),'');console.log('Built site/ — explicit browser demo, no API key or model calls.');
// Content versions prevent a new HTML page from reusing old styles or catalogue scripts.
const version=async name=>createHash('sha256').update(await readFile(new URL(name,out))).digest('hex').slice(0,12);
let advisor=await readFile(new URL('advisor.mjs',out),'utf8');
for(const name of ['core.mjs','mouse.mjs'])advisor=advisor.replaceAll("'./"+name+"'","'./"+name+'?v='+await version(name)+"'");
await writeFile(new URL('advisor.mjs',out),advisor);
let boot=await readFile(new URL('demo-bootstrap.mjs',out),'utf8');
for(const name of ['core.mjs','mouse.mjs','advisor.mjs','i18n.js','app.js','mouse-ui.js','advisor-ui.js'])boot=boot.replaceAll("'./"+name+"'","'./"+name+'?v='+await version(name)+"'");
await writeFile(new URL('demo-bootstrap.mjs',out),boot);
let page=await readFile(new URL('index.html',out),'utf8');
for(const name of ['style.css','demo-bootstrap.mjs'])page=page.replaceAll('./'+name+'"','./'+name+'?v='+await version(name)+'"');
await writeFile(new URL('index.html',out),page);

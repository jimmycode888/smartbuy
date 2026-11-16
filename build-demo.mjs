import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
const out=new URL('./site/',import.meta.url);await mkdir(out,{recursive:true});
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
for(const name of ['core','mouse']){let s=await read(name+'.mjs');s=s.replace(/import \{readFileSync\} from 'node:fs';\s*/,'').replace(/JSON\.parse\(readFileSync\(new URL\('[^']+',import.meta.url\),'utf8'\)\)/,await read(name==='core'?'data/products.json':'data/mice.json'));await writeFile(new URL(name+'.mjs',out),s);}
let a=await read('advisor.mjs');a=a.replace("import {createHash} from 'node:crypto';",`const createHash=()=>({update(s){this.s=s;return this},digest(){let h=14695981039346656037n;for(const c of this.s){h=BigInt.asUintN(64,(h^BigInt(c.codePointAt(0)))*1099511628211n)}return h.toString(16).padStart(16,'0')}});`);await writeFile(new URL('advisor.mjs',out),a);
for(const n of ['app.js','mouse-ui.js','advisor-ui.js','i18n.js','style.css','translations.txt'])await writeFile(new URL(n,out),(await read('public/'+n)).replaceAll("'/images/","'./images/"));
await cp(new URL('public/images/',import.meta.url),new URL('images/',out),{recursive:true});
let html=await read('index.html');html=html.replaceAll('href="/','href="./').replaceAll('src="/','src="./');html=html.replace('<script src="./i18n.js" defer></script>', '<script type="module" src="./demo-bootstrap.mjs"></script>');html=html.replace(/<script src="\.\/(?:app|mouse-ui|advisor-ui)\.js" defer><\/script>/g,'');await writeFile(new URL('index.html',out),html);
const mousePath=new URL('mouse.mjs',out);await writeFile(mousePath,(await readFile(mousePath,'utf8')).replaceAll('"/images/','"./images/'));
await cp(new URL('demo-bootstrap.mjs',import.meta.url),new URL('demo-bootstrap.mjs',out));await writeFile(new URL('.nojekyll',out),'');console.log('Built site/ — explicit browser demo, no API key or model calls.');


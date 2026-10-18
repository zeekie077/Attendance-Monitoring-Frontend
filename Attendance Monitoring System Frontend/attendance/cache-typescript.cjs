const fs=require('fs'),path=require('path');
const root='C:/Users/reyes/AppData/Local/npm-cache/_cacache';
let match;
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else for(const line of fs.readFileSync(f,'utf8').split('\n')){try{const x=JSON.parse(line.split('\t')[1]);if(x.key.endsWith('/typescript-5.9.3.tgz'))match=x;}catch{}}}}
walk(path.join(root,'index-v5'));
if(!match)throw Error('TypeScript unavailable');
const hex=Buffer.from(match.integrity.split('-')[1],'base64').toString('hex');
fs.copyFileSync(path.join(root,'content-v2','sha512',hex.slice(0,2),hex.slice(2,4),hex.slice(4)),'.npm-cache/typescript.tgz');

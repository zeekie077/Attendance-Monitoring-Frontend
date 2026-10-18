const fs=require('fs'),path=require('path'),cp=require('child_process');
const root='C:/Users/reyes/AppData/Local/npm-cache/_cacache';const matches=new Map();
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else for(const line of fs.readFileSync(f,'utf8').split('\n')){try{const x=JSON.parse(line.split('\t')[1]);if(x.key.includes('.tgz')&&/\/(react|react-dom|csstype|plugin-react)-[0-9]/.test(x.key)){if(x.key.includes('/@types/react/'))matches.set('@types/react',x);if(x.key.includes('/@types/react-dom/'))matches.set('@types/react-dom',x);if(x.key.includes('/csstype/'))matches.set('csstype',x);if(x.key.includes('/plugin-react-6.0.5'))matches.set('@vitejs/plugin-react',x);}}catch{}}}}
walk(path.join(root,'index-v5'));
for(const [name,x]of matches){const hex=Buffer.from(x.integrity.split('-')[1],'base64').toString('hex');const file='.npm-cache/'+name.replaceAll('/','-')+'.tgz';fs.copyFileSync(path.join(root,'content-v2','sha512',hex.slice(0,2),hex.slice(2,4),hex.slice(4)),file);const dest='node_modules/'+name;fs.mkdirSync(dest,{recursive:true});console.log('Restored '+name);}


const fs=require('fs'),path=require('path');
const root='C:/Users/reyes/AppData/Local/npm-cache/_cacache/index-v5';
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else for(const line of fs.readFileSync(f,'utf8').split('\n')){try{const x=JSON.parse(line.split('\t')[1]);if(/registry.npmjs.org\/(vite|@vitejs|@tailwindcss|tailwindcss|lucide-react|recharts|framer-motion|qrcode.react|react-router-dom|typescript|@types%2freact)/i.test(x.key)) console.log(x.key);}catch{}}}}
walk(root);

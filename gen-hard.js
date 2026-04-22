const fs=require('fs');

function inB(r,c){return r>=0&&r<5&&c>=0&&c<5;}
function nk(r,c){return r*5+c;}
function fk(k){return[Math.floor(k/5),k%5];}

function getAttacks(type,r,c,occ,pd){
  const out=new Set();
  if(type==='N'){for(const[dr,dc]of[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]])if(inB(r+dr,c+dc))out.add(nk(r+dr,c+dc));}
  else if(type==='P'){for(const[dr,dc]of[[pd,-1],[pd,1]])if(inB(r+dr,c+dc))out.add(nk(r+dr,c+dc));}
  else{const dirs=[];if(type==='R'||type==='Q')dirs.push([0,1],[0,-1],[1,0],[-1,0]);if(type==='B'||type==='Q')dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);for(const[dr,dc]of dirs){let nr=r+dr,nc=c+dc;while(inB(nr,nc)){out.add(nk(nr,nc));if(occ.has(nk(nr,nc)))break;nr+=dr;nc+=dc;}}}
  return out;
}

function isValid(enemies,mine){
  const occ=new Set([...enemies.map(e=>e.k),...mine.map(m=>m.k)]);
  const eT=new Set();
  for(const e of enemies){const[r,c]=fk(e.k);for(const s of getAttacks(e.t,r,c,occ,1))eT.add(s);}
  const eKeys=new Set(enemies.map(e=>e.k));
  const coverage=mine.map(m=>{const[r,c]=fk(m.k);const atk=getAttacks(m.t,r,c,occ,-1);const cov=new Set();for(const k of atk)if(eKeys.has(k))cov.add(k);return cov;});
  for(const m of mine)if(eT.has(m.k))return false;
  for(const e of enemies)if(!coverage.some(c=>c.has(e.k)))return false;
  for(let i=0;i<mine.length;i++){const others=new Set();for(let j=0;j<mine.length;j++)if(j!==i)for(const k of coverage[j])others.add(k);if(![...coverage[i]].some(k=>!others.has(k)))return false;}
  return true;
}

function countSols(enemies,myTypes,limit){
  const eKeys=new Set(enemies.map(e=>e.k));
  const empties=[];for(let i=0;i<25;i++)if(!eKeys.has(i))empties.push(i);
  const sorted=[...myTypes].sort((a,b)=>['Q','R','B','N','P'].indexOf(a)-['Q','R','B','N','P'].indexOf(b));
  let count=0;
  function bt(i,placed,used){if(count>=limit)return;if(i===sorted.length){if(isValid(enemies,placed))count++;return;}for(const sq of empties){if(used.has(sq))continue;used.add(sq);placed.push({t:sorted[i],k:sq});bt(i+1,placed,used);placed.pop();used.delete(sq);if(count>=limit)return;}}
  bt(0,[],new Set());return count;
}

function noSubset(enemies,myTypes){
  for(let s=0;s<myTypes.length;s++){const sub=myTypes.filter((_,i)=>i!==s);if(countSols(enemies,sub,1)>=1)return false;}
  return true;
}

function anyPieceSolvesAlone(enemies){
  const eKeys=new Set(enemies.map(e=>e.k));
  const empties=[];for(let i=0;i<25;i++)if(!eKeys.has(i))empties.push(i);
  for(const t of['Q','R','B','N','P']){
    for(const sq of empties){
      const occ=new Set([...eKeys,sq]);
      const[r,c]=fk(sq);
      const eT=new Set();
      for(const e of enemies){const[er,ec]=fk(e.k);for(const s of getAttacks(e.t,er,ec,occ,1))eT.add(s);}
      if(eT.has(sq))continue;
      const atk=getAttacks(t,r,c,occ,-1);
      if([...eKeys].every(k=>atk.has(k)))return true;
    }
  }
  return false;
}

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}

const FULL_POOL =['Q','Q','R','R','B','B','N','N','P','P'];
const MIXED_POOL=['R','R','B','B','N','N','P','P'];
const WEAK_POOL =['B','B','N','N','P','P'];

function generateHard(){
  for(let a=0;a<15000;a++){
    const sqs=shuffle([...Array(25).keys()]);
    const eKeys=sqs.slice(0,6);
    // At least 3 sliding pieces among enemies
    const sliding=shuffle(['R','R','R','B','B','B']).slice(0,3); // No enemy queens
    const fixed=shuffle(['N','N','P','P']).slice(0,3);
    const eTypes=shuffle([...sliding,...fixed]);
    const enemies=eKeys.map((k,i)=>({t:eTypes[i],k}));
    if(enemies.some(e=>e.t==='P'&&e.k>=20))continue;
    if(enemies.some(e=>e.t==='K'))continue;
    for(const pool of[FULL_POOL,MIXED_POOL,WEAK_POOL]){
      const myTypes=shuffle(pool).slice(0,3);
      if(myTypes.some(t=>t==='K'))continue;
      if(countSols(enemies,myTypes,2)===1&&noSubset(enemies,myTypes)&&!anyPieceSolvesAlone(enemies))
        return{enemies,myTypes,tier:'hard'};
    }
  }
  return null;
}

const outFile='/home/claude/puzzles_hard.json';
const TOTAL=90;
let bank=[];
try{bank=JSON.parse(fs.readFileSync(outFile,'utf8'));}catch{}
const start=bank.length;
process.stderr.write(`Resuming hard from ${start}/${TOTAL}\n`);
const t0=Date.now();
for(let i=start;i<TOTAL;i++){
  process.stderr.write(`Generating ${i+1}/${TOTAL}...\n`);
  const p=generateHard();
  if(!p){process.stderr.write(`Failed at ${i}\n`);process.exit(1);}
  bank.push(p);
  fs.writeFileSync(outFile,JSON.stringify(bank));
  if((i+1)%10===0)process.stderr.write(`  ${i+1}/${TOTAL} (${((Date.now()-t0)/1000).toFixed(1)}s)\n`);
}
process.stderr.write(`Hard complete: ${bank.length} puzzles\n`);

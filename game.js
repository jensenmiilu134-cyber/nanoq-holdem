// Shared poker rules for Nanoq Hold'em. Runs on the server, which is the only place hands are dealt.
const crypto=require('crypto');
const N=8, NEXT_HAND_MS=7000, TURN_MS=40000;
const RANKS='23456789TJQKA';
const HAND_NAMES=['Højt kort','Et par','To par','Tre ens','Straight','Flush','Fuldt hus','Fire ens','Straight flush'];
const fmt=n=>Number(n||0).toLocaleString('da-DK');
// server keeps cards as plain arrays; only the owner ever receives them
const enc=a=>a.slice();
const dec=a=>Array.isArray(a)?a.slice():[];
function shuffled(){const d=[...Array(52).keys()];for(let i=51;i>0;i--){const j=crypto.randomInt(i+1);[d[i],d[j]]=[d[j],d[i]]}return d}
const E=(x,y,r,f)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const CHARS=[
 {name:'Nanoq Nielsen',title:'Isbjørn. Solbriller. Ingen følelser.',bg:'#1d5f8a',
  svg:`${E(20,20,7,'#f4f1ea')}${E(44,20,7,'#f4f1ea')}${E(20,20,3.5,'#d9cfc0')}${E(44,20,3.5,'#d9cfc0')}<ellipse cx="32" cy="36" rx="20" ry="18" fill="#f4f1ea"/><ellipse cx="32" cy="45" rx="9" ry="7" fill="#e3dccd"/><ellipse cx="32" cy="41" rx="4" ry="3" fill="#111"/><path d="M14 30 H50 L48 37 Q44 41 38 37 L34 33 H30 L26 37 Q20 41 16 37Z" fill="#0b0b0f"/><path d="M18 31 L22 31 L19 35Z" fill="#7fd6d9" opacity=".8"/><path d="M28 50 Q32 52 36 50" stroke="#111" stroke-width="1.5" fill="none"/>`,
  sit:'Aluu. Jeg er kold. Mine hænder er koldere.',allin:['NANOQ-MODE: AKTIVERET.','Jeg har set værre storme end dig.','Solbrillerne bliver på. All-in.'],raise:['Mere sne på bålet.','Du fryser nu, ikke?','Isbjørne-tax.'],fold:['Jeg går i dvale. Midlertidigt.','Det var bare strategi.','Det her er ikke mit endelige form.'],win:'Mamaq. Tak for maden.'},
 {name:'Qimmeq Turbo',title:'Slædehund på tre energidrikke.',bg:'#7a1f2b',
  svg:`<path d="M14 26 L18 6 L28 20Z M50 26 L46 6 L36 20Z" fill="#5b6470"/><path d="M17 22 L19 11 L25 19Z M47 22 L45 11 L39 19Z" fill="#f1c9c9"/><ellipse cx="32" cy="36" rx="19" ry="18" fill="#5b6470"/><path d="M32 22 C22 26 18 36 22 46 C26 54 38 54 42 46 C46 36 42 26 32 22Z" fill="#f4f1ea"/>${E(25,33,3.2,'#3fb6ff')}${E(39,33,3.2,'#3fb6ff')}${E(25,33,1.4,'#111')}${E(39,33,1.4,'#111')}<ellipse cx="32" cy="41" rx="3.5" ry="2.6" fill="#111"/><path d="M28 46 Q32 49 36 46" stroke="#111" stroke-width="1.4" fill="none"/><path d="M31 47 Q32 57 36 55 Q37 50 34 47Z" fill="#ff6b8a"/><rect x="18" y="16" width="28" height="7" rx="3.5" fill="#d4122f"/>${E(25,19.5,3,'#ffd23f')}${E(39,19.5,3,'#ffd23f')}`,
  sit:'VOV. Hej. VOV. Jeg har drukket tre Monster. VOV.',allin:['MUSH! MUSH! ALL-IN!','ZOOOOOOM','Jeg har ikke sovet siden 2019.'],raise:['Hurtigere end en slæde i medvind!','Højere! HØJERE!','Vov (aggressivt).'],fold:['*hyler ked af det*','Jeg skal lige jagte min hale.','Okay. Okay okay okay.'],win:'VOV VOV VOV VOV VOV'},
 {name:'Arfeq Supreme',title:'Pukkelhval med guldkæde.',bg:'#0f3d5c',
  svg:`<path d="M30 12 Q28 4 22 6 M34 12 Q36 4 42 6 M32 13 V4" stroke="#bfefff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M8 38 C8 22 22 14 36 16 C50 18 58 28 56 40 C54 50 42 56 30 56 C16 56 8 48 8 38Z" fill="#26476b"/><path d="M12 44 C18 52 40 56 54 44 C48 52 22 56 12 44Z" fill="#c9d6e2"/><path d="M14 46 L52 46 M16 49 L50 49" stroke="#26476b" stroke-width="1"/>${E(40,32,3.2,'#fff')}${E(41,32,1.6,'#111')}<path d="M16 50 Q32 64 48 50" stroke="#ffd23f" stroke-width="3" fill="none" stroke-dasharray="3 1.5"/>${E(32,58,4,'#ffd23f')}<text x="32" y="60" font-size="5" text-anchor="middle" font-weight="900" fill="#26476b">$</text>`,
  sit:'Jeg er 30 ton ren swag. Spout.',allin:['Jeg dykker 200 meter ned i puljen.','Hvalsang betyder all-in.','Guldkæden siger ja.'],raise:['Stor fisk. Stor hævning.','Du er krill for mig.','Spout spout.'],fold:['Jeg svømmer videre. Ses i Diskobugten.','Det var en sardin-hånd.','Blubb.'],win:'Spout! Kom og se på min nye guldkæde.'},
 {name:'Puisi Pistolero',title:'Sæl med cowboyhat. Sheriff på isflagen.',bg:'#6b4a2a',
  svg:`<ellipse cx="32" cy="40" rx="19" ry="17" fill="#8a929c"/>${E(24,34,5,'#111')}${E(40,34,5,'#111')}${E(25.5,32.5,1.8,'#fff')}${E(41.5,32.5,1.8,'#fff')}<ellipse cx="32" cy="43" rx="3.4" ry="2.4" fill="#2b2b2b"/><path d="M22 45 H12 M22 48 H13 M42 45 H52 M42 48 H51" stroke="#dfe3e8" stroke-width="1.2"/><path d="M29 48 Q32 51 35 48" stroke="#2b2b2b" stroke-width="1.4" fill="none"/><path d="M4 24 Q32 32 60 24 Q56 21 46 22 L44 10 Q32 6 20 10 L18 22 Q8 21 4 24Z" fill="#8b5a2b"/><path d="M18 21 Q32 25 46 21" stroke="#d4122f" stroke-width="3" fill="none"/>`,
  sit:'Howdy, partner. Denne isflage er for lille til os begge.',allin:['Der er ikke plads til os begge på denne isflage.','Træk, cowboy.','Yeehaw. All-in.'],raise:['Sheriffen hæver.','Hænderne op. Altså dine kort.','Pew pew.'],fold:['Plask.','Jeg rider ud i solnedgangen. Langsomt. Jeg har ingen ben.','Sælen trækker sig.'],win:'Yeehaw, isflage-style.'},
 {name:'Tupilak Terje',title:'Udskåret af ben og dårlige beslutninger.',bg:'#2a2318',
  svg:`<path d="M18 16 L10 4 L26 12Z M46 16 L54 4 L38 12Z" fill="#e9dec4"/><path d="M32 10 C50 10 56 22 55 34 C54 44 47 50 40 53 L32 58 L24 53 C17 50 10 44 9 34 C8 22 14 10 32 10Z" fill="#e9dec4"/><ellipse cx="23" cy="30" rx="7" ry="5.5" fill="#2a2318"/><ellipse cx="41" cy="30" rx="7" ry="5.5" fill="#2a2318"/>${E(24,30,1.8,'#5cf2a8')}${E(40,30,1.8,'#5cf2a8')}<path d="M32 34 L29 40 H35Z" fill="#2a2318"/><path d="M18 43 Q32 55 46 43 Q32 48 18 43Z" fill="#2a2318"/><path d="M24 45 V49 M29 46 V51 M35 46 V51 M40 45 V49" stroke="#e9dec4" stroke-width="1.6"/>`,
  sit:'hej... jeg er bare en lille fyr af ben...',allin:['Jeg er blevet sendt efter dine chips.','Forbandelsen er aktiveret. Hehe.','Malkemasking WILL get you!'],raise:['uwu forbandelse','Jeg hæver. Og jeg hjemsøger.','Ben-tax.'],fold:['Jeg vender tilbage. Det gør vi altid.','Det var ikke mig. Det var shamanen.','*rasler trist med knoglerne*'],win:'Forbandelsen virkede. Hehe.'},
 {name:'Ib Isbjerg',title:'Du ser kun 10 procent af ham.',bg:'#0b2a3d',
  svg:`<path d="M6 44 L20 18 L28 26 L36 10 L48 28 L58 44Z" fill="#e3f4f7"/><path d="M36 10 L48 28 L58 44 H40 L44 30Z" fill="#a8dde6"/><rect x="0" y="44" width="64" height="20" fill="#1c6f94" opacity=".85"/><path d="M14 52 L32 62 L50 52" fill="#a8dde6" opacity=".5"/>${E(27,33,3.2,'#fff')}${E(39,33,3.2,'#fff')}${E(29,33.5,1.6,'#111')}${E(41,33.5,1.6,'#111')}<path d="M27 39 Q33 42 39 39" stroke="#0b2a3d" stroke-width="1.5" fill="none"/><path d="M22 28 L30 27 M36 27 L44 29" stroke="#0b2a3d" stroke-width="1.5"/>`,
  sit:'Hej. Det her er kun toppen af mig.',allin:['Det her var de andre 90 procent.','Titanic-energi.','Jeg er større under vandet.'],raise:['Isen vokser.','Kælvning! Mere i puljen.','Kold. Beregnende. Isbjerg.'],fold:['Jeg smelter lidt. Det er klimaet.','Jeg driver mod syd.','Ilulissat ringede. Jeg skal hjem.'],win:'Titanic-energi. Undskyld til Titanic.'},
 {name:'Tuttu Disco',title:'Rensdyr med diskokugle i geviret.',bg:'#4b2a7a',
  svg:`<path d="M22 22 L16 6 M16 6 L10 8 M16 6 L20 2 M18 14 L11 14 M42 22 L48 6 M48 6 L54 8 M48 6 L44 2 M46 14 L53 14" stroke="#c9a66b" stroke-width="3" stroke-linecap="round" fill="none"/>${E(48,6,5,'#dfe7f2')}<path d="M44 4 H52 M44 8 H52 M48 1 V11" stroke="#7a6cff" stroke-width=".9"/><ellipse cx="32" cy="36" rx="14" ry="16" fill="#8a5a3c"/><ellipse cx="32" cy="46" rx="9" ry="8" fill="#b88a6a"/>${E(32,43,4,'#ff3b5c')}${E(26,32,2.6,'#111')}${E(38,32,2.6,'#111')}${E(27,31,.9,'#fff')}${E(39,31,.9,'#fff')}<path d="M18 30 L12 26 L18 34Z M46 30 L52 26 L46 34Z" fill="#8a5a3c"/><path d="M27 50 Q32 54 37 50" stroke="#111" stroke-width="1.4" fill="none"/>`,
  sit:'Rensdyr-rizz: maksimum. Lad os danse.',allin:['Rensdyr-rizz: MAKSIMUM.','Bass drop. All-in.','Næsen lyser. Du ved hvad det betyder.'],raise:['Disco-hævning!','Mere tempo!','Kom så, Kangerlussuaq!'],fold:['Lysene slukkes. Midlertidigt.','Jeg går ud og ryger. Nej. Jeg går ud og græsser.','Sangen var dårlig alligevel.'],win:'Danser hele vejen hjem til Kangerlussuaq.'},
 {name:'Umimmak the GOAT',title:'Moskusokse. Teknisk set i gedefamilien. Literal GOAT.',bg:'#3d5c2a',
  svg:`<path d="M12 30 C4 26 4 16 14 14 C20 13 24 18 24 22 M52 30 C60 26 60 16 50 14 C44 13 40 18 40 22" stroke="#e6d2a8" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M14 22 Q32 10 50 22" stroke="#e6d2a8" stroke-width="6" fill="none"/><path d="M14 26 C10 40 14 58 22 60 L42 60 C50 58 54 40 50 26 C44 20 20 20 14 26Z" fill="#3a2a1e"/><path d="M18 40 L16 58 M24 42 L22 60 M40 42 L42 60 M46 40 L48 58" stroke="#2a1d14" stroke-width="2"/><ellipse cx="32" cy="44" rx="7" ry="9" fill="#5a4330"/>${E(26,34,2.2,'#ffd23f')}${E(38,34,2.2,'#ffd23f')}<ellipse cx="32" cy="50" rx="4" ry="2.5" fill="#1a120c"/><path d="M22 4 L26 10 L32 3 L38 10 L42 4 L41 13 H23Z" fill="#ffd23f"/><text x="32" y="12.5" font-size="4.5" text-anchor="middle" font-weight="900" fill="#3a2a1e">GOAT</text>`,
  sit:'Moskusokse. Teknisk set i gedefamilien. Altså bogstaveligt talt en GOAT.',allin:['GOAT\'en går all-in. Selvfølgelig.','Mæææh. Det betyder all-in.','Jeg har overlevet istiden. Jeg overlever dig.'],raise:['GOAT-hævning.','Jeg er bare bedre. Biologisk.','Mæh.'],fold:['Selv GOATs hviler benene.','Jeg lader jer vinde én. Af medlidenhed.','Strategisk mæh.'],win:'Hvad forventede I? Jeg er GOAT\'en.'}
];
function sayLine(s){const y=s.hand?.say;if(!y)return null;const c=CHARS[y.seat];const arr=c[y.kind];return Array.isArray(arr)?arr[(y.n||0)%arr.length]:null}
/* ---------- hand evaluation ---------- */
function eval5(cs){
  const r=cs.map(c=>c%13).sort((a,b)=>b-a), su=cs.map(c=>Math.floor(c/13));
  const flush=su.every(x=>x===su[0]);
  const cnt={};r.forEach(x=>cnt[x]=(cnt[x]||0)+1);
  const g=Object.entries(cnt).map(([k,v])=>[v,+k]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
  const u=[...new Set(r)];let sh=-1;
  if(u.length===5){if(u[0]-u[4]===4)sh=u[0];else if(u[0]===12&&u[1]===3)sh=3}
  if(sh>=0&&flush)return[8,sh];
  if(g[0][0]===4)return[7,g[0][1],g[1][1]];
  if(g[0][0]===3&&g[1][0]===2)return[6,g[0][1],g[1][1]];
  if(flush)return[5,...r];
  if(sh>=0)return[4,sh];
  if(g[0][0]===3)return[3,...g.map(x=>x[1])];
  if(g[0][0]===2&&g[1][0]===2)return[2,...g.map(x=>x[1])];
  if(g[0][0]===2)return[1,...g.map(x=>x[1])];
  return[0,...r];
}
const cmp=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??-1)-(b[i]??-1);if(d)return d}return 0};
function best(cards){let bs=null,bc=null;const n=cards.length;
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let c=b+1;c<n;c++)for(let d=c+1;d<n;d++)for(let e=d+1;e<n;e++){
    const h=[cards[a],cards[b],cards[c],cards[d],cards[e]],s=eval5(h);if(!bs||cmp(s,bs)>0){bs=s;bc=h}}
  return{score:bs,cards:bc}}
function handName(s){if(s[0]===8&&s[1]===12)return'Royal flush';return HAND_NAMES[s[0]]}

/* ---------- game rules (pure, run inside the lock) ---------- */
function emptyState(){return{v:0,seats:Array(N).fill(null),sb:10,bb:20,stack:1000,dealer:-1,hand:null,log:[],paused:false,requests:{},leader:null}}
function norm(s){if(!Array.isArray(s.seats))s.seats=[];while(s.seats.length<N)s.seats.push(null);s.log=s.log||[];s.requests=s.requests||{};return s}
const nick=(s,i)=>s.seats[i]?.nick||'Spiller';
function log(s,m){s.log.push(m);if(s.log.length>40)s.log=s.log.slice(-40)}
const eligible=p=>p&&!p.leaving&&p.chips>0;
const live=p=>p&&p.inHand&&!p.folded;
const canAct=p=>live(p)&&!p.allin;
function nextIdx(s,from,pred){for(let k=1;k<=N;k++){const i=((from+k)%N+N)%N;if(pred(s.seats[i],i))return i}return -1}
function put(p,amt){amt=Math.min(amt,p.chips);p.chips-=amt;p.bet+=amt;p.total+=amt;if(p.chips===0)p.allin=true;return amt}

function startHand(s){
  s.seats=s.seats.map(p=>p&&p.leaving?null:p);
  const players=s.seats.map((p,i)=>eligible(p)?i:-1).filter(i=>i>=0);
  if(players.length<2)return false;
  s.seats.forEach(p=>{if(p)Object.assign(p,{inHand:false,bet:0,total:0,folded:false,allin:false,acted:false,hole:''})});
  const dealer=nextIdx(s,s.dealer<0?N-1:s.dealer,eligible);
  s.dealer=dealer;
  const deck=shuffled();
  players.forEach(i=>s.seats[i].inHand=true);
  let k=0;const order=[];for(let j=1;j<=N;j++){const i=(dealer+j)%N;if(s.seats[i]?.inHand)order.push(i)}
  const holes={};order.forEach(i=>holes[i]=[deck[k++]]);order.forEach(i=>holes[i].push(deck[k++]));
  order.forEach(i=>s.seats[i].hole=enc(holes[i]));
  const board=deck.slice(k,k+5);
  const heads=players.length===2;
  const sbSeat=heads?dealer:nextIdx(s,dealer,p=>p?.inHand);
  const bbSeat=nextIdx(s,sbSeat,p=>p?.inHand);
  put(s.seats[sbSeat],s.sb);put(s.seats[bbSeat],s.bb);
  s.hand={id:Math.random().toString(36).slice(2,10),phase:'preflop',board:[],bd:enc(board),curBet:Math.max(s.seats[sbSeat].bet,s.seats[bbSeat].bet,s.bb),minRaise:s.bb,toAct:-1,turnAt:Date.now(),sbSeat,bbSeat,result:null,no:(s.hand?.no||0)+1};
  log(s,`Hånd #${s.hand.no}: ${nick(s,dealer)} giver. Blinds ${nick(s,sbSeat)} ${s.sb} / ${nick(s,bbSeat)} ${s.bb}.`);
  s.hand.toAct=bbSeat;
  advance(s,bbSeat);
  return true;
}

function advance(s,from){
  const h=s.hand;
  const L=s.seats.map((p,i)=>live(p)?i:-1).filter(i=>i>=0);
  if(L.length===1){award(s,L[0]);return}
  const actors=L.filter(i=>!s.seats[i].allin);
  const done=actors.every(i=>{const p=s.seats[i];return(p.acted||actors.length<=1)&&p.bet>=h.curBet});
  if(!done){
    h.toAct=nextIdx(s,from,(p)=>canAct(p)&&(!p.acted||p.bet<h.curBet));
    h.turnAt=Date.now();return;
  }
  // street over
  const board=dec(h.bd);
  while(true){
    s.seats.forEach(p=>{if(p){p.bet=0;p.acted=false}});
    h.curBet=0;h.minRaise=s.bb;
    if(h.phase==='preflop'){h.phase='flop';h.board=board.slice(0,3)}
    else if(h.phase==='flop'){h.phase='turn';h.board=board.slice(0,4)}
    else if(h.phase==='turn'){h.phase='river';h.board=board.slice(0,5)}
    else {showdown(s);return}
    const act=s.seats.filter(canAct).length;
    if(act>=2){h.toAct=nextIdx(s,s.dealer,canAct);h.turnAt=Date.now();return}
  }
}

function award(s,w){
  const pot=s.seats.reduce((a,p)=>a+(p?.inHand?p.total:0),0);
  s.seats[w].chips+=pot;
  s.hand.phase='showdown';s.hand.toAct=-1;s.hand.finishedAt=Date.now();
  s.hand.result={winners:[{seat:w,amount:pot,hand:''}],shown:{}};
  s.seats.forEach(p=>{if(p)p.bet=0});
  log(s,`${nick(s,w)} vinder ${fmt(pot)} – alle andre foldede.`);
}

function showdown(s){
  const h=s.hand;const board=h.board;
  const L=s.seats.map((p,i)=>live(p)?i:-1).filter(i=>i>=0);
  const evals={};L.forEach(i=>evals[i]=best([...dec(s.seats[i].hole),...board]));
  const tot=s.seats.map(p=>p?.inHand?p.total:0);
  const levels=[...new Set(tot.filter(t=>t>0))].sort((a,b)=>a-b);
  let prev=0;const pots=[];
  levels.forEach(Lv=>{
    let amt=0;tot.forEach(t=>amt+=Math.max(0,Math.min(t,Lv)-prev));
    let elig=L.filter(i=>tot[i]>=Lv);
    if(!elig.length&&pots.length){pots[pots.length-1].amt+=amt}
    else if(elig.length){const last=pots[pots.length-1];if(last&&last.elig.join()===elig.join())last.amt+=amt;else pots.push({amt,elig})}
    prev=Lv;
  });
  const won={};
  pots.forEach(pt=>{
    let top=null,ws=[];
    pt.elig.forEach(i=>{const c=top?cmp(evals[i].score,top):1;if(c>0){top=evals[i].score;ws=[i]}else if(c===0)ws.push(i)});
    const share=Math.floor(pt.amt/ws.length);let rem=pt.amt-share*ws.length;
    const ordered=[];for(let j=1;j<=N;j++){const i=(s.dealer+j)%N;if(ws.includes(i))ordered.push(i)}
    ordered.forEach(i=>{let a=share;if(rem>0){a++;rem--}won[i]=(won[i]||0)+a;s.seats[i].chips+=a});
  });
  const shown={};L.forEach(i=>shown[i]=dec(s.seats[i].hole));
  const winners=Object.entries(won).map(([i,a])=>({seat:+i,amount:a,hand:handName(evals[i].score),best:evals[i].cards}));
  h.phase='showdown';h.toAct=-1;h.finishedAt=Date.now();
  h.result={winners,shown,names:Object.fromEntries(L.map(i=>[i,handName(evals[i].score)]))};
  s.seats.forEach(p=>{if(p)p.bet=0});
  winners.forEach(w=>log(s,`${nick(s,w.seat)} vinder ${fmt(w.amount)} med ${w.hand}.`));
}

function act(s,seat,kind,to){
  const h=s.hand,p=s.seats[seat];
  if(!h||!['preflop','flop','turn','river'].includes(h.phase)||h.toAct!==seat||!canAct(p))return false;
  const toCall=h.curBet-p.bet;
  if(kind==='fold'){p.folded=true;log(s,`${p.nick} folder.`)}
  else if(kind==='check'){if(toCall>0)return false;log(s,`${p.nick} checker.`)}
  else if(kind==='call'){if(toCall<=0)return false;const a=put(p,toCall);log(s,`${p.nick} ${p.allin?'går all-in med':'synker'} ${fmt(a)}.`)}
  else if(kind==='raise'){
    const max=p.bet+p.chips;to=Math.min(Math.floor(to),max);
    if(to<=h.curBet)return false;
    if(to<h.curBet+h.minRaise&&to<max)return false;
    const size=to-h.curBet;
    if(size>=h.minRaise){h.minRaise=size;s.seats.forEach((q,i)=>{if(i!==seat&&canAct(q))q.acted=false})}
    h.curBet=to;put(p,to-p.bet);
    log(s,`${p.nick} ${p.allin?'går all-in til':(toCall>0?'hæver til':'byder')} ${fmt(to)}.`);
  } else return false;
  p.acted=true;
  if(p.allin||kind==='fold'||kind==='raise')h.say={seat,kind:p.allin?'allin':kind,at:Date.now(),n:Math.floor(Math.random()*3)};
  {const ln=sayLine(s);if(ln)log(s,`${CHARS[seat].name}: “${ln}”`)}
  advance(s,seat);
  return true;
}


module.exports={N,NEXT_HAND_MS,TURN_MS,CHARS,fmt,emptyState,norm,log,eligible,live,canAct,startHand,advance,act,award};

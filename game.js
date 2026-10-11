// Shared poker rules for Nanoq Hold'em. Runs on the server, which is the only place hands are dealt.
const crypto=require('crypto');
const N=8, NEXT_HAND_MS=9000, TURN_MS=40000, RIT_MS=15000;
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

/* fast evaluator for 1-7 cards: one comparable number, category in the top bits */
function straightHigh(m){
  const w=(m<<1)|((m>>12)&1);// bit 0 is the ace played low, bit r+1 is rank r
  for(let hi=13;hi>=4;hi--){const need=0x1f<<(hi-4);if((w&need)===need)return hi-1}
  return -1}
function eval7(cs){
  const rc=new Array(13).fill(0),sc=[0,0,0,0],sm=[0,0,0,0];let mask=0;
  for(const c of cs){const r=c%13,s=(c/13)|0;rc[r]++;sc[s]++;sm[s]|=1<<r;mask|=1<<r}
  const pack=(cat,ks)=>{let v=cat;for(let i=0;i<5;i++)v=v*16+(ks[i]??0);return v};
  const top=(m,n,skip=-1)=>{const o=[];for(let r=12;r>=0&&o.length<n;r--)if(m>>r&1&&r!==skip)o.push(r);return o};
  for(let s=0;s<4;s++)if(sc[s]>=5){const sf=straightHigh(sm[s]);if(sf>=0)return pack(8,[sf]);return pack(5,top(sm[s],5))}
  let quad=-1,trips=[],pairs=[];
  for(let r=12;r>=0;r--){if(rc[r]===4)quad=r;else if(rc[r]===3)trips.push(r);else if(rc[r]===2)pairs.push(r)}
  if(quad>=0)return pack(7,[quad,top(mask,1,quad)[0]]);
  if(trips.length&&(trips.length>1||pairs.length)){const t=trips[0],p=Math.max(trips[1]??-1,pairs[0]??-1);return pack(6,[t,p])}
  const st=straightHigh(mask);if(st>=0)return pack(4,[st]);
  if(trips.length){const t=trips[0];return pack(3,[t,...top(mask&~(1<<t),2)])}
  if(pairs.length>=2){const a=pairs[0],b=pairs[1];return pack(2,[a,b,...top(mask&~(1<<a)&~(1<<b),1)])}
  if(pairs.length){const a=pairs[0];return pack(1,[a,...top(mask&~(1<<a),3)])}
  return pack(0,top(mask,5))}
const catOf=v=>Math.floor(v/1048576);

/* chance to win for every open hand; exact when at most two cards are to come, sampled otherwise */
function equity(holes,board,dead=[]){
  const seats=Object.keys(holes).map(Number);
  const used=new Set([...board,...dead,...seats.flatMap(i=>holes[i])]);
  const deck=[...Array(52).keys()].filter(c=>!used.has(c));
  const need=5-board.length,win={},tie={};seats.forEach(i=>{win[i]=0;tie[i]=0});let n=0;
  const score=b=>{let bestV=-1,ws=[];for(const i of seats){const v=eval7([...holes[i],...b]);if(v>bestV){bestV=v;ws=[i]}else if(v===bestV)ws.push(i)}
    if(ws.length===1)win[ws[0]]++;else ws.forEach(i=>tie[i]+=1/ws.length);n++};
  if(need<=0)score(board);
  else if(need===1)deck.forEach(a=>score([...board,a]));
  else if(need===2){for(let a=0;a<deck.length;a++)for(let b=a+1;b<deck.length;b++)score([...board,deck[a],deck[b]])}
  else{const d=deck.slice(),SAMPLES=Math.max(2500,Math.round(18000/seats.length));for(let k=0;k<SAMPLES;k++){for(let j=0;j<need;j++){const r=j+Math.floor(Math.random()*(d.length-j));[d[j],d[r]]=[d[r],d[j]]}score([...board,...d.slice(0,need)])}}
  return Object.fromEntries(seats.map(i=>[i,{w:Math.round(win[i]/n*1000)/10,t:Math.round(tie[i]/n*1000)/10}]))}
const SUITS=['♠','♥','♦','♣'];
const cardTxt=c=>(RANKS[c%13]==='T'?'10':RANKS[c%13])+SUITS[Math.floor(c/13)];

/* ---------- game rules ---------- */
const BETTING=['preflop','flop','turn','river'];
function emptyState(){return{v:0,seats:Array(N).fill(null),sb:10,bb:20,stack:1000,dealer:-1,hand:null,log:[],paused:false,requests:{},leader:null,
  rit:true,      // players may vote to run it twice when everyone is all-in
  jpRoyal:5000,  // the house pays this extra to whoever shows down a royal flush
  jp72:100,      // every other player pays this to whoever wins a pot holding 7-2
  stats:{},
  ledger:{}}}      // per player: chips bought in and chips taken away when leaving
function norm(s){if(!Array.isArray(s.seats))s.seats=[];while(s.seats.length<N)s.seats.push(null);s.log=s.log||[];s.requests=s.requests||{};
  if(s.rit===undefined)s.rit=true;if(s.jpRoyal===undefined)s.jpRoyal=5000;if(s.jp72===undefined)s.jp72=100;s.stats=s.stats||{};s.ledger=s.ledger||{};return s}
const nick=(s,i)=>s.seats[i]?.nick||'Spiller';
function log(s,m){s.log.push(m);if(s.log.length>50)s.log=s.log.slice(-50)}
const eligible=p=>p&&!p.leaving&&!p.sitout&&p.chips>0;
const live=p=>p&&p.inHand&&!p.folded;
const canAct=p=>live(p)&&!p.allin;
function nextIdx(s,from,pred){for(let k=1;k<=N;k++){const i=((from+k)%N+N)%N;if(pred(s.seats[i],i))return i}return -1}
function put(p,amt){amt=Math.min(amt,p.chips);p.chips-=amt;p.bet+=amt;p.total+=amt;if(p.chips===0)p.allin=true;return amt}
const is72=cards=>{const r=dec(cards).map(c=>c%13).sort((a,b)=>a-b);return r.length===2&&r[0]===0&&r[1]===5};
function stat(s,uid){const st=s.stats[uid]||(s.stats[uid]={won:0,biggest:0,royal:0,b72:0});
  for(const k of ['hands','raises','tank','slow','ape','ckn','nose','seal','tilts','busts','streak','gambler'])st[k]=st[k]||0;st.heads=st.heads||[];return st}
const BANK_MS=60000,SLOW_MS=15000;
const bankOf=(s,uid)=>{s.bank=s.bank||{};if(s.bank[uid]==null)s.bank[uid]=(s.bankSec??60)*1000;return s.bank[uid]};
function ledger(s,p){const L=s.ledger||(s.ledger={});const l=L[p.uid]||(L[p.uid]={nick:p.nick,seat:-1,in:0,cash:0});l.nick=p.nick;return l}
function buyIn(s,p,amt,seat){const l=ledger(s,p);l.in+=amt;if(seat!=null)l.seat=seat}
function cashOut(s,p){ledger(s,p).cash+=p.chips}

function startHand(s){
  s.seats=s.seats.map(p=>{if(p&&p.leaving){cashOut(s,p);return null}return p});
  const players=s.seats.map((p,i)=>eligible(p)?i:-1).filter(i=>i>=0);
  if(players.length<2)return false;
  s.seats.forEach(p=>{if(p){Object.assign(p,{inHand:false,bet:0,total:0,folded:false,allin:false,acted:false,hole:''});if(p.curse>0)p.curse--;if(p.ears>0)p.ears--}});
  const dealer=nextIdx(s,s.dealer<0?N-1:s.dealer,eligible);
  s.dealer=dealer;
  const deck=shuffled();
  players.forEach(i=>{s.seats[i].inHand=true;stat(s,s.seats[i].uid).hands++});
  let k=0;const order=[];for(let j=1;j<=N;j++){const i=(dealer+j)%N;if(s.seats[i]?.inHand)order.push(i)}
  const holes={};order.forEach(i=>holes[i]=[deck[k++]]);order.forEach(i=>holes[i].push(deck[k++]));
  order.forEach(i=>s.seats[i].hole=enc(holes[i]));
  const board=deck.slice(k,k+5);
  const heads=players.length===2;
  const sbSeat=heads?dealer:nextIdx(s,dealer,p=>p?.inHand);
  const bbSeat=nextIdx(s,sbSeat,p=>p?.inHand);
  const posted={};posted[sbSeat]=put(s.seats[sbSeat],s.sb);posted[bbSeat]=(posted[bbSeat]||0)+put(s.seats[bbSeat],s.bb);
  s.hand={id:Math.random().toString(36).slice(2,10),phase:'preflop',board:[],bd:enc(board),rest:enc(deck.slice(k+5)),
    curBet:Math.max(s.seats[sbSeat].bet,s.seats[bbSeat].bet,s.bb),minRaise:s.bb,toAct:-1,turnAt:Date.now(),sbSeat,bbSeat,result:null,no:(s.hand?.no||0)+1,extraWait:0,shows:{},fracs:{},think:{},fx:[],posted,raised:{},minr:{},foldAt:{},aggr:-1,overbet:-1};
  // the shaman's prophecy for the night, sealed until the final show
  if(!s.prophecy){const u=players.map(i=>({uid:s.seats[i].uid,nick:s.seats[i].nick}));const a=crypto.randomInt(u.length);let b=crypto.randomInt(u.length-1);if(b>=a)b++;
    s.prophecy={win:u[a],fish:u[b],at:Date.now()};s.hand.fx.push({t:'shaman'});log(s,'🔮 Shamanen har talt. Spådommen for aftenen er forseglet.')}
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
  s.seats.forEach(p=>{if(p){p.bet=0;p.acted=false}});
  h.curBet=0;h.minRaise=s.bb;h.fracs={};
  // nobody can bet any more and cards are still to come: the table may vote to run it twice
  const bettingOver=s.seats.filter(canAct).length<2;
  if(bettingOver&&h.phase!=='river'&&!h.open){
    // all-in: the hands are turned face up, TV style, with the chance to win
    h.open=Object.fromEntries(L.map(i=>[i,dec(s.seats[i].hole)]));
    h.eqs=[{n:h.board.length,eq:equity(h.open,h.board)}];
    L.forEach(i=>{const e=h.eqs[0].eq[i],pct=e.w+e.t,p=s.seats[i],st=stat(s,p.uid);
      if(i===h.aggr&&p.allin){if(pct<30){h.fx.push({t:'gambler',seat:i,pct});st.gambler++;log(s,`🤠 ${p.nick} gik all-in med ${Math.round(pct)} % chance. Know when to fold 'em…`)}}
      else if(pct<25){h.fx.push({t:'ape',seat:i,pct});st.ape++;p.ears=2;log(s,`🐒 Dum abe! ${p.nick} gik med på en lortehånd (${Math.round(pct)} %).`)}});
  }
  if(bettingOver&&h.phase!=='river'&&s.rit&&!h.ritDone){
    h.prevPhase=h.phase;h.phase='rit';h.toAct=-1;h.ritVotes={};h.ritAt=Date.now();h.ritSeats=L;
    log(s,'Alle er all-in. Skal kortene deles én eller to gange?');
    return;
  }
  dealOn(s);
}

/* deal the next street, or run the board out when betting is over */
function dealOn(s){
  const h=s.hand;const board=dec(h.bd);let streets=0;
  // running the board out: odds for each street the table is about to see
  if(h.open&&!h.eqDone&&s.seats.filter(canAct).length<2){h.eqDone=true;
    const n0=h.board.length;
    for(const n of [3,4,5])if(n>n0)h.eqs.push({n,eq:equity(h.open,board.slice(0,n))});
    if(h.twice){const b2=dec(h.bd2);h.eqs2=[{n:n0,eq:h.eqs[0].eq}];for(const n of [3,4,5])if(n>n0)h.eqs2.push({n,eq:equity(h.open,b2.slice(0,n),board.slice(n0))})}
  }
  while(true){
    if(h.phase==='preflop'){h.phase='flop';h.board=board.slice(0,3)}
    else if(h.phase==='flop'){h.phase='turn';h.board=board.slice(0,4)}
    else if(h.phase==='turn'){h.phase='river';h.board=board.slice(0,5)}
    else {h.extraWait=Math.max(0,streets-1)*1.8+(h.twice?streets*1.8+1:0);showdown(s);return}
    streets++;h.fracs={};
    s.seats.forEach(p=>{if(p){p.bet=0;p.acted=false}});
    const act=s.seats.filter(canAct).length;
    if(act>=2){h.toAct=nextIdx(s,s.dealer,canAct);h.turnAt=Date.now();return}
  }
}

/* a run-it-twice vote; everyone involved must say yes */
function vote(s,seat,yes){
  const h=s.hand;if(!h||h.phase!=='rit'||!h.ritSeats.includes(seat)||h.ritVotes[seat]!==undefined)return false;
  h.ritVotes[seat]=!!yes;
  log(s,`${nick(s,seat)} stemmer for at dele ${yes?'to gange':'én gang'}.`);
  if(!yes)resolveRit(s,false);
  else if(h.ritSeats.every(i=>h.ritVotes[i]===true))resolveRit(s,true);
  return true;
}
function resolveRit(s,twice){
  const h=s.hand;if(!h||h.phase!=='rit')return;
  h.ritDone=true;h.twice=twice;h.phase=h.prevPhase;
  if(twice){
    // the second run shares the cards already out and gets fresh cards for the rest
    const known=h.board.length,rest=dec(h.rest);
    h.bd2=enc([...dec(h.bd).slice(0,known),...rest.slice(0,5-known)]);
    log(s,'Kortene deles TO gange! Puljen deles i to.');
  } else log(s,'Kortene deles én gang.');
  dealOn(s);
}

function award(s,w){
  const h=s.hand;
  const pot=s.seats.reduce((a,p)=>a+(p?.inHand?p.total:0),0);
  s.seats[w].chips+=pot;
  h.phase='showdown';h.toAct=-1;h.finishedAt=Date.now();
  // the cards that would have come, shown greyed out once the hand is over
  h.result={winners:[{seat:w,amount:pot,hand:''}],shown:{},jackpots:[],ghost:dec(h.bd).slice(h.board.length,5)};
  s.seats.forEach(p=>{if(p)p.bet=0});
  log(s,`${nick(s,w)} vinder ${fmt(pot)} – alle andre foldede.`);
  const st=stat(s,s.seats[w].uid);st.won++;st.biggest=Math.max(st.biggest,pot);
  if(h.overbet===w){h.fx.push({t:'bomb',seat:w});log(s,`💣 Overkill! ${nick(s,w)} smed en atombombe for at vinde ${fmt(pot)}.`)}
  pay72(s,[w]);
  finish(s,[w]);
}

/* split the pot into side pots and pay each to the best hand on one board */
function payBoard(s,board,L,pots,part){
  const evals={};L.forEach(i=>evals[i]=best([...dec(s.seats[i].hole),...board]));
  const won={};
  pots.forEach(pt=>{
    const amt=part===0?Math.ceil(pt.amt/pt.split):Math.floor(pt.amt/pt.split);
    let top=null,ws=[];
    pt.elig.forEach(i=>{const c=top?cmp(evals[i].score,top):1;if(c>0){top=evals[i].score;ws=[i]}else if(c===0)ws.push(i)});
    const share=Math.floor(amt/ws.length);let rem=amt-share*ws.length;
    const ordered=[];for(let j=1;j<=N;j++){const i=(s.dealer+j)%N;if(ws.includes(i))ordered.push(i)}
    ordered.forEach(i=>{let a=share;if(rem>0){a++;rem--}won[i]=(won[i]||0)+a;s.seats[i].chips+=a});
  });
  const winners=Object.entries(won).map(([i,a])=>({seat:+i,amount:a,hand:handName(evals[i].score),best:evals[i].cards}));
  return{board,winners,evals};
}

function showdown(s){
  const h=s.hand;
  const L=s.seats.map((p,i)=>live(p)?i:-1).filter(i=>i>=0);
  const tot=s.seats.map(p=>p?.inHand?p.total:0);
  const levels=[...new Set(tot.filter(t=>t>0))].sort((a,b)=>a-b);
  let prev=0;const pots=[];const split=h.twice?2:1;
  levels.forEach(Lv=>{
    let amt=0;tot.forEach(t=>amt+=Math.max(0,Math.min(t,Lv)-prev));
    let elig=L.filter(i=>tot[i]>=Lv);
    if(!elig.length&&pots.length){pots[pots.length-1].amt+=amt}
    else if(elig.length){const last=pots[pots.length-1];if(last&&last.elig.join()===elig.join())last.amt+=amt;else pots.push({amt,elig,split})}
    prev=Lv;
  });
  const runs=[payBoard(s,h.board,L,pots,0)];
  if(h.twice){h.board2=dec(h.bd2);runs.push(payBoard(s,h.board2,L,pots,1))}
  const won={};runs.forEach(r=>r.winners.forEach(w=>won[w.seat]=(won[w.seat]||0)+w.amount));
  const r0=runs[0];
  const winners=Object.entries(won).map(([i,a])=>{const r=runs.find(x=>x.winners.some(w=>w.seat===+i));const w=r.winners.find(x=>x.seat===+i);return{seat:+i,amount:a,hand:w.hand,best:w.best}});
  const shown={};L.forEach(i=>shown[i]=dec(s.seats[i].hole));
  h.phase='showdown';h.toAct=-1;h.finishedAt=Date.now();
  h.result={winners,shown,names:Object.fromEntries(L.map(i=>[i,handName(r0.evals[i].score)])),jackpots:[],
    runs:h.twice?runs.map(r=>({board:r.board,winners:r.winners.map(w=>({seat:w.seat,amount:w.amount,hand:w.hand,best:w.best}))})):null};
  s.seats.forEach(p=>{if(p)p.bet=0});
  if(h.twice)runs.forEach((r,k)=>r.winners.forEach(w=>log(s,`Run ${k+1}: ${nick(s,w.seat)} vinder ${fmt(w.amount)} med ${w.hand}.`)));
  else winners.forEach(w=>log(s,`${nick(s,w.seat)} vinder ${fmt(w.amount)} med ${w.hand}.`));
  winners.forEach(w=>{const st=stat(s,s.seats[w.seat].uid);st.won++;st.biggest=Math.max(st.biggest,w.amount)});
  // royal flush jackpot: paid by the house to anyone who shows one down
  if(s.jpRoyal>0){
    const hit=new Set();runs.forEach(r=>L.forEach(i=>{const sc=r.evals[i].score;if(sc[0]===8&&sc[1]===12)hit.add(i)}));
    hit.forEach(i=>{s.seats[i].chips+=s.jpRoyal;h.result.jackpots.push({type:'royal',seat:i,amount:s.jpRoyal});stat(s,s.seats[i].uid).royal++;
      log(s,`ROYAL FLUSH JACKPOT! ${nick(s,i)} får ${fmt(s.jpRoyal)} chips fra banken.`)});
  }
  // slow-roll: sat on a strong winning hand for a long time before the last action
  h.result.slow=winners.filter(w=>(h.think?.[w.seat]||0)>SLOW_MS&&(r0.evals[w.seat]?.score[0]??0)>=3).map(w=>w.seat);
  h.result.slow.forEach(i=>{stat(s,s.seats[i].uid).slow++;log(s,`Dårlig stil 🐟 ${nick(s,i)} tænkte længe med en vinderhånd.`)});
  // the most painful loss: a big pot lost with a decent hand
  L.filter(i=>!won[i]).forEach(i=>{const sc=r0.evals[i].score;if(sc[0]<2)return;const st=stat(s,s.seats[i].uid),amt=tot[i];
    if(!st.ouch||amt>st.ouch.amt)st.ouch={amt,hand:handName(sc)}});
  // bluffed, got caught: Pinocchio
  L.filter(i=>!won[i]&&h.raised[i]&&r0.evals[i].score[0]===0).forEach(i=>{h.fx.push({t:'nose',seat:i});stat(s,s.seats[i].uid).nose++;log(s,`🤥 ${nick(s,i)} blev taget i et bluff. Næsen vokser.`)});
  // rivered or bad beat: what was the loser's chance before the last cards?
  if(!h.twice&&L.length>=2){
    const holes=Object.fromEntries(L.map(i=>[i,dec(s.seats[i].hole)])),full=dec(h.bd);
    const at=n=>{const e=h.eqs?.find(x=>x.n===n);return e?e.eq:equity(holes,full.slice(0,n))};
    const eq3=at(3),eq4=at(4),eq0=h.eqs?.find(x=>x.n===0)?.eq;
    L.filter(i=>!won[i]).forEach(i=>{const p=s.seats[i],st=stat(s,p.uid);
      const pc=e=>e&&e[i]?e[i].w+e[i].t:0;const peak=Math.max(pc(eq0),pc(eq3),pc(eq4));
      if(peak>=80){p.curse=3;h.fx.push({t:'curse',seat:i,pct:Math.round(peak)});log(s,`👹 Tupilak-forbandelsen! ${p.nick} tabte med ${Math.round(peak)} % chance.`);
        if(!st.badbeat||peak>st.badbeat.pct)st.badbeat={pct:Math.round(peak),amt:tot[i],hand:handName(r0.evals[i].score)}}
      else if(pc(eq4)>50){h.fx.push({t:'narwhal',seat:i});log(s,`🦄 Narhval i ryggen! ${p.nick} blev rivered.`)}});
  }
  pay72(s,winners.map(w=>w.seat));
  finish(s,winners.map(w=>w.seat));
}

/* after every hand: tilt streaks, busts, head hunting and the chicken who folded a winner */
function finish(s,winSeats){
  const h=s.hand,res=h.result;
  const amt=i=>(res.winners.find(w=>w.seat===i)?.amount||0);
  const top=[...winSeats].sort((a,b)=>amt(b)-amt(a))[0];
  const full=dec(h.bd);
  const beat=winSeats.map(w=>eval7([...dec(s.seats[w].hole),...full]));
  s.seats.forEach((p,i)=>{if(!p||!p.inHand)return;const st=stat(s,p.uid);
    const vol=p.total-(h.posted?.[i]||0)>0;
    if(winSeats.includes(i)){st.streak=0;p.tilt=false}
    else if(vol){st.streak++;if(st.streak===4){p.tilt=true;st.tilts++;h.fx.push({t:'tilt',seat:i});log(s,`🚨 Tilt-alarm! ${p.nick} har tabt fire puljer i træk.`)}}
    if(p.chips===0&&!p.leaving){st.busts++;h.fx.push({t:'bust',seat:i});log(s,`🏔️ ${p.nick} er flad og går op på fjeldet.`);
      if(top!=null&&top!==i){const ht=stat(s,s.seats[top].uid);ht.heads.push(i);h.fx.push({t:'head',seat:top,of:i});log(s,`🎯 ${nick(s,top)} tager ${CHARS[i].name}s hoved som trofæ.`)}}
    if(p.folded&&!h.twice&&full.length===5&&(vol||h.foldAt?.[i]&&h.foldAt[i]!=='preflop')){
      const mine=eval7([...dec(p.hole),...full]);
      if(beat.length&&beat.every(v=>mine>v)){st.ckn++;h.fx.push({t:'chicken',seat:i});log(s,`🐔 Kujon! ${p.nick} foldede en hånd, der ville have vundet.`)}}
  });
}

/* 7-2 bounty: everyone else at the table pays whoever wins a pot holding 7-2 */
function pay72(s,seats){
  if(!(s.jp72>0))return;const h=s.hand;
  seats.forEach(w=>{
    const p=s.seats[w];if(!p||!is72(p.hole))return;
    let got=0;
    s.seats.forEach((q,i)=>{if(!q||i===w||q.leaving)return;const a=Math.min(s.jp72,q.chips);q.chips-=a;got+=a});
    p.chips+=got;
    h.result.shown[w]=dec(p.hole);
    h.result.jackpots.push({type:'72',seat:w,amount:got});
    stat(s,p.uid).b72++;
    log(s,`7-2 BONUS! ${p.nick} vandt med 7-2 og får ${fmt(s.jp72)} fra hver spiller (${fmt(got)} i alt).`);
  });
}

/* after folding, or once the hand is over, a player may turn one or both cards face up */
function show(s,seat,which){
  const h=s.hand,p=s.seats[seat];
  if(!h||!p||!p.inHand)return'Du har ingen kort at vise.';
  if(!(p.folded||h.phase==='showdown'))return'Du kan vise dine kort, når du har foldet, eller når hånden er slut.';
  const hole=dec(p.hole);if(hole.length<2)return'Du har ingen kort at vise.';
  const pick=which==='a'?[hole[0]]:which==='b'?[hole[1]]:hole;
  const cur=new Set(h.shows[seat]||[]);const fresh=pick.filter(c=>!cur.has(c));
  if(!fresh.length)return'De kort er allerede vist.';
  fresh.forEach(c=>cur.add(c));h.shows[seat]=hole.filter(c=>cur.has(c));h.showAt=Date.now();
  log(s,`${p.nick} viser ${fresh.map(cardTxt).join(' ')}.`);
}

function act(s,seat,kind,to){
  const h=s.hand,p=s.seats[seat];
  if(!h||!BETTING.includes(h.phase)||h.toAct!==seat||!canAct(p))return false;
  const toCall=h.curBet-p.bet;
  // thinking time: anything past the normal clock comes out of the player's time bank
  const think=Date.now()-h.turnAt;h.think[seat]=think;
  {const st=stat(s,p.uid);if(think>10000)st.tank+=think-10000;
   if(think>TURN_MS){s.bank=s.bank||{};s.bank[p.uid]=Math.max(0,bankOf(s,p.uid)-(think-TURN_MS))}}
  const potNow=s.seats.reduce((a,q)=>a+(q?.inHand?q.total:0),0);
  if(kind==='fold'){p.folded=true;h.foldAt=h.foldAt||{};h.foldAt[seat]=h.phase;log(s,`${p.nick} folder.`)}
  else if(kind==='check'){if(toCall>0)return false;log(s,`${p.nick} checker.`)}
  else if(kind==='call'){if(toCall<=0)return false;const a=put(p,toCall);log(s,`${p.nick} ${p.allin?'går all-in med':'synker'} ${fmt(a)}.`)}
  else if(kind==='raise'){
    const max=p.bet+p.chips;to=Math.min(Math.floor(to),max);
    if(to<=h.curBet)return false;
    if(to<h.curBet+h.minRaise&&to<max)return false;
    const size=to-h.curBet,isMin=to===h.curBet+h.minRaise&&to<max&&h.curBet>0;
    if(potNow+toCall>0)h.fracs[seat]=Math.round(size/(potNow+toCall)*100)/100;
    if(size>=h.minRaise){h.minRaise=size;s.seats.forEach((q,i)=>{if(i!==seat&&canAct(q))q.acted=false})}
    h.curBet=to;put(p,to-p.bet);stat(s,p.uid).raises++;
    if(h.raised){h.raised[seat]=1;h.aggr=seat;h.overbet=p.allin&&size>=10*Math.max(1,potNow)?seat:-1;
      if(isMin){h.minr[seat]=(h.minr[seat]||0)+1;if(h.minr[seat]===3){stat(s,p.uid).seal++;h.fx.push({t:'seal',seat});log(s,`🦭 Nærig sæl! ${p.nick} har min-raiset tre gange.`)}}}
    log(s,`${p.nick} ${p.allin?'går all-in til':(toCall>0?'hæver til':'byder')} ${fmt(to)}.`);
  } else return false;
  p.acted=true;
  if(p.allin||kind==='fold'||kind==='raise')h.say={seat,kind:p.allin?'allin':kind,at:Date.now(),n:Math.floor(Math.random()*3)};
  {const ln=sayLine(s);if(ln)log(s,`${CHARS[seat].name}: “${ln}”`)}
  advance(s,seat);
  return true;
}

module.exports={bankOf,eval7,equity,show,buyIn,cashOut,RIT_MS,N,NEXT_HAND_MS,TURN_MS,CHARS,BETTING,fmt,emptyState,norm,log,eligible,live,canAct,startHand,advance,act,award,vote,resolveRit};

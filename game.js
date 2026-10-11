// Shared poker rules for Nanoq Hold'em. Runs on the server, which is the only place hands are dealt.
const crypto=require('crypto');
const N=10, NEXT_HAND_MS=9000, TURN_MS=40000, RIT_MS=15000;
const RANKS='23456789TJQKA';
const HAND_NAMES=['Højt kort','Et par','To par','Tre ens','Straight','Flush','Fuldt hus','Fire ens','Straight flush'];
const fmt=n=>Number(n||0).toLocaleString('da-DK');
// server keeps cards as plain arrays; only the owner ever receives them
const enc=a=>a.slice();
const dec=a=>Array.isArray(a)?a.slice():[];
function shuffled(){const d=[...Array(52).keys()];for(let i=51;i>0;i--){const j=crypto.randomInt(i+1);[d[i],d[j]]=[d[j],d[i]]}return d}
const E=(x,y,r,f)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
const BULLY_IMG='';
const CHARS=[
 {name:'Qilalugaq Kardashian',title:'Narhval med verdens største ego. Og tand.',bg:'#b0306a',
  svg:`<path d="M37 27 L54 -3 L42 29Z" fill="#f6dc8a"/><path d="M40 22 L45 21 M42.5 16 L47.5 15 M45.5 10 L50 9 M48.5 4 L52 3.2" stroke="#c9a24a" stroke-width="1.2"/><path d="M58 4 l1.4 2.8 2.8 1.4 -2.8 1.4 -1.4 2.8 -1.4 -2.8 -2.8 -1.4 2.8 -1.4z" fill="#fff"/><path d="M47 -2 l.9 1.8 1.8 .9 -1.8 .9 -.9 1.8 -.9 -1.8 -1.8 -.9 1.8 -.9z" fill="#fff"/><ellipse cx="32" cy="40" rx="21" ry="18" fill="#7f9bb3"/><ellipse cx="32" cy="48" rx="13" ry="8.5" fill="#c9d8e4"/>${E(17,35,1.6,'#5f7a91')}${E(47,37,1.4,'#5f7a91')}${E(21,45,1.2,'#5f7a91')}${E(44,46,1.1,'#5f7a91')}<path d="M19 35 Q23.5 30.5 28 35" stroke="#111" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M19.5 34.5 L17.5 32.5 M22 32.6 L21 30.2 M25 32.3 L25.2 29.8" stroke="#111" stroke-width="1.2" stroke-linecap="round"/>${E(40,34,4.4,'#fff')}${E(40.8,34.8,2.4,'#111')}${E(41.7,33.7,.9,'#fff')}<path d="M36.6 30.6 L35.2 28 M39.8 29.6 L39.8 26.8 M43.2 30.4 L44.8 28" stroke="#111" stroke-width="1.2" stroke-linecap="round"/><path d="M36 30 Q40 28.5 44.5 30.5" stroke="#111" stroke-width="1" fill="none"/><ellipse cx="18.5" cy="42" rx="3.6" ry="2" fill="#ff8fbf" opacity=".75"/><ellipse cx="45.5" cy="42" rx="3.6" ry="2" fill="#ff8fbf" opacity=".75"/><path d="M26 47 Q29 43.6 32 45.8 Q35 43.6 38 47 Q35 52 32 51.4 Q29 52 26 47Z" fill="#ff2f86"/><path d="M26.6 47 Q32 48.8 37.4 47" stroke="#a0104e" stroke-width=".9" fill="none"/><ellipse cx="29.5" cy="46" rx="1.6" ry=".7" fill="#fff" opacity=".6"/><path d="M8 26 c0-2 3-2.5 3.6-.4 .6-2.1 3.6-1.6 3.6.4 0 2.4-3.6 4.2-3.6 4.2s-3.6-1.8-3.6-4.2z" fill="#ff2f86"/>`,
  sit:'Hej babes. Ja, tanden er ægte. Nej, du må ikke røre den.',allin:['Selfie-tid. ALL-IN. 💅','Min tand er længere end din stak.','Tag et billede. Det holder længere end dine chips.'],raise:['Glow up. Pot up.','Kys kys, mere i puljen 💋','Jeg hæver, fordi jeg kan.'],fold:['Ew. Ikke mit vibe.','Jeg skal alligevel til photoshoot.','Unfollow.'],win:'Tak til mine to millioner følgere. Og min tand.'},
 {name:'Puisi Picasso',title:'Sæl med baret. Maler dine chips røde.',bg:'#7a2230',
  svg:`<ellipse cx="32" cy="41" rx="19" ry="17" fill="#8a929c"/><g transform="rotate(-14 30 20)"><ellipse cx="30" cy="23" rx="18" ry="6" fill="#16161c"/><path d="M13 23 Q30 9 47 23Z" fill="#16161c"/><path d="M30 13.5 v-5" stroke="#16161c" stroke-width="2.6" stroke-linecap="round"/></g><path d="M18 36 Q22.5 32 27 36" stroke="#111" stroke-width="1.9" fill="none" stroke-linecap="round"/>${E(40,35,5,'#111')}${E(41.6,33.4,1.8,'#fff')}<ellipse cx="32" cy="43" rx="3.4" ry="2.4" fill="#2b2b2b"/><path d="M32 46 Q27 49.5 22.5 46 Q23.5 50 28 50.6 Q31 50.6 32 47.6 Q33 50.6 36 50.6 Q40.5 50 41.5 46 Q37 49.5 32 46Z" fill="#2b2b2b"/><path d="M30 51 Q32 56 34.5 51.4Z" fill="#ff6b8a"/><path d="M21 45 H12 M21 48 H13 M43 45 H52 M43 48 H51" stroke="#dfe3e8" stroke-width="1.1"/><path d="M14 40 c2-3 6-2 5 1 3 0 3 4 0 4 1 3-4 3-4 0 -3 1-4-3-1-5z" fill="#e0262f"/>${E(47,30,1.6,'#e0262f')}${E(50,33,1,'#2f8fe0')}${E(24,27,1,'#f5c518')}<path d="M47 28 L58 8" stroke="#c9a66b" stroke-width="3" stroke-linecap="round"/><path d="M57 9 L60 3 Q61 1 59 2 L56 7Z" fill="#e0262f"/>`,
  sit:'Bonjour. Jeg maler med dine chips. Mest med de røde.',allin:['Mit mesterværk hedder ALL-IN.','Jeg maler hele bordet rødt.','Kunst er at tage alt. Signeret, Puisi.'],raise:['Et strøg mere rødt.','Kubisme: jeg hæver fra alle vinkler.','Ooh la la, mere i puljen.'],fold:['Kunstnerisk pause.','Det maleri var alligevel grimt.','*tørrer penslen af i dit hår*'],win:'Signeret Puisi. Hæng det på væggen.'},
 {name:'Tuluaq Tarantino',title:'Ravn. Instruktør. Hver hånd ender i ketchup.',bg:'#2a0d10',
  svg:`<path d="M27 21 L24 9 L30 17 L32 6 L35 17 L41 10 L38 22Z" fill="#1d1d24"/><ellipse cx="32" cy="38" rx="19" ry="18" fill="#1d1d24"/><path d="M14 40 Q20 30 26 38 Q20 44 14 40Z M50 40 Q44 30 38 38 Q44 44 50 40Z" fill="#2c2c36"/><path d="M33 39 L56 44 L33 48.5Z" fill="#e8b33a"/><path d="M33 44 L56 44" stroke="#9b6f12" stroke-width="1"/>${E(25,32,4,'#fff')}${E(26,32.6,2.2,'#111')}<path d="M20 27 L30 29.5" stroke="#d8dbe2" stroke-width="2" stroke-linecap="round"/><path d="M36 33 Q40 29.5 44 33" stroke="#d8dbe2" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M35 28 L45 26" stroke="#d8dbe2" stroke-width="2" stroke-linecap="round"/><path d="M51 45 q3 1 2 4 q-1 3 -3 1 q-2 -2 1 -5z" fill="#d6141f"/>${E(55,51,1.4,'#d6141f')}${E(47,52,1,'#d6141f')}${E(18,47,1.2,'#d6141f')}<g transform="translate(6 6) rotate(-14)"><rect width="17" height="11" rx="1" fill="#111"/><path d="M0 0 L17 -4.5 L17 0Z" fill="#f4f4f4"/><path d="M3.5 -.8 L5.5 -1.4 M9 -2 L11 -2.6 M14 -3.4 L16 -3.9" stroke="#111" stroke-width="1.6"/><text x="8.5" y="7.6" font-size="3.6" fill="#fff" text-anchor="middle" font-weight="900">TAKE 1</text></g>`,
  sit:'Kraa. Det her bliver kapitel ét.',allin:['Kapitel fem: ALL-IN.','Kraa! Det her bliver blodigt. Ketchup-blodigt.','Ingen forlader det her bord uskadt.'],raise:['Plot twist: jeg hæver.','Mere drama! Mere ketchup!','Kraa. Cut. Hæv.'],fold:['Det var bare en deleted scene.','Rul rulleteksterne.','Kraa… vi tager den igen i morgen.'],win:'THE END. Kraa.'},
 {name:'Terianniaq Trump',title:'Ræv. Siger, at hans hånd er tremendous.',bg:'#8a5a00',
  svg:`<path d="M14 30 L12 6 L28 20Z M50 30 L52 6 L36 20Z" fill="#e8742a"/><path d="M16 26 L15 12 L25 21Z M48 26 L49 12 L39 21Z" fill="#3a1d0c"/><path d="M32 18 C48 18 54 30 52 40 C50 48 40 56 32 57 C24 56 14 48 12 40 C10 30 16 18 32 18Z" fill="#e8742a"/><path d="M32 57 C24 56 15 49 13 41 C20 42 26 46 32 52 C38 46 44 42 51 41 C49 49 40 56 32 57Z" fill="#fff4e6"/><ellipse cx="32" cy="46" rx="3.8" ry="2.8" fill="#111"/><path d="M19 32 Q24 29 29 32 Q24 34 19 32Z" fill="#fff"/>${E(25.5,32,1.9,'#3a1d0c')}<path d="M18.5 31.6 Q24 28 29.5 31.6" stroke="#b5561a" stroke-width="2.2" fill="none"/><path d="M35 32 Q40 29 45 32 Q40 34 35 32Z" fill="#fff"/>${E(41.5,32,1.9,'#3a1d0c')}<path d="M34.5 31.6 Q40 28 45.5 31.6" stroke="#b5561a" stroke-width="2.2" fill="none"/><path d="M35 25 Q40 21 46 25" stroke="#3a1d0c" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M19 27 L29 27" stroke="#3a1d0c" stroke-width="1.8" stroke-linecap="round"/><path d="M27 51 Q33 53.5 39 49" stroke="#3a1d0c" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M14 58 Q32 70 50 58" stroke="#ffd23f" stroke-width="3.4" fill="none" stroke-dasharray="3 1.6"/>${E(32,64,5.4,'#ffd23f')}<text x="32" y="66" font-size="5.2" text-anchor="middle" font-weight="900" fill="#8a5a00">#1</text>`,
  sit:'Min hånd? Tremendous. Den bedste hånd i hele skoven.',allin:['Tremendous all-in. Ingen har set noget lignende.','Rævesnu. ALL-IN.','Hønsegården er min. Alle chips er mine.'],raise:['Tremendous hævning.','Rævesnu. Mere.','Det er en meget, meget god hævning.'],fold:['Det tæller ikke. Jeg var ikke klar.','Hønsegården kalder.','Jeg folder. Det var dealerens skyld.'],win:'Tremendous. Den største sejr. Måske nogensinde.'},
 {name:'Ukaleq Usain',title:'Polarhare. Folder hurtigere end lyset.',bg:'#1f6b4a',
  svg:`<path d="M20 26 C14 8 16 -10 22 -10 C28 -10 28 8 26 26Z M38 26 C36 8 36 -10 42 -10 C48 -10 50 8 44 26Z" fill="#f4f4f4"/><path d="M21 22 C17 8 19 -6 22 -6 C25 -6 25 8 24.5 22Z M39.5 22 C39 8 39 -6 42 -6 C45 -6 47 8 43 22Z" fill="#ffb3c7"/><ellipse cx="32" cy="40" rx="18" ry="17" fill="#f4f4f4"/><path d="M14 30 Q32 23 50 30 L50 35 Q32 28 14 35Z" fill="#e0262f"/><path d="M14 32.5 Q32 25.5 50 32.5" stroke="#fff" stroke-width="1.2" fill="none"/><path d="M22 39 Q26 36 30 39" stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"/>${E(40,39,3.4,'#111')}${E(41.2,37.9,1.2,'#fff')}<ellipse cx="32" cy="45" rx="2.6" ry="1.8" fill="#ff7a9a"/><path d="M32 47 V49 M27 48.5 Q32 52 37 48.5" stroke="#111" stroke-width="1.3" fill="none" stroke-linecap="round"/><rect x="29.5" y="49.5" width="2.4" height="3.6" rx=".5" fill="#fff" stroke="#bbb" stroke-width=".4"/><rect x="32.1" y="49.5" width="2.4" height="3.6" rx=".5" fill="#fff" stroke="#bbb" stroke-width=".4"/><path d="M33 53 Q35 58 37.5 54Z" fill="#ff6b8a"/><path d="M2 36 H10 M0 42 H9 M3 48 H11" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".75"/>`,
  sit:'Jeg er her. Nej. Nu er jeg der.',allin:['Ni komma otte sekunder til ALL-IN.','ZOOM. All-in.','Ingen kan løbe fra den her.'],raise:['Speed-raise!','Du blinkede. Jeg hævede.','Hurtig hævning, før du når at tænke.'],fold:['Jeg folder hurtigere end lyset.','Allerede væk.','Fold på personlig rekord.'],win:'Verdensrekord i at tage dine chips.'},
 {name:'Aqisseq Ali',title:'Rype. Svæver som en sommerfugl, river som en bi.',bg:'#6e1414',
  svg:`<path d="M24 22 Q22 14 26 12 Q27 17 29 18 Q30 12 34 11 Q34 17 33 20Z" fill="#f4f4f4"/><ellipse cx="32" cy="38" rx="18" ry="18" fill="#f4f4f4"/><ellipse cx="32" cy="44" rx="12" ry="9" fill="#e9e9ee"/><path d="M19 28 Q24 24 29 28 Q24 30 19 28Z M35 28 Q40 24 45 28 Q40 30 35 28Z" fill="#e0262f"/>${E(25,33,2.9,'#111')}${E(25.9,32.1,1,'#fff')}${E(39,33,2.9,'#111')}${E(39.9,32.1,1,'#fff')}<path d="M29 38 L35 38 L32 42.5Z" fill="#2b2b2b"/><path d="M27 45 Q32 49 37 45" stroke="#111" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M28.5 45.6 H35.5" stroke="#3fb6ff" stroke-width="1.6"/>${E(12,46,8,'#d6141f')}${E(52,46,8,'#d6141f')}<path d="M7 42 Q12 38 17 42 M47 42 Q52 38 57 42" stroke="#ff6b6b" stroke-width="1.6" fill="none"/><rect x="6" y="51" width="12" height="4" rx="1.5" fill="#fff"/><rect x="46" y="51" width="12" height="4" rx="1.5" fill="#fff"/><path d="M50 10 q-4 -4 -6 0 q4 2 6 0 q2 2 6 0 q-2 -4 -6 0z" fill="#ffd23f"/><path d="M50 10 v4" stroke="#111" stroke-width=".8"/>`,
  sit:'Rype i ringen. Kom an.',allin:['Svæver som en sommerfugl. ALL-IN som en bi.','Ding ding! Sidste runde.','Knock-out-tid.'],raise:['Jab. Hæv.','Venstre, højre, raise!','Rype-punch.'],fold:['Jeg danser bare ud af ringen.','Ses i omkampen.','Rope-a-dope. Det er en strategi.'],win:'Knock-out! Fjerene flyver.'},
 {name:'Nattoralik Nightmare',title:'Havørn. Svæver over din stak. Altid.',bg:'#2b0a3a',
  svg:`<path d="M18 22 L14 8 L23 18 L26 4 L30 17 L36 4 L37 18 L46 8 L44 22Z" fill="#e9e2d0"/><path d="M12 42 C10 26 20 16 32 16 C44 16 54 26 52 42 C50 54 40 58 32 58 C24 58 14 54 12 42Z" fill="#e9e2d0"/><path d="M12 46 C14 56 24 60 32 60 C40 60 50 56 52 46 C46 52 18 52 12 46Z" fill="#6b4a2a"/><circle cx="24" cy="35" r="8.5" fill="#ff2a2a" opacity=".25"/><circle cx="40" cy="35" r="8.5" fill="#ff2a2a" opacity=".25"/>${E(24,35,4.8,'#ff2a2a')}${E(40,35,4.8,'#ff2a2a')}${E(24,35,2.2,'#ffe066')}${E(40,35,2.2,'#ffe066')}<path d="M17 28 L29.5 33.5 M47 28 L34.5 33.5" stroke="#1a1a1a" stroke-width="3.4" stroke-linecap="round"/><path d="M26 40 Q32 38 38 40 L37 47 Q33 54 30 52 Q33 48 31 45 Q28 44 26 40Z" fill="#f2b11e"/><path d="M30 52 Q32 55 34 51" stroke="#b07a0a" stroke-width="1.2" fill="none"/><path d="M38 46 Q42 47 44 44" stroke="#111" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  sit:'Jeg svæver over din stak. Skriiig.',allin:['Styrtdyk! ALL-IN.','Dine chips er byttet nu.','Mareridtet lander.'],raise:['Jeg cirkler. Og hæver.','Kløerne er ude.','Skriiig! Mere.'],fold:['Jeg flyver højere op. Midlertidigt.','Byttet var for lille.','Jeg ser dig stadig.'],win:'Byttet er taget. Skriiiig.'},
 {name:'Ammassat Avalanche',title:'Tusind lodder. De caller alt.',bg:'#14508f',
  svg:`<g fill="#b9c7d6"><path d="M4 22 l-6 -5 v10z" fill="#8fa2b6"/><ellipse cx="12" cy="22" rx="10" ry="5"/><path d="M60 24 l6 -5 v10z" fill="#8fa2b6"/><ellipse cx="52" cy="24" rx="10" ry="5"/><path d="M8 40 l-6 -5 v10z" fill="#8fa2b6"/><ellipse cx="17" cy="40" rx="11" ry="5.5"/><path d="M58 42 l6 -5 v10z" fill="#8fa2b6"/><ellipse cx="48" cy="42" rx="11" ry="5.5"/><path d="M16 56 l-6 -5 v10z" fill="#8fa2b6"/><ellipse cx="26" cy="56" rx="11" ry="5.5"/><path d="M46 31 l7 -6 v12z" fill="#8fa2b6"/><ellipse cx="34" cy="31" rx="13" ry="6.5"/></g><path d="M3 20 Q12 17 21 20 M43 22 Q52 19 61 22 M7 38 Q17 35 27 38 M38 40 Q48 37 58 40 M16 54 Q26 51 36 54 M22 29 Q34 25.5 46 29" stroke="#4d6a87" stroke-width="2" fill="none" stroke-linecap="round"/>${E(18,21.5,2.6,'#fff')}${E(18.6,22,1.3,'#111')}${E(46,23.5,2.6,'#fff')}${E(45.4,24,1.3,'#111')}${E(24,39.5,2.8,'#fff')}${E(24.8,40.3,1.4,'#111')}<path d="M39 40.5 Q41.5 38.5 44 40.5" stroke="#111" stroke-width="1.4" fill="none" stroke-linecap="round"/>${E(33,55.5,2.8,'#fff')}${E(33.4,56.3,1.4,'#111')}${E(24,30,3.2,'#fff')}${E(24.9,30.8,1.7,'#111')}${E(30,30,3.2,'#fff')}${E(29.3,30.8,1.7,'#111')}<path d="M22 34.5 Q26 37 29 34.5" stroke="#111" stroke-width="1.2" fill="none"/><path d="M25 35.5 Q26.5 39 28 35.8Z" fill="#ff6b8a"/><path d="M50 44 Q52 45.5 54 44" stroke="#111" stroke-width="1" fill="none"/>`,
  sit:'Hej! Vi er tusind. Vi caller alt. ALT.',allin:['ALLE SAMMEN! ALL-IN!','Vi er mange. Vi er overalt.','LODDE-LAVINE!'],raise:['Vi hæver. Alle tusind.','Stimen har bestemt.','Blub blub blub. Det betyder hæv.'],fold:['Vi… svømmer den anden vej.','Én af os foldede, så alle gjorde.','Stimen er forvirret.'],win:'Vi deler. Tusind måder.'},
 {name:'The Bully',title:'Frikvarterets konge. Tager dine chips og din madpakke.',bg:'#c0392b',
  svg:`<image href="${BULLY_IMG}" x="8.9" y="11.2" width="46.2" height="46.2" preserveAspectRatio="xMidYMid slice" clip-path="url(#bullyClip)"/><circle cx="32" cy="34.3" r="23.1" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>`,
  sit:'Giv mig dine frokostpenge. Altså dine chips.',allin:['Giv mig ALT. Nu.','Bully-mode: ALL-IN.','Hvad vil du gøre ved det?'],raise:['Hæver. Græd lidt.','Mere. Nu.','Du har ikke noget at skulle have sagt.'],fold:['Jeg lod dig vinde. Denne gang.','Ses i frikvarteret.','Du er heldig, at læreren kigger.'],win:'Tak for frokostpengene.'},
 {name:'Hans Kunak',title:'Fanger fra Thule. Har fanget mere end dine chips.',bg:'#1f4e5f',
  svg:`<path d="M54 62 L61 -4" stroke="#8b5a2b" stroke-width="2.6" stroke-linecap="round"/><path d="M61 -4 L58.5 4 L63.5 3.5Z" fill="#f1e9d2"/><path d="M60.2 6 Q66 14 58 22" stroke="#d9c7a3" stroke-width="1" fill="none"/><ellipse cx="32" cy="38" rx="23" ry="22" fill="#efe4cc"/>${Array.from({length:16},(_,k)=>{const a=k/16*Math.PI*2;return E((32+Math.cos(a)*22.5).toFixed(1),(38+Math.sin(a)*21.5).toFixed(1),3.4,'#efe4cc')}).join('')}<ellipse cx="32" cy="39" rx="18.5" ry="18" fill="#5a3d24"/><ellipse cx="32" cy="42" rx="13" ry="14" fill="#c98d5e"/><path d="M21 31 Q32 26 43 31 L43 34 Q32 29.5 21 34Z" fill="#b98a4e"/><path d="M24 31.6 H30 M34 31.6 H40" stroke="#2b1a0e" stroke-width="1.3" stroke-linecap="round"/><path d="M24 39 Q27 36.5 30 39 M34 39 Q37 36.5 40 39" stroke="#2b1a0e" stroke-width="1.7" fill="none" stroke-linecap="round"/><ellipse cx="23.5" cy="44" rx="3.2" ry="2" fill="#d9634a" opacity=".55"/><ellipse cx="40.5" cy="44" rx="3.2" ry="2" fill="#d9634a" opacity=".55"/><path d="M30.5 42 Q32 44.5 33.5 42" stroke="#8a5233" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M27 46.5 Q32 45 37 46.5" stroke="#2b1a0e" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M26.5 48 Q32 55 37.5 48 Z" fill="#5a1f14"/><path d="M28 48.6 H36" stroke="#fff" stroke-width="1.6"/>`,
  sit:'Aluu. Jeg har siddet stille ved et åndehul i seks timer. Jeg kan også vente på dig.',allin:['Harpunen er kastet. ALL-IN.','Isen holder. All-in.','Fangsten kommer hjem i aften.'],raise:['Jeg hæver. Ligesom tidevandet.','Tålmodighed og en skarp harpun.','Mere. Hundene er sultne.'],fold:['Isen er for tynd i dag.','Ajunngilaq. Der kommer flere sæler.','Jeg tager hjem til kaffemik.'],win:'Qujanaq. Der er mattak til alle i aften.'}
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

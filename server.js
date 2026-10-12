// Nanoq Hold'em – online server. The server deals every card and owns the game state,
// so each player only ever receives their own hole cards.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const G = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set('trust proxy', true);
// the start page gets the site's own address filled in, so link previews show the table image
const fs = require('fs');
const INDEX = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
app.get(['/', '/index.html'], (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(INDEX.replaceAll('%ORIGIN%', `${req.protocol}://${req.get('host')}`));
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('/health', (_, res) => res.send('ok'));

const rooms = new Map(); // code -> room
const BETTING = ['preflop', 'flop', 'turn', 'river'];
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rid = (n) => Array.from({ length: n }, () => ALPH[crypto.randomInt(ALPH.length)]).join('');
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
const int = (v) => Math.floor(Number(v));

function newRoom(leaderToken) {
  let code;
  do code = rid(5); while (rooms.has(code));
  const room = { code, s: G.emptyState(), pids: new Map(), leaderToken, timers: {}, touched: Date.now() };
  room.s.leader = pidFor(room, leaderToken);
  rooms.set(code, room);
  return room;
}
function pidFor(room, token) {
  // the same browser always gets the same player id at a table, so a table can be rebuilt after a restart
  if (!room.pids.has(token)) room.pids.set(token, 'p_' + crypto.createHash('sha256').update(room.code + ':' + token).digest('hex').slice(0, 12));
  return room.pids.get(token);
}

/* What one player is allowed to see: their own cards, never the deck or other hands. */
function viewFor(room, pid) {
  const s = JSON.parse(JSON.stringify(room.s));
  s.seats = s.seats.map((p) => {
    if (!p) return null;
    if (p.uid !== pid) p.hole = [];
    return p;
  });
  if (s.hand) { delete s.hand.bd; delete s.hand.rest; delete s.hand.bd2; }
  s.now = Date.now();
  s.code = room.code;
  // the shaman's prophecy stays sealed until the final show
  if (!s.finale) { s.prophecySealed = !!s.prophecy; delete s.prophecy; }
  return s;
}
function broadcast(room) {
  room.s.v = (room.s.v || 0) + 1;
  room.touched = Date.now();
  schedule(room); // sets the next-hand countdown, which every player sees
  let watching = 0;
  for (const [, so] of io.of('/').sockets) if (so.data?.code === room.code && !room.s.seats.some((p) => p?.uid === so.data.pid)) watching++;
  room.s.watching = watching;
  for (const [, sock] of io.of('/').sockets) {
    if (sock.data.code === room.code) sock.emit('state', viewFor(room, sock.data.pid));
  }
}
const AUTO_MS = 5000; // countdown before the automatic dealer starts a hand

/* Server-side clocks: next hand after a showdown, and a turn timer so nobody can stall. */
function schedule(room) {
  const s = room.s, h = s.hand;
  clearTimeout(room.timers.next); clearTimeout(room.timers.turn); clearTimeout(room.timers.rit);
  if (h && h.phase === 'rit') {
    const id = h.id;
    room.timers.rit = setTimeout(() => {
      if (room.s.hand?.id !== id || room.s.hand.phase !== 'rit') return;
      G.log(room.s, 'Tiden løb ud – kortene deles én gang.');
      G.resolveRit(room.s, false); broadcast(room);
    }, Math.max(0, h.ritAt + G.RIT_MS - Date.now()));
  }
  // the dealer is automatic: whenever two players have chips and no hand is running, a hand starts after a countdown
  const ready = !s.paused && s.seats.filter(G.eligible).length >= 2 && (!h || h.phase === 'showdown');
  if (ready) {
    const key = h?.id || 'none';
    const base = h ? (h.finishedAt || Date.now()) + G.NEXT_HAND_MS + (h.extraWait || 0) * 1000 : 0;
    // keep a countdown that is already running; otherwise start a fresh one
    const at = room.nextAt && room.nextKey === key ? Math.max(room.nextAt, Date.now() + 800) : Math.max(base, Date.now() + AUTO_MS);
    room.nextAt = at; room.nextKey = key;
    s.nextAt = at;
    room.timers.next = setTimeout(() => {
      const g = room.s.hand;
      if (room.s.paused || (g && g.phase !== 'showdown')) return;
      room.nextAt = 0;
      if (G.startHand(room.s)) broadcast(room);
    }, Math.max(0, at - Date.now()));
  } else { room.nextAt = 0; s.nextAt = 0; }
  if (h && BETTING.includes(h.phase) && h.toAct >= 0) {
    const id = h.id, ta = h.toAct, at = h.turnAt, tp = s.seats[ta];
    const bank = tp ? G.bankOf(s, tp.uid) : 0;
    const deadline = tp?.sitout || tp?.leaving ? Date.now() + 1200 : at + G.TURN_MS + bank;
    room.timers.turn = setTimeout(() => {
      const g = room.s.hand;
      if (!g || g.id !== id || g.toAct !== ta || g.turnAt !== at) return;
      const p = room.s.seats[ta];
      if (!p.sitout) {
        G.log(room.s, `${p.nick} var for længe om det.`);
        p.timeouts = (p.timeouts || 0) + 1;
        if (p.timeouts >= 2) { p.sitout = true; G.log(room.s, `${p.nick} sidder ude, indtil de er tilbage.`); }
      }
      G.act(room.s, ta, g.curBet - p.bet > 0 ? 'fold' : 'check', 0);
      broadcast(room);
    }, Math.max(0, deadline - Date.now()));
  }
}

function standUp(s, i, why) {
  const p = s.seats[i], h = s.hand;
  delete s.requests[p.uid];
  if (h && BETTING.includes(h.phase) && p.inHand) {
    p.leaving = true;
    if (!p.folded) {
      if (h.toAct === i) G.act(s, i, 'fold', 0);
      else { p.folded = true; p.acted = true; if (s.seats.filter(G.live).length === 1) G.advance(s, i); }
    }
  } else { G.cashOut(s, p); s.seats[i] = null; }
  G.log(s, why);
}

/* Every change a player can make. Returns an error message, or nothing on success. */
function handle(room, pid, isLeader, m) {
  const s = room.s, h = s.hand;
  const me = s.seats.findIndex((p) => p?.uid === pid);
  const p = me >= 0 ? s.seats[me] : null;
  switch (m?.type) {
    case 'sit': {
      if (p) return 'Du sidder allerede ved bordet.';
      const nick = clean(m.nick, 16);
      if (!nick) return 'Skriv et kaldenavn først.';
      let i = int(m.seat);
      if (!(i >= 0 && i < G.N) || s.seats[i]) {
        const free = s.seats.map((q, k) => (q ? -1 : k)).filter((k) => k >= 0);
        i = free.length ? free[crypto.randomInt(free.length)] : -1;
      }
      if (i < 0) return 'Bordet er fyldt.';
      s.seats[i] = { uid: pid, nick, chips: s.stack, rebuys: 0, inHand: false, bet: 0, total: 0, folded: false, allin: false, acted: false, hole: [], joinedAt: Date.now(), waitBB: s.seats.some((q) => q?.played) };
      G.buyIn(s, s.seats[i], s.stack, i);
      G.log(s, `${nick} sætter sig som ${G.CHARS[i].name}: “${G.CHARS[i].sit}”`);
      return;
    }
    case 'act': {
      if (!p || !h || h.id !== m.handId) return 'Hånden er allerede gået videre.';
      if (!G.act(s, me, m.kind, Number(m.to) || 0)) return 'Det træk er ikke tilladt lige nu.';
      p.timeouts = 0;
      return;
    }
    case 'sitout': {
      if (!p) return 'Sæt dig først.';
      p.sitout = !!m.on; p.timeouts = 0;
      G.log(s, p.sitout ? `${p.nick} sidder ude et øjeblik.` : `${p.nick} er tilbage ved bordet.`);
      return;
    }
    case 'show': {
      const err = G.show(s, me, m.which);
      if (err) return err;
      return;
    }
    case 'rit': {
      if (!p || !G.vote(s, me, !!m.yes)) return 'Du kan ikke stemme lige nu.';
      return;
    }
    case 'deal': {
      if (!p) return 'Sæt dig først.';
      if (s.paused) return 'Spillet er på pause.';
      if (h && h.phase !== 'showdown') return 'Der er allerede en hånd i gang.';
      if (!G.startHand(s)) return 'Der skal mindst to spillere med chips til.';
      return;
    }
    case 'ask': {
      const amt = int(m.amount);
      if (!p || p.chips > 0 || s.requests[pid]) return 'Du kan kun bede om chips, når du er busted.';
      if (!(amt > 0 && amt <= 1e9)) return 'Skriv hvor mange chips du vil have.';
      s.requests[pid] = { amount: amt, at: Date.now() };
      G.log(s, `${p.nick} er busted og beder lederen om ${G.fmt(amt)} chips.`);
      return;
    }
    case 'rebuy': {
      if (!isLeader || !p || p.chips > 0) return 'Kun lederen kan købe ind direkte.';
      p.chips = s.stack; p.rebuys = (p.rebuys || 0) + 1; G.buyIn(s, p, s.stack);
      G.log(s, `Lederen ${p.nick} køber selv ind igen for ${G.fmt(s.stack)} chips.`);
      return;
    }
    case 'leave': {
      if (!p) return;
      standUp(s, me, `${p.nick} rejser sig fra bordet.`);
      return;
    }
    case 'pause': {
      if (!isLeader) return 'Kun lederen kan sætte på pause.';
      s.paused = !s.paused;
      if (!s.paused) s.finale = null;
      G.log(s, s.paused ? 'Lederen satte spillet på pause.' : 'Lederen startede spillet igen.');
      return;
    }
    case 'settings': {
      if (!isLeader) return 'Kun lederen kan ændre blinds.';
      const sb = int(m.sb), bb = int(m.bb), st = int(m.stack), jr = int(m.jpRoyal), j72 = int(m.jp72);
      if (!(sb > 0 && bb >= sb && st >= bb && st <= 1e9)) return 'Stor blind skal være mindst lille blind, og startchips mindst stor blind.';
      if (!(jr >= 0 && jr <= 1e9 && j72 >= 0 && j72 <= 1e9)) return 'Jackpot-beløbene skal være 0 eller mere.';
      Object.assign(s, { sb, bb, stack: st, jpRoyal: jr, jp72: j72, rit: !!m.rit });
      G.log(s, `Lederen satte blinds ${sb}/${bb}, startchips ${G.fmt(st)}, Royal flush-jackpot ${G.fmt(jr)}, 7-2-bonus ${G.fmt(j72)} pr. spiller, run it twice ${m.rit ? 'til' : 'fra'}.`);
      return;
    }
    case 'finale': {
      if (!isLeader) return 'Kun lederen kan afslutte aftenen.';
      if (h && G.BETTING.includes(h.phase)) return 'Vent til hånden er færdig.';
      s.finale = { at: Date.now() }; s.paused = true;
      G.log(s, '🏁 Lederen afsluttede aftenen. Prisuddelingen begynder!');
      return;
    }
    case 'finaleEnd': {
      if (!isLeader) return 'Kun lederen kan lukke showet.';
      s.finale = null;
      return;
    }
    case 'reset': {
      if (!isLeader) return 'Kun lederen kan nulstille bordet.';
      const f = G.emptyState(); f.leader = s.leader; f.log = ['Bordet blev nulstillet.']; Object.assign(f, { sb: s.sb, bb: s.bb, stack: s.stack, jpRoyal: s.jpRoyal, jp72: s.jp72, rit: s.rit });
      room.s = f;
      return;
    }
    case 'lead': {
      if (!isLeader) return 'Kun lederen kan det.';
      const i = int(m.seat), q = s.seats[i];
      if (!q || q.uid !== m.uid) return 'Spilleren er ikke ved bordet længere.';
      const amt = int(m.amount);
      if (m.kind === 'add') { if (!(amt > 0)) return 'Skriv et beløb.'; q.chips += amt; G.buyIn(s, q, amt); G.log(s, `Lederen gav ${q.nick} ${G.fmt(amt)} chips.`); }
      else if (m.kind === 'sub') { if (!(amt > 0)) return 'Skriv et beløb.'; const a = Math.min(amt, q.chips); q.chips -= a; G.buyIn(s, q, -a); G.log(s, `Lederen tog ${G.fmt(a)} chips fra ${q.nick}.`); }
      else if (m.kind === 'setc') { if (!(amt >= 0)) return 'Skriv et beløb.'; G.buyIn(s, q, amt - q.chips); q.chips = amt; G.log(s, `Lederen satte ${q.nick} til ${G.fmt(amt)} chips.`); }
      else if (m.kind === 'grant') {
        const r = s.requests[q.uid]; if (!r) return 'Anmodningen er væk.';
        const a = Math.floor(r.amount || s.stack); q.chips += a; G.buyIn(s, q, a); q.rebuys = (q.rebuys || 0) + 1; delete s.requests[q.uid];
        G.log(s, `Lederen sagde ok. ${q.nick} køber ind igen for ${G.fmt(a)} chips (genkøb nr. ${q.rebuys}).`);
      }
      else if (m.kind === 'deny') { delete s.requests[q.uid]; G.log(s, `Lederen afviste ${q.nick}s ønske om chips.`); }
      else if (m.kind === 'kick') { if (q.uid === pid) return 'Du kan ikke smide dig selv ud.'; standUp(s, i, `Lederen viste ${q.nick} væk fra bordet.`); }
      else return 'Ukendt handling.';
      return;
    }
    default: return 'Ukendt handling.';
  }
}

io.on('connection', (sock) => {
  sock.on('create', ({ token } = {}, ack) => {
    token = clean(token, 64); if (token.length < 16) return ack?.({ error: 'Genindlæs siden og prøv igen.' });
    const room = newRoom(token);
    ack?.({ code: room.code });
  });
  /* After a server restart the table is gone from memory. Any player who still has the
     table's last snapshot in the browser can rebuild it: same code, same seats and chips. */
  sock.on('restore', ({ code, token, snap } = {}, ack) => {
    code = clean(code, 8).toUpperCase(); token = clean(token, 64);
    if (!/^[A-Z0-9]{4,8}$/.test(code) || token.length < 16 || !snap || typeof snap !== 'object') return ack?.({ error: 'Kunne ikke genskabe bordet.' });
    if (rooms.has(code)) return ack?.({ ok: true });
    const num = (v, d) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 1e9 ? n : d; };
    const okId = (v) => typeof v === 'string' && /^p_[A-Za-z0-9]{6,16}$/.test(v);
    const s = G.emptyState();
    s.sb = Math.max(1, num(snap.sb, 10)); s.bb = Math.max(s.sb, num(snap.bb, 20)); s.stack = Math.max(s.bb, num(snap.stack, 1000));
    s.jpRoyal = num(snap.jpRoyal, 0); s.jp72 = num(snap.jp72, 0); s.rit = !!snap.rit;
    s.leader = okId(snap.leader) ? snap.leader : null;
    const used = new Set();
    (Array.isArray(snap.seats) ? snap.seats : []).slice(0, G.N).forEach((q, i) => {
      if (!q || !okId(q.uid) || used.has(q.uid)) return; used.add(q.uid);
      const nick = clean(q.nick, 16); if (!nick) return;
      s.seats[i] = { uid: q.uid, nick, chips: num(q.chips, 0), rebuys: num(q.rebuys, 0), inHand: false, bet: 0, total: 0, folded: false, allin: false, acted: false, hole: [], joinedAt: Date.now(), played: true };
    });
    if (snap.ledger && typeof snap.ledger === 'object') {
      s.ledger = {};
      for (const [uid, l] of Object.entries(snap.ledger).slice(0, 40)) if (okId(uid) && l) s.ledger[uid] = { nick: clean(l.nick, 16) || 'Spiller', seat: Math.floor(Number(l.seat)) || 0, in: Math.floor(Number(l.in)) || 0, cash: Math.floor(Number(l.cash)) || 0 };
    }
    if (snap.stats && typeof snap.stats === 'object' && JSON.stringify(snap.stats).length < 40000) {
      s.stats = {};
      for (const [uid, st] of Object.entries(snap.stats).slice(0, 40)) if (okId(uid) && st && typeof st === 'object') {
        const o = {}; for (const [k, v] of Object.entries(st)) { if (typeof v === 'number' && Number.isFinite(v)) o[k] = v; else if (k === 'heads' && Array.isArray(v)) o.heads = v.filter(Number.isInteger).slice(0, 20); }
        s.stats[uid] = o;
      }
    }
    s.dealer = Number.isInteger(snap.dealer) && snap.dealer >= -1 && snap.dealer < G.N ? snap.dealer : -1;
    s.lastBB = Number.isInteger(snap.lastBB) && snap.lastBB >= 0 && snap.lastBB < G.N ? snap.lastBB : -1;
    s.log = ['Serveren blev genstartet, men bordet er genskabt med jeres chips. Spillet fortsætter, når I er tilbage.'];
    const room = { code, s, pids: new Map(), leaderToken: null, timers: {}, touched: Date.now() };
    rooms.set(code, room);
    ack?.({ ok: true });
  });
  sock.on('join', ({ code, token } = {}, ack) => {
    code = clean(code, 8).toUpperCase(); token = clean(token, 64);
    const room = rooms.get(code);
    if (!room) return ack?.({ error: 'Bordet findes ikke (længere). Opret et nyt.' });
    if (token.length < 16) return ack?.({ error: 'Genindlæs siden og prøv igen.' });
    sock.data = { code, token, pid: pidFor(room, token) };
    ack?.({ pid: sock.data.pid });
    sock.emit('state', viewFor(room, sock.data.pid));
    sock.emit('chatlog', room.chat || []);
    broadcast(room); // tilskuer-tælleren opdateres
  });
  const REACTS = ['Aluu!', 'Qujanaq', 'Mamaq!', 'Ajunngilaq', 'Malkemaskinen!', '😂', '🔥', '🤡', '🐻‍❄️', '🫡',
    'Er du bange?', 'Fold nu bare', 'Jeg lugter bluff', 'Sikke en torsk 🐟', 'Tag dig sammen', 'Det var dumt', 'Hurtigere, bedstemor!', 'Nice hand… NOT', 'Kom så!', 'GG'];
  const THROWS = ['torsk', 'snebold', 'tupilak', 'isklump', 'kaffe', 'finger'];
  let lastReact = 0;
  sock.on('react', (m) => {
    const d = sock.data || {}, room = rooms.get(d.code);
    if (!room || Date.now() - lastReact < 1200) return;
    const seat = room.s.seats.findIndex((p) => p?.uid === d.pid);
    const to = int(m?.to), hasTo = to >= 0 && to < G.N && room.s.seats[to] && to !== seat;
    const thr = m?.t != null ? THROWS[int(m.t)] : null;
    const text = thr ? null : REACTS[int(m?.i)];
    if (seat < 0 || (!text && !thr) || (thr && !hasTo)) return;
    lastReact = Date.now();
    const msg = { seat, text, at: Date.now(), to: hasTo ? to : -1, throw: thr };
    for (const [, so] of io.of('/').sockets) if (so.data?.code === room.code) so.emit('react', msg);
  });
  sock.on('disconnect', () => { const r = rooms.get(sock.data?.code); if (r) setTimeout(() => broadcast(r), 50); });
  let lastChat = 0;
  sock.on('chat', (m) => {
    const d = sock.data || {}, room = rooms.get(d.code);
    if (!room || Date.now() - lastChat < 800) return;
    const seat = room.s.seats.findIndex((p) => p?.uid === d.pid);
    const text = clean(m?.text, 140);
    if (seat < 0 || !text) return;
    lastChat = Date.now();
    const msg = { seat, nick: room.s.seats[seat].nick, text, at: Date.now() };
    room.chat = (room.chat || []).concat(msg).slice(-40);
    for (const [, so] of io.of('/').sockets) if (so.data?.code === room.code) so.emit('chat', msg);
  });
  sock.on('do', (m, ack) => {
    const d = sock.data || {}, room = rooms.get(d.code);
    if (!room) return ack?.({ error: 'Du er ikke ved et bord.' });
    const err = handle(room, d.pid, d.pid === room.s.leader, m);
    if (err) return ack?.({ error: err });
    broadcast(room);
    ack?.({ ok: true });
  });
});

// Tables nobody has touched for 12 hours are cleared out.
setInterval(() => {
  const cutoff = Date.now() - 12 * 3600e3;
  for (const [code, r] of rooms) if (r.touched < cutoff) { clearTimeout(r.timers.next); clearTimeout(r.timers.turn); rooms.delete(code); }
}, 600e3).unref();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Nanoq Hold'em kører på http://localhost:${PORT}`));

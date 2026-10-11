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
  if (!room.pids.has(token)) room.pids.set(token, 'p_' + rid(10));
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
  return s;
}
function broadcast(room) {
  room.s.v = (room.s.v || 0) + 1;
  room.touched = Date.now();
  for (const [, sock] of io.of('/').sockets) {
    if (sock.data.code === room.code) sock.emit('state', viewFor(room, sock.data.pid));
  }
  schedule(room);
}

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
  if (h && h.phase === 'showdown' && !s.paused) {
    const wait = G.NEXT_HAND_MS + (h.extraWait || 0) * 1000 - (Date.now() - (h.finishedAt || Date.now()));
    room.timers.next = setTimeout(() => {
      if (room.s.hand?.id === h.id && room.s.hand.phase === 'showdown' && !room.s.paused && G.startHand(room.s)) broadcast(room);
    }, Math.max(1000, wait));
  }
  if (h && BETTING.includes(h.phase) && h.toAct >= 0) {
    const id = h.id, ta = h.toAct, at = h.turnAt;
    room.timers.turn = setTimeout(() => {
      const g = room.s.hand;
      if (!g || g.id !== id || g.toAct !== ta || g.turnAt !== at) return;
      const p = room.s.seats[ta];
      G.log(room.s, `${p.nick} var for længe om det.`);
      G.act(room.s, ta, g.curBet - p.bet > 0 ? 'fold' : 'check', 0);
      broadcast(room);
    }, Math.max(0, at + G.TURN_MS - Date.now()));
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
  } else s.seats[i] = null;
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
      s.seats[i] = { uid: pid, nick, chips: s.stack, rebuys: 0, inHand: false, bet: 0, total: 0, folded: false, allin: false, acted: false, hole: [], joinedAt: Date.now() };
      G.log(s, `${nick} sætter sig som ${G.CHARS[i].name}: “${G.CHARS[i].sit}”`);
      return;
    }
    case 'act': {
      if (!p || !h || h.id !== m.handId) return 'Hånden er allerede gået videre.';
      if (!G.act(s, me, m.kind, Number(m.to) || 0)) return 'Det træk er ikke tilladt lige nu.';
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
      p.chips = s.stack; p.rebuys = (p.rebuys || 0) + 1;
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
      if (m.kind === 'add') { if (!(amt > 0)) return 'Skriv et beløb.'; q.chips += amt; G.log(s, `Lederen gav ${q.nick} ${G.fmt(amt)} chips.`); }
      else if (m.kind === 'sub') { if (!(amt > 0)) return 'Skriv et beløb.'; const a = Math.min(amt, q.chips); q.chips -= a; G.log(s, `Lederen tog ${G.fmt(a)} chips fra ${q.nick}.`); }
      else if (m.kind === 'setc') { if (!(amt >= 0)) return 'Skriv et beløb.'; q.chips = amt; G.log(s, `Lederen satte ${q.nick} til ${G.fmt(amt)} chips.`); }
      else if (m.kind === 'grant') {
        const r = s.requests[q.uid]; if (!r) return 'Anmodningen er væk.';
        const a = Math.floor(r.amount || s.stack); q.chips += a; q.rebuys = (q.rebuys || 0) + 1; delete s.requests[q.uid];
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
  sock.on('join', ({ code, token } = {}, ack) => {
    code = clean(code, 8).toUpperCase(); token = clean(token, 64);
    const room = rooms.get(code);
    if (!room) return ack?.({ error: 'Bordet findes ikke (længere). Opret et nyt.' });
    if (token.length < 16) return ack?.({ error: 'Genindlæs siden og prøv igen.' });
    sock.data = { code, token, pid: pidFor(room, token) };
    ack?.({ pid: sock.data.pid });
    sock.emit('state', viewFor(room, sock.data.pid));
  });
  const REACTS = ['Aluu!', 'Qujanaq', 'Mamaq!', 'Ajunngilaq', 'Malkemasking!', '😂', '🔥', '🤡', '🐻‍❄️', '🫡'];
  let lastReact = 0;
  sock.on('react', (m) => {
    const d = sock.data || {}, room = rooms.get(d.code);
    if (!room || Date.now() - lastReact < 1200) return;
    const seat = room.s.seats.findIndex((p) => p?.uid === d.pid);
    const text = REACTS[int(m?.i)];
    if (seat < 0 || !text) return;
    lastReact = Date.now();
    for (const [, so] of io.of('/').sockets) if (so.data?.code === room.code) so.emit('react', { seat, text, at: Date.now() });
  });
  sock.on('do', (m, ack) => {
    const d = sock.data || {}, room = rooms.get(d.code);
    if (!room) return ack?.({ error: 'Du er ikke ved et bord.' });
    const err = handle(room, d.pid, d.token === room.leaderToken, m);
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

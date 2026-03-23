import { existsSync } from "fs";
import { dns } from "bun";

// ==========================
// USER MANAGEMENT
// ==========================
const USERS_FILE = "users.json";
type User = { username: string; password: string; role: "admin" | "viewer" };

function loadUsers(): User[] {
  if (existsSync(USERS_FILE)) {
    try { return JSON.parse(require("fs").readFileSync(USERS_FILE, "utf-8")); }
    catch { return defaultUsers(); }
  }
  return defaultUsers();
}
function defaultUsers(): User[] {
  const defaults = [{ username: "admin", password: "monitor123", role: "admin" as const }];
  Bun.write(USERS_FILE, JSON.stringify(defaults, null, 2));
  return defaults;
}
function saveUsers(u: User[]) { Bun.write(USERS_FILE, JSON.stringify(u, null, 2)); }
let users: User[] = loadUsers();

// ==========================
// SESSION
// ==========================
const sessions = new Map<string, { username: string; role: string }>();
function generateToken() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function getSession(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie.split(";").find(c => c.trim().startsWith("session="))?.split("=")[1]?.trim();
  return token ? sessions.get(token) : null;
}
function isAuthenticated(req: Request) { return !!getSession(req); }
function isAdmin(req: Request) { return getSession(req)?.role === "admin"; }

// ==========================
// TARGET
// ==========================
type TargetType = "http" | "tcp" | "ping" | "dns" | "smtp" | "snmp" | "radius" | "tailscale";
type Target = {
  name: string; type: TargetType;
  url?: string; host?: string; port?: number;
  domain?: string; dnsServer?: string;
  community?: string; oid?: string;
  peer?: string;
};
const DATA_FILE = "targets.json";
function loadTargets(): Target[] {
  if (existsSync(DATA_FILE)) {
    try { return JSON.parse(require("fs").readFileSync(DATA_FILE, "utf-8")); }
    catch { return defaultTargets(); }
  }
  return defaultTargets();
}
function defaultTargets(): Target[] {
  return [
    { name: "Google",     type: "http", url: "https://google.com" },
    { name: "Cloudflare", type: "tcp",  host: "1.1.1.1", port: 80 },
  ];
}
function saveTargets(t: Target[]) { Bun.write(DATA_FILE, JSON.stringify(t, null, 2)); }
let targets: Target[] = loadTargets();

// ==========================
// TICKET MANAGEMENT
// ==========================
const TICKETS_FILE = "tickets.json";
type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "inprogress" | "closed";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
function loadTickets(): Ticket[] {
  if (existsSync(TICKETS_FILE)) {
    try { return JSON.parse(require("fs").readFileSync(TICKETS_FILE, "utf-8")); }
    catch { return []; }
  }
  return [];
}
function saveTickets(t: Ticket[]) { Bun.write(TICKETS_FILE, JSON.stringify(t, null, 2)); }
let tickets: Ticket[] = loadTickets();

// ==========================
// ASSET MANAGEMENT
// ==========================
const ASSETS_FILE = "assets.json";
type AssetHistory = { time: string; action: string; by: string; note: string };
type Asset = {
  id: string;
  name: string;
  type: string;
  location: string;
  serial: string;
  status: "active" | "maintenance" | "retired";
  linkedTarget?: string;
  ownerName?: string;
  ownerNIK?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  history: AssetHistory[];
};
function loadAssets(): Asset[] {
  if (existsSync(ASSETS_FILE)) {
    try { return JSON.parse(require("fs").readFileSync(ASSETS_FILE, "utf-8")); }
    catch { return []; }
  }
  return [];
}
function saveAssets(a: Asset[]) { Bun.write(ASSETS_FILE, JSON.stringify(a, null, 2)); }
let assets: Asset[] = loadAssets();

// ==========================
// HISTORY PERMANEN
// ==========================
const HISTORY_DIR = "history";
if (!existsSync(HISTORY_DIR)) require("fs").mkdirSync(HISTORY_DIR);

type HistoryEntry = { time: string; ms: number; ok: boolean; detail?: string };
const recentHistory: Record<string, HistoryEntry[]> = {};

function todayFile() {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `${HISTORY_DIR}/${ymd}.json`;
}
function loadTodayHistory(): Record<string, HistoryEntry[]> {
  const f = todayFile();
  if (existsSync(f)) {
    try { return JSON.parse(require("fs").readFileSync(f, "utf-8")); }
    catch { return {}; }
  }
  return {};
}
let todayHistory: Record<string, HistoryEntry[]> = loadTodayHistory();

function pushHistory(name: string, ms: number, ok: boolean, detail?: string) {
  const entry: HistoryEntry = { time: new Date().toISOString(), ms, ok, detail };
  if (!recentHistory[name]) recentHistory[name] = [];
  recentHistory[name].push(entry);
  if (recentHistory[name].length > 20) recentHistory[name].shift();
  if (!todayHistory[name]) todayHistory[name] = [];
  todayHistory[name].push(entry);
  if (todayHistory[name].length % 10 === 0) {
    Bun.write(todayFile(), JSON.stringify(todayHistory, null, 2));
  }
}

setInterval(() => {
  Bun.write(todayFile(), JSON.stringify(todayHistory, null, 2));
}, 60_000);

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now); midnight.setHours(24,0,0,0);
  return midnight.getTime() - now.getTime();
}
setTimeout(function resetDaily() {
  todayHistory = {};
  console.log("🔄 History direset untuk hari baru");
  setTimeout(resetDaily, 24 * 60 * 60 * 1000);
}, msUntilMidnight());

function listHistoryDates(): string[] {
  const fs = require("fs");
  return fs.readdirSync(HISTORY_DIR)
    .filter((f: string) => f.endsWith(".json"))
    .map((f: string) => f.replace(".json", ""))
    .sort().reverse();
}
function loadHistoryByDate(date: string): Record<string, HistoryEntry[]> {
  const f = `${HISTORY_DIR}/${date}.json`;
  if (!existsSync(f)) return {};
  try { return JSON.parse(require("fs").readFileSync(f, "utf-8")); }
  catch { return {}; }
}

// ==========================
// CHECKERS
// ==========================
async function checkHTTP(url: string) {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, ms: Date.now()-start, detail: `HTTP ${res.status}` };
  } catch(e: any) { return { ok: false, ms: Date.now()-start, detail: e?.message??'Timeout' }; }
}

async function checkTCP(host: string, port: number) {
  const start = Date.now();
  try {
    const conn = await Bun.connect({ hostname:host, port, socket:{open(){},data(){},close(){},error(){}} });
    conn.end();
    return { ok: true, ms: Date.now()-start, detail: 'Port open' };
  } catch { return { ok: false, ms: Date.now()-start, detail: 'Port closed' }; }
}

async function checkPing(host: string) {
  const start = Date.now();
  try {
    const isWin = process.platform === "win32";
    const args = isWin ? ["-n","1","-w","3000",host] : ["-c","1","-W","3",host];
    const proc = Bun.spawn(["ping",...args], { stdout:"pipe", stderr:"pipe" });
    const exit = await proc.exited;
    const ms = Date.now()-start;
    if (exit === 0) {
      const out = await new Response(proc.stdout).text();
      const match = out.match(/[=<](\d+\.?\d*)\s*ms/i) || out.match(/time[=<](\d+)/i);
      return { ok:true, ms: match?Math.round(parseFloat(match[1])):ms, detail:'ICMP reply' };
    }
    return { ok:false, ms, detail:'No reply' };
  } catch { return { ok:false, ms:Date.now()-start, detail:'Ping error' }; }
}

async function checkDNS(domain: string) {
  const start = Date.now();
  try {
    const r = await dns.lookup(domain, { family:4 });
    const ip = Array.isArray(r)?r[0]?.address:(r as any)?.address;
    return { ok:!!ip, ms:Date.now()-start, detail:ip?`Resolved: ${ip}`:'No record' };
  } catch(e:any) { return { ok:false, ms:Date.now()-start, detail:e?.message??'DNS failed' }; }
}

async function checkSMTP(host: string, port=25) {
  const start = Date.now();
  try {
    let greeting = "";
    const conn = await Bun.connect({ hostname:host, port,
      socket:{open(){},data(_s,d){greeting=Buffer.from(d).toString().substring(0,60);},close(){},error(){}} });
    await new Promise(r=>setTimeout(r,1500)); conn.end();
    const ok = greeting.startsWith("220");
    return { ok, ms:Date.now()-start, detail:greeting.trim()||'No banner' };
  } catch { return { ok:false, ms:Date.now()-start, detail:'Connection refused' }; }
}

async function checkSNMP(host: string, community="public", oid="1.3.6.1.2.1.1.1.0") {
  const start = Date.now();
  try {
    const proc = Bun.spawn(["snmpget","-v2c","-c",community,"-t","3","-r","1",host,oid],{stdout:"pipe",stderr:"pipe"});
    const exit = await proc.exited;
    const ms = Date.now()-start;
    if (exit===0) { const out=await new Response(proc.stdout).text(); return {ok:true,ms,detail:out.trim().substring(0,60)}; }
    return { ok:false, ms, detail:'No response' };
  } catch { return { ok:false, ms:Date.now()-start, detail:'snmpget not found' }; }
}

async function checkRADIUS(host: string, port=1812) {
  const ping = await checkPing(host);
  return { ...ping, detail: ping.ok?`Host reachable (UDP:${port})`:'Host unreachable' };
}

async function checkTailscale(peer: string) {
  const start = Date.now();
  try {
    const proc = Bun.spawn(["tailscale","ping","--c","1",peer],{stdout:"pipe",stderr:"pipe"});
    const exit = await proc.exited; const ms = Date.now()-start;
    if (exit===0) {
      const out = await new Response(proc.stdout).text();
      const match = out.match(/(\d+\.?\d*)\s*ms/i);
      return { ok:true, ms:match?Math.round(parseFloat(match[1])):ms, detail:out.trim().substring(0,60) };
    }
    return { ok:false, ms, detail:'No response' };
  } catch { return { ok:false, ms:Date.now()-start, detail:'tailscale CLI not found' }; }
}

async function checkTarget(t: Target) {
  switch(t.type) {
    case "http":      return {...await checkHTTP(t.url!),                      address:t.url};
    case "tcp":       return {...await checkTCP(t.host!,t.port!),              address:`${t.host}:${t.port}`};
    case "ping":      return {...await checkPing(t.host!),                     address:t.host};
    case "dns":       return {...await checkDNS(t.domain!),                    address:t.domain};
    case "smtp":      return {...await checkSMTP(t.host!,t.port??25),          address:`${t.host}:${t.port??25}`};
    case "snmp":      return {...await checkSNMP(t.host!,t.community,t.oid),   address:t.host};
    case "radius":    return {...await checkRADIUS(t.host!,t.port??1812),      address:`${t.host}:${t.port??1812}`};
    case "tailscale": return {...await checkTailscale(t.peer!),                address:t.peer};
    default:          return {ok:false,ms:0,detail:'Unknown',                  address:'-'};
  }
}

// ==========================
// TELEGRAM NOTIFIKASI
// ==========================
const TELEGRAM_FILE = "telegram.json";
type TelegramConfig = { token: string; chatId: string; enabled: boolean };

function loadTelegram(): TelegramConfig {
  if (existsSync(TELEGRAM_FILE)) {
    try { return JSON.parse(require("fs").readFileSync(TELEGRAM_FILE, "utf-8")); }
    catch {}
  }
  return { token: "", chatId: "", enabled: false };
}
function saveTelegram(cfg: TelegramConfig) { Bun.write(TELEGRAM_FILE, JSON.stringify(cfg, null, 2)); }

async function sendTelegram(message: string) {
  const cfg = loadTelegram();
  if (!cfg.enabled || !cfg.token || !cfg.chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text: message, parse_mode: "HTML" }),
    });
  } catch(e) { console.error("Telegram error:", e); }
}

const prevStatus: Record<string, boolean> = {};


// ==========================
// NETWORK MAP
// ==========================
const NETMAP_FILE = "netmap.json";

type NetNode = {
  id: string;
  label: string;
  type: "router" | "switch" | "server" | "pc" | "ap" | "firewall" | "cloud" | "monitor";
  x: number;
  y: number;
  linkedTarget?: string;
};

type NetEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

type NetMap = { nodes: NetNode[]; edges: NetEdge[] };

function loadNetMap(): NetMap {
  if (existsSync(NETMAP_FILE)) {
    try { return JSON.parse(require("fs").readFileSync(NETMAP_FILE, "utf-8")); }
    catch {}
  }
  return { nodes: [], edges: [] };
}
function saveNetMap(m: NetMap) { Bun.write(NETMAP_FILE, JSON.stringify(m, null, 2)); }

// ==========================
// WEBSOCKET & RUN
// ==========================
const clients = new Set<any>();
const INTERVAL = 10;
const PORT = 3000;

async function runCheck() {
  const waktu = new Date().toLocaleTimeString("id-ID");
  const results = await Promise.all(targets.map(async t => {
    const r = await checkTarget(t);
    pushHistory(t.name, r.ms, r.ok, r.detail);

    // Deteksi perubahan status → kirim notifikasi Telegram
    if (prevStatus[t.name] !== undefined && prevStatus[t.name] !== r.ok) {
      const waktuNotif = new Date().toLocaleString("id-ID");
      if (!r.ok) {
        sendTelegram(
          `🔴 <b>DOWN: ${t.name}</b>\n` +
          `📍 ${(r as any).address ?? '-'}\n` +
          `❌ ${r.detail ?? 'No response'}\n` +
          `🕐 ${waktuNotif}`
        );
      } else {
        sendTelegram(
          `🟢 <b>RECOVERY: ${t.name}</b>\n` +
          `📍 ${(r as any).address ?? '-'}\n` +
          `✅ Kembali online (${r.ms}ms)\n` +
          `🕐 ${waktuNotif}`
        );
      }
    }
    prevStatus[t.name] = r.ok;

    return { name:t.name, type:t.type, ...r, history:recentHistory[t.name]??[] };
  }));
  const payload = JSON.stringify({ waktu, results });
  for (const ws of clients) ws.send(payload);
  console.log(`[${waktu}] Check → ${clients.size} browser`);
}

// ==========================
// HTTP SERVER
// ==========================
Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    const sess = getSession(req);

    // ── WebSocket ──
    if (url.pathname === "/ws") {
      if (!sess) return new Response("Unauthorized", { status: 401 });
      if (server.upgrade(req)) return;
      return new Response("WS upgrade gagal", { status: 500 });
    }

    // ── Login ──
    if (url.pathname === "/login" && req.method === "GET")
      return new Response(Bun.file("public/login.html"), { headers:{"Content-Type":"text/html"} });

    if (url.pathname === "/login" && req.method === "POST") {
      const body = await req.json() as { username: string; password: string };
      const user = users.find(u => u.username === body.username && u.password === body.password);
      if (user) {
        const token = generateToken();
        sessions.set(token, { username: user.username, role: user.role });
        return new Response(JSON.stringify({ ok:true, role:user.role }), {
          headers: { "Content-Type":"application/json", "Set-Cookie":`session=${token}; Path=/; HttpOnly; Max-Age=86400` }
        });
      }
      return new Response(JSON.stringify({ error:"Username atau password salah" }), { status:401 });
    }

    // ── Logout ──
    if (url.pathname === "/logout") {
      const cookie = req.headers.get("cookie")??"";
      const token = cookie.split(";").find(c=>c.trim().startsWith("session="))?.split("=")[1]?.trim();
      if (token) sessions.delete(token);
      return new Response(null, { status:302, headers:{ Location:"/login" } });
    }

    // ── Auth guard ──
    if (!sess) return new Response(null, { status:302, headers:{ Location:"/login" } });

    // ── API: session info ──
    if (url.pathname === "/api/me")
      return new Response(JSON.stringify(sess), { headers:{"Content-Type":"application/json"} });

    // ── API: targets ──
    if (url.pathname === "/api/targets" && req.method === "GET")
      return new Response(JSON.stringify(targets), { headers:{"Content-Type":"application/json"} });

    if (url.pathname === "/api/targets" && req.method === "POST") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), { status:403 });
      const body = await req.json() as Target;
      if (!body.name||!body.type) return new Response(JSON.stringify({error:"name & type wajib"}), {status:400});
      targets.push(body); saveTargets(targets); runCheck();
      return new Response(JSON.stringify({ok:true}));
    }

    if (url.pathname.startsWith("/api/targets/") && req.method === "DELETE") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const name = decodeURIComponent(url.pathname.split("/api/targets/")[1]);
      targets = targets.filter(t=>t.name!==name); saveTargets(targets);
      return new Response(JSON.stringify({ok:true}));
    }

    // ── API: history dates ──
    if (url.pathname === "/api/history/dates")
      return new Response(JSON.stringify(listHistoryDates()), { headers:{"Content-Type":"application/json"} });

    // ── API: history range ──
    if (url.pathname === "/api/history/range") {
      const range = url.searchParams.get("range") ?? "1h";
      const target = url.searchParams.get("target") ?? "";
      const now = Date.now();
      const rangeMs: Record<string, number> = {
        "1h":  1 * 60 * 60 * 1000,
        "5h":  5 * 60 * 60 * 1000,
        "24h": 24 * 60 * 60 * 1000,
        "7d":  7  * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "60d": 60 * 24 * 60 * 60 * 1000,
        "1y":  365 * 24 * 60 * 60 * 1000,
      };
      const ms = rangeMs[range] ?? rangeMs["1h"];
      const since = now - ms;
      const allEntries: Record<string, HistoryEntry[]> = {};
      const dates = listHistoryDates();
      const daysNeeded = Math.ceil(ms / (24 * 60 * 60 * 1000)) + 1;
      const relevantDates = ["today", ...dates.slice(0, daysNeeded)];
      for (const d of relevantDates) {
        const data = d === "today" ? todayHistory : loadHistoryByDate(d);
        for (const [name, entries] of Object.entries(data)) {
          if (target && name !== target) continue;
          if (!allEntries[name]) allEntries[name] = [];
          const filtered = entries.filter(e => new Date(e.time).getTime() >= since);
          allEntries[name].push(...filtered);
        }
      }
      for (const name of Object.keys(allEntries)) {
        allEntries[name].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      }
      return new Response(JSON.stringify(allEntries), { headers:{"Content-Type":"application/json"} });
    }

    // ── API: history by date ──
    if (url.pathname.startsWith("/api/history/")) {
      const date = url.pathname.split("/api/history/")[1];
      const data = date === "today" ? todayHistory : loadHistoryByDate(date);
      return new Response(JSON.stringify(data), { headers:{"Content-Type":"application/json"} });
    }

    // ── API: users ──
    if (url.pathname === "/api/users" && req.method === "GET") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      return new Response(JSON.stringify(users.map(u=>({username:u.username,role:u.role}))), {
        headers:{"Content-Type":"application/json"}
      });
    }
    if (url.pathname === "/api/users" && req.method === "POST") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const body = await req.json() as User;
      if (!body.username||!body.password) return new Response(JSON.stringify({error:"username & password wajib"}), {status:400});
      if (users.find(u=>u.username===body.username)) return new Response(JSON.stringify({error:"Username sudah ada"}), {status:400});
      users.push({ username:body.username, password:body.password, role:body.role||"viewer" });
      saveUsers(users);
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname.startsWith("/api/users/") && req.method === "DELETE") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const uname = decodeURIComponent(url.pathname.split("/api/users/")[1]);
      if (uname === sess.username) return new Response(JSON.stringify({error:"Tidak bisa hapus diri sendiri"}), {status:400});
      users = users.filter(u=>u.username!==uname); saveUsers(users);
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname.startsWith("/api/users/") && req.method === "PATCH") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const uname = decodeURIComponent(url.pathname.split("/api/users/")[1]);
      const body = await req.json() as { password?: string; role?: string };
      const u = users.find(u=>u.username===uname);
      if (!u) return new Response(JSON.stringify({error:"User tidak ditemukan"}), {status:404});
      if (body.password) u.password = body.password;
      if (body.role) u.role = body.role as any;
      saveUsers(users);
      return new Response(JSON.stringify({ok:true}));
    }

    // ── API: TICKETS ──
    if (url.pathname === "/api/tickets" && req.method === "GET") {
      return new Response(JSON.stringify(tickets), { headers: {"Content-Type":"application/json"} });
    }
    if (url.pathname === "/api/tickets" && req.method === "POST") {
      const body = await req.json();
      if (!body.title) return new Response(JSON.stringify({error:"Judul wajib diisi"}), {status:400});
      const ticket: Ticket = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
        title: body.title,
        description: body.description ?? "",
        priority: body.priority ?? "medium",
        status: "open",
        createdBy: sess.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tickets.unshift(ticket);
      saveTickets(tickets);
      return new Response(JSON.stringify({ok:true, ticket}));
    }
    if (url.pathname.startsWith("/api/tickets/") && req.method === "PATCH") {
      const id = url.pathname.split("/api/tickets/")[1];
      const body = await req.json();
      const t = tickets.find(t => t.id === id);
      if (!t) return new Response(JSON.stringify({error:"Tiket tidak ditemukan"}), {status:404});
      if (body.status) t.status = body.status;
      if (body.priority) t.priority = body.priority;
      if (body.title) t.title = body.title;
      if (body.description !== undefined) t.description = body.description;
      t.updatedAt = new Date().toISOString();
      saveTickets(tickets);
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname.startsWith("/api/tickets/") && req.method === "DELETE") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const id = url.pathname.split("/api/tickets/")[1];
      tickets = tickets.filter(t => t.id !== id);
      saveTickets(tickets);
      return new Response(JSON.stringify({ok:true}));
    }

    // ── API: ASSETS ──
    if (url.pathname === "/api/assets" && req.method === "GET") {
      return new Response(JSON.stringify(assets), { headers: {"Content-Type":"application/json"} });
    }
    if (url.pathname === "/api/assets" && req.method === "POST") {
      const body = await req.json();
      if (!body.name) return new Response(JSON.stringify({error:"Nama aset wajib diisi"}), {status:400});
      const asset: Asset = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
        name: body.name,
        type: body.type ?? "Other",
        location: body.location ?? "",
        serial: body.serial ?? "",
        status: body.status ?? "active",
        linkedTarget: body.linkedTarget ?? "",
        ownerName: body.ownerName ?? "",
        ownerNIK: body.ownerNIK ?? "",
        createdBy: sess.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [{ time: new Date().toISOString(), action: "Dibuat", by: sess.username, note: "Aset ditambahkan" }],
      };
      assets.unshift(asset);
      saveAssets(assets);
      return new Response(JSON.stringify({ok:true, asset}));
    }
    if (url.pathname.startsWith("/api/assets/") && req.method === "PATCH") {
      const id = url.pathname.split("/api/assets/")[1];
      const body = await req.json();
      const a = assets.find(a => a.id === id);
      if (!a) return new Response(JSON.stringify({error:"Aset tidak ditemukan"}), {status:404});
      const changes: string[] = [];
      if (body.name && body.name !== a.name)         { changes.push(`Nama: ${a.name} → ${body.name}`); a.name = body.name; }
      if (body.type && body.type !== a.type)          { changes.push(`Tipe: ${a.type} → ${body.type}`); a.type = body.type; }
      if (body.location !== undefined && body.location !== a.location) { changes.push(`Lokasi: ${a.location} → ${body.location}`); a.location = body.location; }
      if (body.serial !== undefined && body.serial !== a.serial)       { changes.push(`Serial: ${a.serial} → ${body.serial}`); a.serial = body.serial; }
      if (body.status && body.status !== a.status)   { changes.push(`Status: ${a.status} → ${body.status}`); a.status = body.status; }
      if (body.linkedTarget !== undefined && body.linkedTarget !== a.linkedTarget) { changes.push(`Link monitor: ${a.linkedTarget||'-'} → ${body.linkedTarget||'-'}`); a.linkedTarget = body.linkedTarget; }
      if (body.ownerName !== undefined && body.ownerName !== a.ownerName) { changes.push(`Pemilik: ${a.ownerName||'-'} → ${body.ownerName}`); a.ownerName = body.ownerName; }
      if (body.ownerNIK !== undefined && body.ownerNIK !== a.ownerNIK)   { changes.push(`NIK: ${a.ownerNIK||'-'} → ${body.ownerNIK}`); a.ownerNIK = body.ownerNIK; }
      a.updatedAt = new Date().toISOString();
      if (changes.length > 0) {
        a.history.push({ time: new Date().toISOString(), action: "Diupdate", by: sess.username, note: changes.join(", ") });
      }
      saveAssets(assets);
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname.startsWith("/api/assets/") && req.method === "DELETE") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const id = url.pathname.split("/api/assets/")[1];
      assets = assets.filter(a => a.id !== id);
      saveAssets(assets);
      return new Response(JSON.stringify({ok:true}));
    }

    // ── API: Telegram Settings ──
    if (url.pathname === "/api/settings/telegram" && req.method === "GET") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      return new Response(JSON.stringify(loadTelegram()), { headers:{"Content-Type":"application/json"} });
    }
    if (url.pathname === "/api/settings/telegram" && req.method === "POST") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const body = await req.json() as TelegramConfig;
      saveTelegram({ token: body.token??'', chatId: body.chatId??'', enabled: body.enabled??false });
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname === "/api/settings/telegram/test" && req.method === "POST") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const cfg = loadTelegram();
      if (!cfg.token || !cfg.chatId) return new Response(JSON.stringify({error:"Token dan Chat ID belum diisi"}), {status:400});
      try {
        const res = await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: cfg.chatId, text: "✅ Monitor Ku berhasil terhubung ke Telegram!\n\nKamu akan menerima notifikasi saat ada target DOWN atau RECOVERY." }),
        });
        const data = await res.json() as any;
        if (data.ok) return new Response(JSON.stringify({ok:true}));
        return new Response(JSON.stringify({error: data.description ?? "Gagal"}), {status:400});
      } catch(e:any) { return new Response(JSON.stringify({error:e.message}), {status:500}); }
    }

    // ── API: Network Map ──
    if (url.pathname === "/api/netmap" && req.method === "GET") {
      return new Response(JSON.stringify(loadNetMap()), { headers:{"Content-Type":"application/json"} });
    }
    if (url.pathname === "/api/netmap" && req.method === "POST") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const body = await req.json() as NetMap;
      saveNetMap(body);
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname === "/api/netmap/node" && req.method === "POST") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const body = await req.json() as NetNode;
      const map = loadNetMap();
      body.id = Date.now().toString(36) + Math.random().toString(36).slice(2,4);
      map.nodes.push(body);
      saveNetMap(map);
      return new Response(JSON.stringify({ok:true, id: body.id}));
    }
    if (url.pathname.startsWith("/api/netmap/node/") && req.method === "DELETE") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const id = url.pathname.split("/api/netmap/node/")[1];
      const map = loadNetMap();
      map.nodes = map.nodes.filter(n => n.id !== id);
      map.edges = map.edges.filter(e => e.from !== id && e.to !== id);
      saveNetMap(map);
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname.startsWith("/api/netmap/node/") && req.method === "PATCH") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const id = url.pathname.split("/api/netmap/node/")[1];
      const body = await req.json();
      const map = loadNetMap();
      const node = map.nodes.find(n => n.id === id);
      if (!node) return new Response(JSON.stringify({error:"Node tidak ditemukan"}), {status:404});
      if (body.x !== undefined) node.x = body.x;
      if (body.y !== undefined) node.y = body.y;
      if (body.label !== undefined) node.label = body.label;
      if (body.type !== undefined) node.type = body.type;
      if (body.linkedTarget !== undefined) node.linkedTarget = body.linkedTarget;
      saveNetMap(map);
      return new Response(JSON.stringify({ok:true}));
    }
    if (url.pathname === "/api/netmap/edge" && req.method === "POST") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const body = await req.json() as NetEdge;
      const map = loadNetMap();
      body.id = Date.now().toString(36) + Math.random().toString(36).slice(2,4);
      map.edges.push(body);
      saveNetMap(map);
      return new Response(JSON.stringify({ok:true, id: body.id}));
    }
    if (url.pathname.startsWith("/api/netmap/edge/") && req.method === "DELETE") {
      if (!isAdmin(req)) return new Response(JSON.stringify({error:"Admin only"}), {status:403});
      const id = url.pathname.split("/api/netmap/edge/")[1];
      const map = loadNetMap();
      map.edges = map.edges.filter(e => e.id !== id);
      saveNetMap(map);
      return new Response(JSON.stringify({ok:true}));
    }

    // ── Serve HTML ──
    return new Response(Bun.file("public/index.html"), { headers:{"Content-Type":"text/html"} });
  },
  websocket: {
    open(ws)  { clients.add(ws);    console.log(`🟢 Connected (${clients.size})`); },
    close(ws) { clients.delete(ws); console.log(`🔴 Disconnected (${clients.size})`); },
    message() {},
  },
});

console.log(`✅ Server jalan di http://localhost:${PORT}`);
runCheck();
setInterval(runCheck, INTERVAL * 1000);

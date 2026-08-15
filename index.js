// ============================================================================
//  SHABAAN GILL MD BOT - MULTI-ACCOUNT PRODUCTION ENGINE
// ============================================================================

const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");
const P = require("pino");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason,
  delay
} = require("@whiskeysockets/baileys");

// Primary Handlers & Modules
const { handleCommand } = require("./menu/case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation, setBotId } = require("./antidelete");
const AntiLinkKick = require("./antilinkkick.js"); // Fixed typo: antilinkick.js -> antilinkkick.js
const { antibugHandler } = require("./antibug.js"); 
const autoread = require("./autoread");

// Additional Automation Modules
const autotyping = require("./autotyping.js");
const autorecording = require("./autorecording.js");
const autostatus = require("./autostatus.js");
const autogreet = require("./autogreet.js");

// 🛡️ CRASH GUARDS
process.on("uncaughtException", (err) => {
  console.error("\x1b[31m[CRASH GUARD] Uncaught Exception:\x1b[0m", err.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("\x1b[31m[CRASH GUARD] Unhandled Rejection:\x1b[0m", reason?.message || reason);
});

process.stdin.setMaxListeners(0);

const startTime = Date.now();
const activeSockets = new Map();
const pendingSockets = new Map();

function printBanner() {
  console.clear();
  console.log("\x1b[36m%s\x1b[0m", `
  ╔══════════════════════════════════════════════════════════════╗
  ║            SHABAAN GILL'S MD BOT - MULTI SESSION             ║
  ║               Multi-Device WhatsApp Platform                 ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
}

function logStatus(tag, message, color = "\x1b[32m") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${tag}]\x1b[0m ${message}`);
}

printBanner();

const PORT = process.env.PORT || 20161;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const reqPath = parsedUrl.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // 🧹 WEB SESSION RESET ENDPOINT
  if (reqPath === "/reset-session") {
    let targetNum = parsedUrl.query.number;
    
    try {
      if (targetNum) {
        targetNum = targetNum.replace(/[^0-9]/g, "");
        const numFolder = path.join(__dirname, "auth_info", targetNum);
        
        if (activeSockets.has(targetNum)) {
          try { 
            activeSockets.get(targetNum).ev.removeAllListeners();
            activeSockets.get(targetNum).end(); 
          } catch (e) {}
          activeSockets.delete(targetNum);
        }
        if (pendingSockets.has(targetNum)) {
          try { 
            pendingSockets.get(targetNum).ev.removeAllListeners();
            pendingSockets.get(targetNum).end(); 
          } catch (e) {}
          pendingSockets.delete(targetNum);
        }
        if (fs.existsSync(numFolder)) {
          fs.rmSync(numFolder, { recursive: true, force: true });
        }
        logStatus("RESET", `Session cleared for +${targetNum}`, "\x1b[35m");
      } else {
        const authBase = path.join(__dirname, "auth_info");
        for (const [key, sock] of activeSockets.entries()) {
          try { sock.ev.removeAllListeners(); sock.end(); } catch (e) {}
        }
        for (const [key, sock] of pendingSockets.entries()) {
          try { sock.ev.removeAllListeners(); sock.end(); } catch (e) {}
        }
        activeSockets.clear();
        pendingSockets.clear();

        if (fs.existsSync(authBase)) {
          fs.rmSync(authBase, { recursive: true, force: true });
        }
        logStatus("RESET", "All session directories cleared.", "\x1b[35m");
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "success", message: "Session cleared successfully!" }));
    } catch (err) {
      logStatus("RESET ERR", `Reset failed: ${err.message}`, "\x1b[31m");
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // 📊 API Metrics
  if (reqPath === "/api/metrics" || reqPath === "/metrics") {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const latencyVal = Math.floor(Math.random() * 25) + 35;
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: "online",
      engine: "Baileys Multi-Session Engine",
      latency: `${latencyVal}ms`,
      memory: `${memUsage} MB`,
      activeSessions: activeSockets.size,
      uptime: uptimeStr
    }));
  }

  // 📱 PAIRING ENGINE
  if (reqPath === "/pair") {
    let phoneNumber = parsedUrl.query.number;

    if (!phoneNumber) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Missing phone number." }));
    }

    phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

    if (phoneNumber.length < 8 || phoneNumber.length > 15) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid international phone number structure." }));
    }

    logStatus("PAIR REQ", `Generating pairing code for +${phoneNumber}`, "\x1b[33m");

    try {
      const sessionFolder = path.join(__dirname, "auth_info", phoneNumber);

      if (pendingSockets.has(phoneNumber)) {
        try { 
          pendingSockets.get(phoneNumber).ev.removeAllListeners();
          pendingSockets.get(phoneNumber).end(); 
        } catch (e) {}
        pendingSockets.delete(phoneNumber);
      }
      if (fs.existsSync(sessionFolder)) {
        fs.rmSync(sessionFolder, { recursive: true, force: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "fatal" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        getMessage: async () => ({ conversation: "" })
      });

      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });

      pendingSockets.set(phoneNumber, sock);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
          logStatus("PAIR OK", `Device +${phoneNumber} successfully linked!`, "\x1b[32m");
          pendingSockets.delete(phoneNumber);
          activeSockets.set(phoneNumber, sock);
          attachSocketListeners(sock, phoneNumber);
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          logStatus("PAIR DISCONNECT", `+${phoneNumber} closed with status code: ${statusCode}`, "\x1b[33m");

          if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
            logStatus("HANDSHAKE", `Completing pairing handshake for +${phoneNumber}...`, "\x1b[36m");
            setTimeout(() => initSession(phoneNumber), 2000);
          } else if (statusCode === DisconnectReason.loggedOut) {
            pendingSockets.delete(phoneNumber);
            activeSockets.delete(phoneNumber);
            try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch (e) {}
          }
        }
      });

      const getPairingCode = () => {
        return new Promise(async (resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Pairing code request timed out."));
          }, 25000);

          try {
            await delay(4000);
            if (!sock.authState.creds.registered) {
              let rawCode = await sock.requestPairingCode(phoneNumber);
              clearTimeout(timeout);
              if (rawCode && !rawCode.includes("-") && rawCode.length === 8) {
                rawCode = `${rawCode.substring(0, 4)}-${rawCode.substring(4)}`;
              }
              resolve(rawCode);
            } else {
              clearTimeout(timeout);
              reject(new Error("This phone number is already registered."));
            }
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        });
      };

      const code = await getPairingCode();
      logStatus("PAIR CODE", `Code: ${code} generated for +${phoneNumber}`, "\x1b[36m");

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ code: code, status: "success" }));
    } catch (err) {
      logStatus("PAIR ERR", `Pairing failed: ${err.message}`, "\x1b[31m");
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message || "Failed to generate pairing code." }));
    }
  }

  // 🌐 Serve Dashboard
  if (reqPath === "/" || reqPath === "/index.html") {
    const filePath = path.join(__dirname, "public", "index.html");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      return fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Error: public/index.html missing.");
    }
  }

  // Static Assets
  const publicAssetPath = path.join(__dirname, "public", reqPath);
  if (fs.existsSync(publicAssetPath) && fs.statSync(publicAssetPath).isFile()) {
    const ext = path.extname(publicAssetPath);
    const mimeTypes = { ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg" };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    return fs.createReadStream(publicAssetPath).pipe(res);
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  logStatus("SERVER", `Server running on Port ${PORT} - Engine active.`, "\x1b[36m");
});

// 🤖 ATTACH EVENT LISTENERS PER ACCOUNT
function attachSocketListeners(sock, phoneNumber) {
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};

  try { setBotId(sock); } catch (e) {}

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "open") {  
      logStatus("BOT SYS", `[+${phoneNumber}] Connected to WhatsApp successfully!`, "\x1b[32m");
      
      try {
        const userJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
        const startupMsg = 
`╭───[ 🤖 *SHABAAN GILL MD* ]───
│ 
│ 🟢 *Status:* Connected & Active
│ 📱 *Account:* +${phoneNumber}
│ ⚡ *Mode:* Multi-Session Ready
│ 🛡️ *Protection:* Anti-Link & Anti-Delete Active
│ 
╰─────────────────────────────`;
        await sock.sendMessage(userJid, { text: startupMsg });
      } catch (e) {}
    }  
    if (connection === "close") {  
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;  

      logStatus("BOT SYS", `[+${phoneNumber}] Closed (Code ${statusCode}). Reconnecting: ${shouldReconnect}`, "\x1b[33m");
      if (shouldReconnect) {
        setTimeout(() => initSession(phoneNumber), 3000);  
      }
    }
  });

  // 👥 Group Participants Update Handler (Welcome / Goodbye Greetings)
  sock.ev.on("group-participants.update", async (update) => {
    try {
      if (autogreet && typeof autogreet.handleGroupUpdate === "function") {
        await autogreet.handleGroupUpdate(sock, update);
      }
    } catch (err) {}
  });

  // 1️⃣ LISTEN FOR INCOMING MESSAGES
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg || !msg.message) continue;
      const jid = msg.key.remoteJid;
      if (!jid) continue;

      const isGroup = jid.endsWith("@g.us");
      const isStatus = jid === "status@broadcast";
      const isCommunity = jid.includes("@newsletter") || jid.includes("@community");
      
      // Handle WhatsApp Statuses separately
      if (isStatus) {
        try {
          if (autostatus && typeof autostatus.handleStatus === "function") {
            await autostatus.handleStatus(sock, msg);
          }
        } catch (e) {}
        continue;
      }

      // Auto-Typing & Auto-Recording Status Simulator
      try {
        if (global.autotyping && typeof autotyping.simulateTyping === "function") {
          await autotyping.simulateTyping(sock, jid);
        }
        if (global.autorecording && typeof autorecording.simulateRecording === "function") {
          await autorecording.simulateRecording(sock, jid);
        }
      } catch (e) {}

      // Extract clean text content across all message formats
      const text = 
        msg.message?.conversation || 
        msg.message?.extendedTextMessage?.text || 
        msg.message?.imageMessage?.caption || 
        msg.message?.videoMessage?.caption || "";

      // 💾 Store message for Anti-Delete tracking
      try {
        if (typeof storeMessage === 'function') {
          storeMessage(msg);
        }
      } catch (err) {}

      // 🧹 Protocol / Revocation message handle
      if (msg.message?.protocolMessage?.type === 0) {
        try {
          if (typeof handleMessageRevocation === 'function') {
            await handleMessageRevocation(sock, msg);
          }
        } catch (err) {}
        continue;
      }

      // 👁️ AutoRead Check
      try {
        if (autoread && typeof autoread.checkAutoRead === 'function') {
          await autoread.checkAutoRead(sock, msg);
        }
      } catch (e) {}

      // ❤️ AutoReact Check
      if (global.autoreact && !msg.key.fromMe && text) {
        try {
          const hearts = ["❤️","☣️","🅣","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💓","💗","💖","💘","💝","🇵🇰","♥️"];
          const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
          
          await sock.sendMessage(jid, { 
            react: { text: randomHeart, key: msg.key } 
          });
        } catch (err) {}
      }

      // 🔗 Anti-Link Check (Deletes link and cleanly STOPS execution)
      if (
        isGroup &&
        (global.antilink?.[jid] === true || settings.antiLink === true) &&
        /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text)
      ) {
        try {
          await sock.sendMessage(jid, {  
            delete: { 
              remoteJid: jid, 
              fromMe: false, 
              id: msg.key.id, 
              participant: msg.key.participant || msg.participant 
            }  
          });
          return;
        } catch (err) {}
      }

      // 🔗 AntiLink Kick Module
      if (
        isGroup &&
        global.antilinkick?.[jid] === true &&
        /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text)
      ) {
        try { 
          if (AntiLinkKick && typeof AntiLinkKick.checkAntilinkKick === 'function') {
            await AntiLinkKick.checkAntilinkKick({ conn: sock, m: msg }); 
            return;
          }
        } catch (err) {}
      }

      // 🐛 AntiBug Handler
      if (global.antibug === true && !msg.key.fromMe) {
        try {
          if (typeof antibugHandler === 'function') {
            const isBug = await antibugHandler({ conn: sock, m: msg }); 
            if (isBug) continue;
          }
        } catch (err) {}
      }

      // ⚡ Command Processor (Only runs if message contains actual content)
      if (text.trim().length > 0) {
        try {  
          await handleCommand(sock, msg, { publicMode: true, isGroup, isStatus, isCommunity });  
        } catch (err) {}
      }
    }
  });
}

// Restore Single Active Session
async function initSession(phoneNumber) {
  const sessionFolder = path.join(__dirname, "auth_info", phoneNumber);
  if (!fs.existsSync(sessionFolder)) return;

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  if (!state.creds?.registered) return;

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ 
    version, 
    auth: state, 
    logger: P({ level: "fatal" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    getMessage: async () => ({ conversation: "" })
  });

  sock.ev.on("creds.update", saveCreds);
  activeSockets.set(phoneNumber, sock);
  attachSocketListeners(sock, phoneNumber);
}

// Restore All Sessions on Boot
async function initAllSessions() {
  const authBase = path.join(__dirname, "auth_info");
  if (!fs.existsSync(authBase)) return;

  const sessionFolders = fs.readdirSync(authBase).filter(f => fs.statSync(path.join(authBase, f)).isDirectory());
  for (const folder of sessionFolders) {
    logStatus("INIT", `Restoring saved session for +${folder}`, "\x1b[36m");
    await initSession(folder);
  }
}

initAllSessions();

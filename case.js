// 📂 File: case.js / menu/case.js
// 🛡️ Professional Owner Command Suite — SHABAAN GILL-MD

const fs = require("fs");
const path = require("path");
const os = require("os");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// YouTube Downloader Module Imports with Fallback Guards
let ytdl = null;
try {
  ytdl = require("@distube/ytdl-core");
} catch (e) {
  console.warn("⚠️ @distube/ytdl-core missing. YouTube commands will use fallback wrappers.");
}

let ytdlp = null;
try {
  ytdlp = require("yt-dlp-exec");
} catch (e) {
  console.warn("⚠️ yt-dlp-exec missing. Fallback engine disabled.");
}

// ─────────────────────────────────────────────
// 🔌 EXTERNAL MODULE INITIALIZERS
// ─────────────────────────────────────────────

let handleMenuCommands = null;
try {
  const menuCmdPath = path.join(__dirname, "..", "menu_commands.js");
  const localMenuCmdPath = path.join(__dirname, "menu_commands.js");
  if (fs.existsSync(menuCmdPath)) {
    handleMenuCommands = require(menuCmdPath).handleMenuCommands;
  } else if (fs.existsSync(localMenuCmdPath)) {
    handleMenuCommands = require(localMenuCmdPath).handleMenuCommands;
  }
} catch (e) {
  console.warn("⚠️ Extended menu_commands.js module omitted or failed to load:", e.message);
}

let toggleAntidelete = null;
try {
  const antideletePath = path.join(__dirname, "..", "antidelete.js");
  if (fs.existsSync(antideletePath)) {
    toggleAntidelete = require(antideletePath).toggleAntidelete;
  }
} catch (e) {
  console.warn("⚠️ Antidelete module omitted or failed to load.");
}

// ─────────────────────────────────────────────
// ⚙️ GLOBAL CONFIGURATION & STATE REGISTERS
// ─────────────────────────────────────────────

if (!global.mode) global.mode = "public";

const OWNER_JID = "923143007893@s.whatsapp.net";
const OWNER_NUMBER = "923143007893";

if (typeof global.antibug === "undefined") global.antibug = true;
if (typeof global.autotyping === "undefined") global.autotyping = false;
if (typeof global.autoread === "undefined") global.autoread = false;
if (typeof global.autorecording === "undefined") global.autorecording = false;
if (typeof global.cmdReaction === "undefined") global.cmdReaction = "⚡";
if (!global.warns) global.warns = {};

// Global Session Database Initialization
global.db = global.db || {};
global.db.games = global.db.games || {};
global.db.users = global.db.users || {};

// Restrictive Owner Commands List
const ownerOnlyCommands = [
  "video2", "song2", "video", "ytv", "song", "yta", "kick", "add", "nice", "tagall", "autotyping", "autoread", 
  "block", "unblock", "shutdown", "restart", "setbio", "setname", "setpp", "save", 
  "join", "delaymsg", "del", "reactch", "kickall", "antibug", "leave", "open", 
  "close", "tagadmin", "hidetag", "listactive", "changename", "closetime", "warn", 
  "promote", "demote", "promoteall", "demoteall", "say", "cpp", "harami", "ghostping", 
  "adminkill", "autorecording", "vv", "vv2", "self", "public", "sblock", "numinfo", 
  "setreact", "readmore"
];

// RAM-Cached Menu Store
const menuData = {};
const menuCache = new Map();
try {
  const menuPath = path.join(__dirname, "..", "media", "menu.js");
  const localMenuPath = path.join(__dirname, "menu.js");
  let loadedPath = fs.existsSync(menuPath) ? menuPath : fs.existsSync(localMenuPath) ? localMenuPath : null;

  if (loadedPath) {
    Object.assign(menuData, require(loadedPath));
    for (const [k, v] of Object.entries(menuData)) {
      menuCache.set(k.toLowerCase(), v);
    }
  }
} catch (err) {
  console.error("❌ Error pre-loading menu.js into RAM:", err.message);
}

// Core Handlers Fallback Load
let core;
try {
  const corePath = path.join(__dirname, "./core.js");
  if (fs.existsSync(corePath)) core = require(corePath);
} catch (err) {
  console.error("❌ Error loading core.js:", err.message);
}

// Helper: Format Uptime
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + "d " : ""}${h}h ${m}m ${s}s`;
}

// ─────────────────────────────────────────────
// 🔷 MAIN COMMAND ROUTER
// ─────────────────────────────────────────────

async function handleCommand(conn, msg, options = {}) {
  try {
    if (!msg || !msg.message) return;

    // 🛑 GUARD 1: Extract and clean raw text (strips zero-width characters)
    let rawText = (
      msg.message?.conversation || 
      msg.message?.extendedTextMessage?.text || 
      msg.message?.imageMessage?.caption || 
      msg.message?.videoMessage?.caption || 
      msg.message?.templateButtonReplyMessage?.selectedId || 
      msg.message?.buttonsResponseMessage?.selectedButtonId || 
      ""
    ).replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

    // Prevent execution on completely empty messages
    if (!rawText) return;

    const prefixMatch = rawText.match(/^[°•π÷×¶∆£¢€¥®™✓_=|~!?@#$%^&.+-]/i);
    const prefix = prefixMatch ? prefixMatch[0] : "";
    
    // 🛑 GUARD 2: Strict prefix check
    if (!prefix || !rawText.startsWith(prefix)) return;

    const parts = rawText.slice(prefix.length).trim().split(/ +/);
    const rawCmd = parts[0] || "";
    if (!rawCmd) return; // Exit if user only typed the prefix symbol

    const command = rawCmd.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const args = parts.slice(1).filter(arg => arg.trim().length > 0);
    const chatId = msg.key.remoteJid;

    const isGroup = chatId.endsWith("@g.us");
    const isStatus = chatId === "status@broadcast";
    const isCommunity = chatId.includes("@newsletter") || chatId.includes("@community");
    const isPrivate = !isGroup && !isStatus && !isCommunity;

    const rawBotJid = conn.user?.id || conn.user?.jid || "";
    const botCleanNum = rawBotJid.split(":")[0].replace(/\D/g, "");
    const botJid = `${botCleanNum}@s.whatsapp.net`;

    const senderId = msg.key.fromMe ? botJid : (msg.key.participant || msg.key.remoteJid);
    const senderNum = senderId.replace(/\D/g, "");

    const isOwner = senderNum === OWNER_NUMBER || senderNum === botCleanNum;

    // 🛑 GUARD 3: Safe Reply Wrapper prevents sending blank text
    const reply = async (txt, extra = {}) => {
      if (!txt) return;
      if (typeof txt === "string") {
        const cleanTxt = txt.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
        if (!cleanTxt) return;
        return await conn.sendMessage(chatId, { text: cleanTxt, ...extra }, { quoted: msg });
      } else if (typeof txt === "object") {
        return await conn.sendMessage(chatId, txt, { quoted: msg });
      }
    };

    console.log(`\n💬 [CMD] .${command} | Sender: ${senderNum} | Scope: ${isGroup ? "Group" : "Private"}`);

    if (global.autotyping) await conn.sendPresenceUpdate("composing", chatId).catch(() => {});
    else if (global.autorecording) await conn.sendPresenceUpdate("recording", chatId).catch(() => {});

    if (command === "self") {
      if (!isOwner) return await reply("⛔ *Only Shabaan Gill can switch operational modes!*");
      global.mode = "self";
      return await reply("🔒 *BOT IS NOW IN SELF MODE* — Restricted exclusively to Shabaan Gill.");
    }

    if (command === "public") {
      if (!isOwner) return await reply("⛔ *Only Shabaan Gill can switch operational modes!*");
      global.mode = "public";
      return await reply("🌐 *BOT IS NOW IN PUBLIC MODE* — Public commands enabled.");
    }

    if (global.mode === "self" && !isOwner && !["menu", "aimenu", "repo", "idcheck", "status", "ping", "help"].includes(command)) return;

    if (global.mode === "public" && ownerOnlyCommands.includes(command) && !isOwner) {
      return await reply("💀 *ACCESS DENIED!* This command is restricted to Shabaan Gill.");
    }

    return await runCommand({ 
      conn, msg, args, command, rawCmd, chatId, isGroup, isStatus, isCommunity, 
      isPrivate, senderNum, senderId, botJid, botCleanNum, isOwner, reply 
    });

  } catch (err) {
    console.error("❌ Router Handling Error:", err);
  }
}

// ─────────────────────────────────────────────
// 🔷 COMMAND EXECUTOR PIPELINE
// ─────────────────────────────────────────────

async function runCommand({ conn, msg, args, command, rawCmd, chatId, isGroup, isStatus, isCommunity, isPrivate, senderNum, senderId, botJid, botCleanNum, isOwner, reply }) {
  try {
    let groupMetadata = null;
    let groupParticipants = [];
    let groupAdmins = [];
    let isBotAdmin = false;
    let isUserAdmin = false;

    if (isGroup) {
      groupMetadata = await conn.groupMetadata(chatId).catch(() => null);
      if (groupMetadata) {
        groupParticipants = groupMetadata.participants || [];
        groupAdmins = groupParticipants
          .filter(p => p.admin !== null && p.admin !== undefined)
          .map(p => p.id);

        isBotAdmin = groupParticipants.some(p => {
          const isAnAdmin = p.admin !== null && p.admin !== undefined;
          const cleanParticipantNum = p.id.replace(/\D/g, "");
          return isAnAdmin && (p.id === botJid || cleanParticipantNum === botCleanNum);
        });

        isUserAdmin = groupAdmins.includes(senderId);
      }
    }

    let contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    let rawTarget = contextInfo?.participant || contextInfo?.mentionedJid?.[0] || (args[0] ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null);
    let targetJid = rawTarget;

    if (isGroup && groupParticipants.length > 0 && rawTarget) {
      const matchedParticipant = groupParticipants.find(
        (p) => p.id === rawTarget || p.lid === rawTarget || p.id.replace(/\D/g, "") === rawTarget.replace(/\D/g, "")
      );
      if (matchedParticipant) {
        targetJid = matchedParticipant.id;
      }
    }

    if (targetJid && targetJid.includes("@lid")) {
      const match = groupParticipants.find(p => p.lid === targetJid);
      targetJid = match ? match.id : null;
    }

    // ─────────────────────────────────────────────
    // 🤖 0. INTEGRATED AI MENU & ENGINE HANDLERS
    // ─────────────────────────────────────────────
    if (command === "aimenu") {
      const menuText = 
`┌─── 🤖 *ＡＩ  ＣＯＭＭＡＮＤＳ  ＭＥＮＵ* ───
│
│ 🤖 *.gemini <query>* - Google Gemini AI
│ 💻 *.copilot <query>* - Microsoft Copilot AI
│ 🧠 *.gpt / .chatgpt / .ai <query>* - ChatGPT-4o
│ 🎨 *.dalle / .imagine <prompt>* - AI Image Generator
│
└──────────────────────────────`;
      return await reply(menuText);
    }

    if (command === "gemini") {
      const query = args.join(" ");
      if (!query) return await reply("⚠️ *Usage:* `.gemini <your query or question>`");
      
      await conn.sendMessage(chatId, { react: { text: "🤖", key: msg.key } }).catch(() => {});
      
      try {
        const res = await fetch(`https://api.vreden.my.id/api/gemini?query=${encodeURIComponent(query)}`);
        const json = await res.json();
        
        if (json.status && (json.result || json.response)) {
          return await reply(`🤖 *Google Gemini AI*\n\n${json.result || json.response}`);
        }
      } catch (err) {
        console.warn("⚠️ Primary Gemini API failed, switching to backup...");
      }

      try {
        const fallbackRes = await fetch(`https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`);
        const fallbackJson = await fallbackRes.json();
        if (fallbackJson.data) {
          return await reply(`🤖 *Google Gemini AI*\n\n${fallbackJson.data}`);
        }
      } catch (e) {
        return await reply("❌ *Gemini AI service is currently unavailable. Please try again later.*");
      }
    }

    if (command === "copilot") {
      const query = args.join(" ");
      if (!query) return await reply("⚠️ *Usage:* `.copilot <your query or question>`");

      await conn.sendMessage(chatId, { react: { text: "💻", key: msg.key } }).catch(() => {});

      try {
        const res = await fetch(`https://api.vreden.my.id/api/copilot?query=${encodeURIComponent(query)}`);
        const json = await res.json();

        if (json.status && (json.result || json.response)) {
          return await reply(`💻 *Microsoft Copilot AI*\n\n${json.result || json.response}`);
        }
      } catch (err) {
        console.warn("⚠️ Primary Copilot API failed, switching to backup...");
      }

      try {
        const fallbackRes = await fetch(`https://api.siputzx.my.id/api/ai/bingchat?content=${encodeURIComponent(query)}`);
        const fallbackJson = await fallbackRes.json();
        if (fallbackJson.data) {
          return await reply(`💻 *Microsoft Copilot AI*\n\n${fallbackJson.data}`);
        }
      } catch (e) {
        return await reply("❌ *Copilot AI service is currently unavailable. Please try again later.*");
      }
    }

    if (["gpt", "chatgpt", "ai"].includes(command)) {
      const query = args.join(" ");
      if (!query) return await reply(`⚠️ *Usage:* \`.${command} <your text or prompt>\``);

      await conn.sendMessage(chatId, { react: { text: "🧠", key: msg.key } }).catch(() => {});

      try {
        const res = await fetch(`https://api.vreden.my.id/api/chatgpt?query=${encodeURIComponent(query)}`);
        const json = await res.json();

        if (json.status && (json.result || json.response)) {
          return await reply(`🧠 *ChatGPT Output*\n\n${json.result || json.response}`);
        }
      } catch (e) {
        return await reply("❌ *ChatGPT engine is currently offline. Try using `.gemini` or `.copilot`.*");
      }
    }

    if (["dalle", "imagine"].includes(command)) {
      const prompt = args.join(" ");
      if (!prompt) return await reply(`⚠️ *Usage:* \`.${command} <image description>\``);

      await conn.sendMessage(chatId, { react: { text: "🎨", key: msg.key } }).catch(() => {});
      await reply("🎨 *Generating AI Image... Please wait.*");

      try {
        const imageUrl = `https://api.vreden.my.id/api/dalle?prompt=${encodeURIComponent(prompt)}`;
        return await conn.sendMessage(chatId, { image: { url: imageUrl }, caption: `🎨 *Prompt:* "${prompt}"\n\n⚡ *Generated via SHABAAN GILL-MD*` }, { quoted: msg });
      } catch (e) {
        return await reply("❌ *Failed to generate AI image. Try a different prompt.*");
      }
    }

    // ─────────────────────────────────────────────
    // 🛠️ 1. SYSTEM TOOLS & UTILITIES
    // ─────────────────────────────────────────────
    if (command === "readmore") {
      const readMoreChar = String.fromCharCode(8206).repeat(4001);
      const textToSplit = args.join(" ");
      if (!textToSplit) return await reply("⚠️ *Usage:* `.readmore Visible Text | Hidden Text`");

      if (textToSplit.includes("|")) {
        const [visible, hidden] = textToSplit.split("|");
        return await reply(`${visible.trim()}${readMoreChar}${hidden.trim()}`);
      }
      return await reply(`Read More...${readMoreChar}\n${textToSplit}`);
    }

    if (["nice", "insult", "harami", "shapar"].includes(command)) {
      const lists = {
        nice: ["✨ Keep being awesome!", "🌟 Legend status unlocked!", "🔥 Absolute perfection!"],
        insult: ["🧠 You bring everyone so much joy... when you leave the room.", "🔋 Your battery level matches your IQ."],
        harami: ["😈 Naughty behavior detected!", "👀 I see what you did there!", "🚨 High level chaos ahead!"],
        shapar: ["👋 *SLAP!* Clean across the face!", "💥 *SHAPAR!* Calm down over there!"]
      };
      const arr = lists[command];
      return await reply(arr[Math.floor(Math.random() * arr.length)]);
    }

    if (command === "say") {
      const sayText = args.join(" ");
      if (!sayText) return await reply("⚠️ *Usage:* `.say <text>`");
      return await conn.sendMessage(chatId, { text: sayText });
    }

    if (command === "tte" || command === "tts") {
      const textToSay = args.join(" ");
      if (!textToSay) return await reply("⚠️ *Usage:* `.tte <text>`");
      await conn.sendMessage(chatId, { react: { text: "🗣️", key: msg.key } }).catch(() => {});
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSay)}&tl=en&client=tw-ob`;
      return await conn.sendMessage(chatId, { audio: { url: ttsUrl }, mimetype: "audio/mp4", ptt: true }, { quoted: msg });
    }

    if (command === "calc") {
      const expr = args.join(" ");
      if (!expr) return await reply("⚠️ *Usage:* `.calc 25 * 4 + 10`");
      try {
        const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, "");
        if (!sanitized) return await reply("❌ *Invalid math expression!*");
        const res = Function(`"use strict"; return (${sanitized})`)();
        if (!isFinite(res) || isNaN(res)) return await reply("❌ *Math Error (e.g., division by zero).*");
        return await reply(`┌─── 🧮 *ＣＡＬＣＵＬＡＴＩＯＮ* ───\n│\n│ 📥 *Input:* \`${expr}\`\n│ 📤 *Result:* *${res}*\n│\n└──────────────────────────`);
      } catch (err) {
        return await reply("❌ *Invalid expression!*");
      }
    }

    if (command === "poll") {
      const pollText = args.join(" ");
      if (!pollText.includes("|")) return await reply("⚠️ *Usage:* `.poll Question | Option1 | Option2`");
      const parts = pollText.split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length < 3) return await reply("⚠️ *Provide at least 2 options!*");
      return await conn.sendMessage(chatId, { poll: { name: parts[0], values: parts.slice(1), selectableCount: 1 } });
    }

    if (command === "hack") {
      const target = args.join(" ") || "Target User";
      await reply(`💻 *Initiating breach process on:* \`${target}\`...`);
      setTimeout(() => conn.sendMessage(chatId, { text: "📡 *Bypassing firewall authentication... [33%]*" }), 1500);
      setTimeout(() => conn.sendMessage(chatId, { text: "🔓 *Extracting session database... [68%]*" }), 3000);
      setTimeout(() => conn.sendMessage(chatId, { text: `✅ *Hack Complete! Credentials saved for ${target}.*` }), 4500);
      return;
    }

    if (command === "matrix") {
      return await reply(
        `\`\`\`\n01001001 01001110 01001010 01000101 \n01000011 01010100 10110100 11001010 \n00101010 11101010 01010101 10101010 \n01010100 01000001 01010010 01000111 \n01000101 01010100\n\`\`\`\n🟢 *Matrix tunnel initialized by SHABAAN GILL-MD.*`
      );
    }

    if (command === "fancy") {
      const txt = args.join(" ");
      if (!txt) return await reply("⚠️ *Usage:* `.fancy <text>`");
      const font = txt.split("").map(c => {
        const code = c.charCodeAt(0);
        return (code >= 65 && code <= 90) ? String.fromCharCode(code + 120172) : (code >= 97 && code <= 122) ? String.fromCharCode(code + 120166) : c;
      }).join("");
      return await reply(`✨ *Fancy Result:* ${font}`);
    }

    if (command === "heart") {
      return await reply("❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎\n💖 *Sending love from SHABAAN GILL-MD!* 💖");
    }

    if (command === "checkme") {
      const roles = ["Mastermind 🧠", "Elite Hacker 💻", "Pro Trader 📈", "Ghost Agent 🕵️", "Pure Legend 🌟"];
      const randRole = roles[Math.floor(Math.random() * roles.length)];
      return await reply(`┌─── 🕵️ *ＵＳＥＲ  ＰＲＯＦＩＬＥ  ＡＮＡＬＹＳＩＳ* ───\n│\n│ 👤 *User:* @${senderNum}\n│ ⚡ *Assigned Rank:* ${randRole}\n│\n└──────────────────────────`, { mentions: [senderId] });
    }

    // ─────────────────────────────────────────────
    // ✍️ 2. TEXT EFFECT COMMANDS
    // ─────────────────────────────────────────────
    if (["fliptext", "smallcaps", "zalgo", "zalgo2", "bubble", "strike", "reverse", "mirror", "animal"].includes(command)) {
      const txt = args.join(" ");
      if (!txt) return await reply(`⚠️ *Usage:* \`.${command} <your text>\``);

      if (command === "fliptext") {
        const flipMap = { 'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ', 'i': 'ı', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd', 'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x', 'y': 'ʎ', 'z': 'z' };
        return await reply(`🙃 ${txt.toLowerCase().split("").reverse().map(c => flipMap[c] || c).join("")}`);
      }

      if (command === "smallcaps") {
        const scMap = { 'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ' };
        return await reply(`🪄 ${txt.toLowerCase().split("").map(c => scMap[c] || c).join("")}`);
      }

      if (command === "bubble") {
        const res = txt.split("").map(c => {
          const code = c.charCodeAt(0);
          return (code >= 65 && code <= 90) ? String.fromCharCode(code + 9333) : (code >= 97 && code <= 122) ? String.fromCharCode(code + 9327) : c;
        }).join("");
        return await reply(`🫧 ${res}`);
      }

      if (command === "strike") return await reply(txt.split("").join("\u0336") + "\u0336");
      if (command === "reverse") return await reply(txt.split("").reverse().join(""));
      if (command === "mirror") return await reply(`🪞 ${txt} | ${txt.split("").reverse().join("")}`);
      if (command === "animal") return await reply(`🐾 💬 *${txt}* 🐶🐱🦊`);

      if (command === "zalgo" || command === "zalgo2") {
        const zalgoChars = ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307', '\u0308', '\u0309', '\u030A'];
        return await reply(`👹 ${txt.split("").map(c => c + zalgoChars[Math.floor(Math.random() * zalgoChars.length)]).join("")}`);
      }
    }

    // ─────────────────────────────────────────────
    // 🎮 3. STATE-ISOLATED MINI GAMES
    // ─────────────────────────────────────────────
    if (["tictactoe", "ttt"].includes(command)) {
      if (!isGroup) return await reply("⚠️ Games are restricted to group chats.");
      global.db.games[chatId] = global.db.games[chatId] || {};
      if (global.db.games[chatId].ttt) {
        return await reply("⚠️ An active TicTacToe game is already running in this chat!");
      }
      global.db.games[chatId].ttt = {
        board: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        turn: senderId,
        active: true
      };
      const b = global.db.games[chatId].ttt.board;
      return await reply(`🎮 *TicTacToe Game Started!*\n\n${b[0]} | ${b[1]} | ${b[2]}\n---------\n${b[3]} | ${b[4]} | ${b[5]}\n---------\n${b[6]} | ${b[7]} | ${b[8]}\n\nReply with a slot number (1-9) to play!`);
    }

    // ─────────────────────────────────────────────
    // ⚙️ 4. SYSTEM DIAGNOSTICS & DASHBOARD
    // ─────────────────────────────────────────────
    if (command === "idcheck") {
      const chatType = isGroup ? "Group Chat" : isStatus ? "Status Broadcast" : isCommunity ? "Community Channel" : "Private Direct Chat";
      return await reply(
        `┌─── 🤖 *ＳＹＳＴＥＭ  ＩＤＥＮＴＩＴＹ* ───\n│\n│ 🤖 *Bot JID:* ${botJid}\n│ 📤 *Sender JID:* ${senderId}\n│ 🔢 *Sender Phone:* +${senderNum}\n│ 👑 *Master Controller:* +${OWNER_NUMBER}\n│ 📌 *Chat Context:* ${chatType}\n│ 🛡️ *Active Mode:* ${global.mode.toUpperCase()}\n│\n└──────────────────────────`
      );
    }

    if (command === "status" || command === "system") {
      const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const uptimeStr = formatUptime(process.uptime());
      return await reply(
        `┌─── ⚙️ *ＳＹＳＴＥＭ  ＳＴＡＴＵＳ* ───\n│\n│ 👑 *Owner:* Shabaan Gill\n│ ⏱️ *Uptime:* ${uptimeStr}\n│ 📊 *RAM Usage:* ${usedRam} MB / ${totalRam} GB\n│ 💻 *Platform:* ${os.platform()} (${os.arch()})\n│ 🟢 *Node.js:* ${process.version}\n│ 🛡️ *Mode:* ${global.mode.toUpperCase()}\n│\n└──────────────────────────`
      );
    }

    if (command === "ping" || command === "speed") {
      const start = Date.now();
      await conn.sendMessage(chatId, { react: { text: global.cmdReaction, key: msg.key } }).catch(() => {});
      return await reply(`🚀 *Response Latency:* \`${Date.now() - start}ms\``);
    }

    if (command === "alive") return await reply("🟢 *SHABAAN GILL-MD core engine is fully operational and online!*");
    if (command === "runtime") return await reply(`⏱️ *Uptime:* \`${formatUptime(process.uptime())}\``);
    if (command === "owner") return await reply("👑 *Master Controller:* Shabaan Gill (+923143007893)");
    if (command === "botname") return await reply("🤖 *Bot Identifier:* SHABAAN GILL-MD v2.0");
    if (command === "intro") return await reply("👋 *Hello! I am SHABAAN GILL-MD, an advanced automated WhatsApp assistant built for high-performance automation.*");
    if (command === "channel") return await reply("📢 *Official Channel:* https://whatsapp.com/channel/0029VaXXXXX");
    if (command === "info" || command === "help") return await reply("💡 *Type `.menu` or `.aimenu` to display the command dashboard.*");

    if (command === "setreact") {
      const emoji = args[0];
      if (!emoji) return await reply("⚠️ *Usage:* `.setreact <emoji>` (e.g., `.setreact 🔥`)");
      global.cmdReaction = emoji;
      return await reply(`✅ *Default Command Reaction updated to:* ${emoji}`);
    }

    if (command === "restart") {
      await reply("🔄 *Restarting SHABAAN GILL-MD core engine...*");
      return process.exit(0);
    }

    if (command === "shutdown") {
      await reply("🛑 *Shutting down SHABAAN GILL-MD process...*");
      return process.exit(1);
    }

    if (command === "setbio") {
      const bioText = args.join(" ");
      if (!bioText) return await reply("⚠️ *Usage:* `.setbio <New Status Text>`");
      await conn.updateProfileStatus(bioText);
      return await reply(`✅ *WhatsApp Bio updated to:* "${bioText}"`);
    }

    if (command === "setname" || command === "changename") {
      const nameText = args.join(" ");
      if (!nameText) return await reply("⚠️ *Usage:* `.setname <New Name>`");
      await conn.updateProfileName(nameText);
      return await reply(`✅ *WhatsApp Profile Name updated to:* "${nameText}"`);
    }

    if (command === "setpp" || command === "cpp") {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted || (!quoted.imageMessage && !quoted.viewOnceMessageV2?.message?.imageMessage)) {
        return await reply("⚠️ *Please reply to an image with `.setpp`!*");
      }
      const targetQuoted = quoted.viewOnceMessageV2?.message || quoted;
      const buffer = await downloadMediaMessage({ message: targetQuoted }, "buffer", {});
      await conn.updateProfilePicture(botJid, buffer);
      return await reply("🖼️ *Profile Picture successfully updated!*");
    }

    // ─────────────────────────────────────────────
    // 🛠️ 5. EXPLOITS & DIAGNOSTICS
    // ─────────────────────────────────────────────
    if (command === "xray") {
      return await reply(`📡 *Network Trace:* Ping: \`${Math.floor(Math.random() * 20 + 10)}ms\` | Hops: 4 | Status: SECURE`);
    }

    if (command === "disk") {
      const free = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      const total = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      return await reply(`💾 *Storage Matrix:* ${free} GB free out of ${total} GB system RAM.`);
    }

    if (command === "rootme") {
      return await reply("🛡️ *Access Granted:* `root@shabaangill-md:~#` [Superuser level active]");
    }

    if (command === "weather") {
      const city = args.join(" ") || "Lahore";
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=3`);
        const text = await res.text();
        return await reply(`🌤️ *Weather Report:* ${text}`);
      } catch (e) {
        return await reply("❌ *Could not fetch weather data.*");
      }
    }

    // ─────────────────────────────────────────────
    // 🛡️ 6. SECURITY & MODERATION
    // ─────────────────────────────────────────────
    if (command === "antibug") {
      const option = (args[0] || "").toLowerCase();
      if (!["on", "off"].includes(option)) {
        return await reply(`📌 *AntiBug:* ${global.antibug ? "ENABLED ✅" : "DISABLED ❌"}\n💬 *Usage:* \`.antibug on\` / \`.antibug off\``);
      }
      global.antibug = option === "on";
      return await reply(`🛡️ *AntiBug Protection:* ${global.antibug ? "ENABLED ✅" : "DISABLED ❌"}`);
    }

    if (["autotyping", "autoread", "autorecording"].includes(command)) {
      const option = (args[0] || "").toLowerCase();
      if (!["on", "off"].includes(option)) {
        return await reply(`📌 *${command.toUpperCase()}:* ${global[command] ? "ENABLED ✅" : "DISABLED ❌"}\n💬 *Usage:* \`.${command} on\` / \`.${command} off\``);
      }
      global[command] = option === "on";
      return await reply(`⚙️ *${command.toUpperCase()}:* ${global[command] ? "ENABLED ✅" : "DISABLED ❌"}`);
    }

    if (command === "block" || command === "sblock" || command === "unblock") {
      await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } }).catch(() => {});
      if (!targetJid || targetJid.includes("@lid")) {
        await conn.sendMessage(chatId, { react: { text: "⚠️", key: msg.key } }).catch(() => {});
        return await reply("⚠️ *Usage Error:* Target user phone JID could not be resolved.");
      }
      if (targetJid === botJid) {
        await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }).catch(() => {});
        return await reply("⚠️ *Action Denied:* The bot cannot block itself!");
      }
      const isBlock = command === "block" || command === "sblock";
      const action = isBlock ? "block" : "unblock";
      try {
        await conn.updateBlockStatus(targetJid, action);
        await conn.sendMessage(chatId, { react: { text: isBlock ? "🚫" : "✅", key: msg.key } }).catch(() => {});
        const targetNumber = targetJid.split("@")[0];
        return conn.sendMessage(chatId, { text: `✅ *User @${targetNumber} ${action}ed successfully.*`, mentions: [targetJid] }, { quoted: msg });
      } catch (err) {
        console.error(`❌ [${action.toUpperCase()} ERROR]:`, err);
        return await reply(`❌ *Execution Failed:* Unable to ${action} user.`);
      }
    }

    if (command === "blocklist" || command === "listblock") {
      try {
        const blocklist = await conn.fetchBlocklist();
        if (!blocklist || blocklist.length === 0) return await reply("📋 *Blocklist is currently empty.*");
        let caption = `┌─── 📜 *ＢＬＯＣＫＥＤ  ＣＯＮＴＡＣＴＳ* (${blocklist.length}) ───\n│\n`;
        blocklist.forEach((jid, index) => { caption += `│ ${index + 1}. @${jid.split("@")[0]}\n`; });
        caption += `│\n└──────────────────────────`;
        return conn.sendMessage(chatId, { text: caption, mentions: blocklist }, { quoted: msg });
      } catch (err) {
        return await reply("❌ *Failed to retrieve blocklist from WhatsApp servers.*");
      }
    }

    // ─────────────────────────────────────────────
    // 👥 7. GROUP MANAGEMENT & MODERATION
    // ─────────────────────────────────────────────
    if (["kick", "add", "promote", "demote", "warn"].includes(command)) {
      if (!isGroup) return await reply("⚠️ *This command can only be used in groups!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use this command!*");
      if (!isBotAdmin) return await reply("❌ *Bot needs Admin privileges to execute group commands!*");
      if (!targetJid || targetJid.includes("@lid")) return await reply("⚠️ *Please tag or reply to a valid target user!*");
      if (targetJid === botJid) return await reply("⚠️ *Cannot execute this action on the bot itself!*");

      if (command === "kick") {
        await conn.groupParticipantsUpdate(chatId, [targetJid], "remove");
        return await reply(`👞 *Removed @${targetJid.split("@")[0]} from the group.*`, { mentions: [targetJid] });
      }
      if (command === "add") {
        await conn.groupParticipantsUpdate(chatId, [targetJid], "add");
        return await reply(`➕ *Added @${targetJid.split("@")[0]} to the group.*`, { mentions: [targetJid] });
      }
      if (command === "promote") {
        await conn.groupParticipantsUpdate(chatId, [targetJid], "promote");
        return await reply(`👑 *Promoted @${targetJid.split("@")[0]} to Admin.*`, { mentions: [targetJid] });
      }
      if (command === "demote") {
        await conn.groupParticipantsUpdate(chatId, [targetJid], "demote");
        return await reply(`📉 *Demoted @${targetJid.split("@")[0]} from Admin.*`, { mentions: [targetJid] });
      }
      if (command === "warn") {
        global.warns[targetJid] = (global.warns[targetJid] || 0) + 1;
        const count = global.warns[targetJid];
        if (count >= 3) {
          global.warns[targetJid] = 0;
          await conn.groupParticipantsUpdate(chatId, [targetJid], "remove");
          return await reply(`🚨 *@${targetJid.split("@")[0]} reached 3 warnings and was kicked!*`, { mentions: [targetJid] });
        }
        return await reply(`⚠️ *@${targetJid.split("@")[0]} has been warned! (${count}/3)*`, { mentions: [targetJid] });
      }
    }

    if (command === "promoteall") {
      if (!isGroup) return await reply("⚠️ *This command can only be used in groups!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use this command!*");
      if (!isBotAdmin) return await reply("❌ *Bot needs Admin privileges to execute group commands!*");
      const members = groupParticipants.filter(p => !groupAdmins.includes(p.id)).map(p => p.id);
      if (!members.length) return await reply("⚠️ *All members are already Admins!*");
      await conn.groupParticipantsUpdate(chatId, members, "promote");
      return await reply(`👑 *Promoted all ${members.length} members to Admins!*`);
    }

    if (command === "demoteall") {
      if (!isGroup) return await reply("⚠️ *This command can only be used in groups!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use this command!*");
      if (!isBotAdmin) return await reply("❌ *Bot needs Admin privileges to execute group commands!*");
      const adminsToDemote = groupAdmins.filter(id => id !== botJid && id !== OWNER_JID);
      if (!adminsToDemote.length) return await reply("⚠️ *No admins to demote!*");
      await conn.groupParticipantsUpdate(chatId, adminsToDemote, "demote");
      return await reply(`📉 *Demoted ${adminsToDemote.length} admins!*`);
    }

    if (command === "kickall" || command === "adminkill") {
      if (!isGroup) return await reply("⚠️ *This command can only be used in groups!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use this command!*");
      if (!isBotAdmin) return await reply("❌ *Bot needs Admin privileges to execute group commands!*");
      const targets = groupParticipants.filter(p => !groupAdmins.includes(p.id) && p.id !== OWNER_JID).map(p => p.id);
      await conn.groupParticipantsUpdate(chatId, targets, "remove");
      return await reply(`💀 *Purged ${targets.length} non-admin members!*`);
    }

    if (command === "open") {
      if (!isGroup) return await reply("⚠️ *This command can only be used in groups!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use this command!*");
      if (!isBotAdmin) return await reply("❌ *Bot needs Admin privileges to execute group commands!*");
      await conn.groupSettingUpdate(chatId, "not_announcement");
      return await reply("🔓 *Group opened! All participants can now send messages.*");
    }

    if (command === "close") {
      if (!isGroup) return await reply("⚠️ *This command can only be used in groups!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use this command!*");
      if (!isBotAdmin) return await reply("❌ *Bot needs Admin privileges to execute group commands!*");
      await conn.groupSettingUpdate(chatId, "announcement");
      return await reply("🔒 *Group closed! Only admins can send messages.*");
    }

    if (command === "closetime") {
      if (!isGroup) return await reply("⚠️ *This command can only be used in groups!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use this command!*");
      if (!isBotAdmin) return await reply("❌ *Bot needs Admin privileges to execute group commands!*");
      const minutes = parseInt(args[0]);
      if (isNaN(minutes)) return await reply("⚠️ *Usage:* `.closetime <minutes>`");
      await reply(`⏱️ *Group will be closed in ${minutes} minute(s).*`);
      setTimeout(async () => {
        await conn.groupSettingUpdate(chatId, "announcement").catch(() => {});
        conn.sendMessage(chatId, { text: "🔒 *Group auto-closed by timer.*" });
      }, minutes * 60000);
      return;
    }

    if (command === "leave") {
      if (!isGroup) return await reply("⚠️ *Group command only!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can command the bot to leave!*");
      await reply("👋 *Leaving group...*");
      return await conn.groupLeave(chatId);
    }

    if (command === "tagall" || command === "hidetag") {
      if (!isGroup) return await reply("⚠️ *Group command only!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can use tag commands!*");
      const customMsg = args.join(" ") || "📢 *Attention Everyone!*";
      const mentions = groupParticipants.map(p => p.id);
      if (command === "hidetag") return await conn.sendMessage(chatId, { text: customMsg, mentions });

      let tagMsg = `┌─── 📢 *ＴＡＧ  ＡＬＬ* ───\n│ 💬 *Message:* ${customMsg}\n│\n`;
      mentions.forEach((m, idx) => { tagMsg += `│ ${idx + 1}. @${m.split("@")[0]}\n`; });
      tagMsg += `└──────────────────────────`;
      return await conn.sendMessage(chatId, { text: tagMsg, mentions });
    }

    if (command === "tagadmin") {
      if (!isGroup) return await reply("⚠️ *Group command only!*");
      let adminMsg = `┌─── 👑 *ＧＲＯＵＰ  ＡＤＭＩＮＳ* ───\n│\n`;
      groupAdmins.forEach((a, idx) => { adminMsg += `│ ${idx + 1}. @${a.split("@")[0]}\n`; });
      adminMsg += `└──────────────────────────`;
      return await conn.sendMessage(chatId, { text: adminMsg, mentions: groupAdmins });
    }

    if (command === "listactive") {
      if (!isGroup) return await reply("⚠️ *Group command only!*");
      return await reply(`📊 *Total Active Group Members:* \`${groupParticipants.length}\``);
    }

    // ─────────────────────────────────────────────
    // 🎵 8. MEDIA DOWNLOADERS
    // ─────────────────────────────────────────────
    if (["video", "ytv", "song", "yta"].includes(command)) {
      const url = args[0];
      if (!url) return await reply(`⚠️ *Usage:* \`.${command} <YouTube URL>\``);

      await conn.sendMessage(chatId, { react: { text: "⏳", key: msg.key } }).catch(() => {});
      await reply("⏳ *Downloading media stream... Please wait.*");

      const isAudioOnly = ["song", "yta"].includes(command);
      const tempExt = isAudioOnly ? "mp3" : "mp4";
      const streamPath = path.join(__dirname, `temp_${Date.now()}.${tempExt}`);

      try {
        if (ytdl && ytdl.validateURL(url)) {
          try {
            const info = await ytdl.getInfo(url);
            const title = info.videoDetails.title || "YouTube Media";

            const videoStream = ytdl(url, {
              filter: isAudioOnly ? "audioonly" : "audioandvideo",
              quality: isAudioOnly ? "highestaudio" : "highestvideo",
              requestOptions: {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
              }
            });

            const fileStream = fs.createWriteStream(streamPath);
            videoStream.pipe(fileStream);

            const downloadPromise = new Promise((resolve, reject) => {
              fileStream.on("finish", resolve);
              videoStream.on("error", reject);
              fileStream.on("error", reject);
            });

            await downloadPromise;

            const stats = fs.statSync(streamPath);
            if (stats.size / (1024 * 1024) > 99) {
              return await reply("❌ *Media file exceeds WhatsApp limit (100MB).*");
            }

            if (isAudioOnly) {
              await conn.sendMessage(
                chatId,
                { audio: fs.readFileSync(streamPath), mimetype: "audio/mp4", ptt: false },
                { quoted: msg }
              );
            } else {
              await conn.sendMessage(
                chatId,
                {
                  video: fs.readFileSync(streamPath),
                  caption: `🎥 *${title}*\n\n⚡ *Downloaded via SHABAAN GILL-MD*`
                },
                { quoted: msg }
              );
            }

            return await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }).catch(() => {});
          } catch (err) {
            console.warn("⚠️ ytdl-core stream error or HTTP 410 block, trying high-availability APIs...");
          }
        }

        try {
          const apiUrl = `https://api.vreden.my.id/api/${isAudioOnly ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(url)}`;
          const res = await fetch(apiUrl);
          const json = await res.json();

          if (json.status && json.result) {
            const downloadUrl = json.result.download?.url || json.result.download || json.result.url;
            const videoTitle = json.result.title || "YouTube Media";

            if (downloadUrl) {
              if (isAudioOnly) {
                await conn.sendMessage(
                  chatId,
                  { audio: { url: downloadUrl }, mimetype: "audio/mp4", ptt: false },
                  { quoted: msg }
                );
              } else {
                await conn.sendMessage(
                  chatId,
                  {
                    video: { url: downloadUrl },
                    caption: `🎥 *${videoTitle}*\n\n⚡ *Downloaded via SHABAAN GILL-MD*`
                  },
                  { quoted: msg }
                );
              }
              return await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }).catch(() => {});
            }
          }
        } catch (apiErr) {
          console.warn("⚠️ API Fallback 1 failed:", apiErr.message);
        }

        return await executeYtdlpFallback(url, streamPath, command, chatId, msg, conn, reply);
      } finally {
        if (fs.existsSync(streamPath)) {
          try { fs.unlinkSync(streamPath); } catch (e) {}
        }
      }
    }

    if (command === "song2" || command === "video2") {
      const query = args.join(" ");
      if (!query) return await reply(`⚠️ *Usage:* \`.${command} <Song Name or YouTube URL>\``);
      await conn.sendMessage(chatId, { react: { text: "🔎", key: msg.key } }).catch(() => {});

      try {
        const api = `https://api.vreden.my.id/api/${command === "song2" ? "ytmp3" : "ytmp4"}?url=${encodeURIComponent(query)}`;
        const res = await fetch(api);
        const json = await res.json();

        if (!json.status || !json.result) {
          return await reply("❌ *Could not fetch media content. Try another keyword.*");
        }

        const isAudio = command === "song2";
        const mediaUrl = json.result.download?.url || json.result.download || json.result.url;

        if (isAudio) {
          await conn.sendMessage(chatId, { audio: { url: mediaUrl }, mimetype: "audio/mp4", ptt: false }, { quoted: msg });
        } else {
          await conn.sendMessage(chatId, { video: { url: mediaUrl }, caption: `🎬 *${json.result.title || "Downloaded Video"}*\n\n⚡ *Downloaded via SHABAAN GILL-MD*` }, { quoted: msg });
        }
        return await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (err) {
        console.error("Downloader Error:", err);
        return await reply("❌ *Failed to download media stream. Please try again later.*");
      }
    }

    // ─────────────────────────────────────────────
    // 📬 9. MESSAGING & UNLOCKER TOOLS
    // ─────────────────────────────────────────────
    if (command === "vv" || command === "vv2") {
      try { await conn.sendMessage(chatId, { delete: msg.key }); } catch (e) {}

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        if (command === "vv") return await reply("⚠️ *Reply directly to a media or View-Once message!*");
        await conn.sendMessage(chatId, { react: { text: "⚠️", key: msg.key } }).catch(() => {});
        return;
      }

      let targetMsg = quoted;
      if (quoted.viewOnceMessageV2?.message) targetMsg = quoted.viewOnceMessageV2.message;
      else if (quoted.viewOnceMessage?.message) targetMsg = quoted.viewOnceMessage.message;
      else if (quoted.viewOnceMessageV2Extension?.message) targetMsg = quoted.viewOnceMessageV2Extension.message;

      const mediaType = Object.keys(targetMsg).find(key => 
        ["imageMessage", "videoMessage", "audioMessage", "documentMessage"].includes(key)
      );
      const mediaContent = mediaType ? targetMsg[mediaType] : null;

      if (!mediaContent || !mediaContent.mimetype) {
        if (command === "vv") return await reply("❌ *Quoted message does not contain valid downloadable media.*");
        await conn.sendMessage(chatId, { react: { text: "❌", key: msg.key } }).catch(() => {});
        return;
      }

      const mime = mediaContent.mimetype;
      const caption = mediaContent.caption || "🔓 *Unlocked Media*";
      const buffer = await downloadMediaMessage(
        { message: targetMsg }, "buffer", {}, { logger: console, reuploadRequest: conn.updateMediaMessage }
      );

      const destJid = command === "vv2" ? OWNER_JID : chatId;

      if (/image/.test(mime)) await conn.sendMessage(destJid, { image: buffer, caption });
      else if (/video/.test(mime)) await conn.sendMessage(destJid, { video: buffer, caption });
      else if (/audio/.test(mime)) await conn.sendMessage(destJid, { audio: buffer, mimetype: mime, ptt: false });
      else await conn.sendMessage(destJid, { document: buffer, mimetype: mime, fileName: "unlocked_media" });

      if (command === "vv2") {
        await conn.sendMessage(chatId, { react: { text: "🕵️", key: msg.key } }).catch(() => {});
      }
      return;
    }

    if (command === "del") {
      const quoted = msg.message?.extendedTextMessage?.contextInfo;
      if (!quoted) return await reply("⚠️ *Reply to the message you want to delete!*");
      return await conn.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: quoted.participant === botJid, id: quoted.stanzaId, participant: quoted.participant } });
    }

    if (command === "save") {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return await reply("⚠️ *Reply to any message to save it to your DM!*");
      await conn.sendMessage(OWNER_JID, { forward: msg });
      return await reply("📬 *Message saved to your Owner DM!*");
    }

    if (command === "join") {
      const link = args[0];
      if (!link || !link.includes("chat.whatsapp.com")) return await reply("⚠️ *Provide a valid WhatsApp group link!*");
      const code = link.split("chat.whatsapp.com/")[1];
      await conn.groupAcceptInvite(code);
      return await reply("✅ *Successfully joined the group!*");
    }

    if (command === "delaymsg") {
      const delaySec = parseInt(args[0]);
      const msgText = args.slice(1).join(" ");
      if (isNaN(delaySec) || !msgText) return await reply("⚠️ *Usage:* `.delaymsg <seconds> <text>`");
      await reply(`⏱️ *Message scheduled in ${delaySec}s...*`);
      setTimeout(() => { conn.sendMessage(chatId, { text: msgText }); }, delaySec * 1000);
      return;
    }

    if (command === "reactch") {
      const emoji = args[0] || "❤️";
      const quoted = msg.message?.extendedTextMessage?.contextInfo;
      if (!quoted) return await reply("⚠️ *Reply to a message to react!*");
      return await conn.sendMessage(chatId, { react: { text: emoji, key: { remoteJid: chatId, id: quoted.stanzaId, participant: quoted.participant } } });
    }

    if (command === "ghostping") {
      if (!isGroup) return await reply("⚠️ *Group command only!*");
      if (!isUserAdmin && !isOwner) return await reply("❌ *Only Group Admins can ghostping!*");
      const mentions = groupParticipants.map(p => p.id);
      const pingMsg = await conn.sendMessage(chatId, { text: "👻", mentions });
      return await conn.sendMessage(chatId, { delete: pingMsg.key });
    }

    if (command === "numinfo") {
      if (!targetJid || targetJid.includes("@lid")) return await reply("⚠️ *Reply to a user or enter a valid number!*");
      const numClean = targetJid.replace(/\D/g, "");
      return await reply(
        `┌─── 📱 *ＮＵＭＢＥＲ  ＩＮＦＯ* ───\n│\n│ 🔢 *Clean Number:* +${numClean}\n│ 📌 *JID Pattern:* ${targetJid}\n│ 🌐 *Country Code:* +${numClean.slice(0, 2)}\n│\n└──────────────────────────`
      );
    }

    // ─────────────────────────────────────────────
    // 🎭 10. EXTENDED MENU COMMANDS MODULE HANDLER
    // ─────────────────────────────────────────────
    if (handleMenuCommands && typeof handleMenuCommands === "function") {
      const handled = await handleMenuCommands({ conn, msg, command, rawCmd, args, chatId, senderId, reply });
      if (handled) return; 
    }

    if (command === "menu" || menuCache.has(command)) {
      const menuText = menuCache.get(command) || menuData["menu"] || menuData["main"];
      if (menuText) return await conn.sendMessage(chatId, { text: menuText }, { quoted: msg });
    }

    if (command === "antidelete" && toggleAntidelete) {
      return toggleAntidelete({ conn, m: msg, args, reply, jid: chatId });
    }

    if (core && core[command] && typeof core[command] === "function") {
      return await core[command]({ conn, m: msg, args, command, jid: chatId, isGroup, isStatus, isCommunity, isPrivate, sender: senderId, isOwner, reply });
    }

    const possiblePaths = [
      path.join(__dirname, "..", `${command}.js`),
      path.join(__dirname, `${command}.js`),
      path.join(__dirname, "..", "commands", `${command}.js`),
      path.join(__dirname, "commands", `${command}.js`)
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try { 
          const resolvedPath = require.resolve(filePath);
          if (require.cache[resolvedPath]) delete require.cache[resolvedPath];
        } catch (e) {}
        const commandFile = require(filePath);
        const execContext = { conn, m: msg, args, command, jid: chatId, isGroup, isStatus, isCommunity, isPrivate, sender: senderId, isOwner, reply };
        if (typeof commandFile === "function") return await commandFile(execContext);
        if (typeof commandFile.run === "function") return await commandFile.run(execContext);
      }
    }

    return await reply("❓ *Unknown command!* Type `.menu` or `.aimenu` to view all available commands.");

  } catch (err) {
    console.error("⚠️ Command Execution Error:", err);
    return await reply("⚠️ *An error occurred while executing this command.*");
  }
}

// Helper: YouTube DL Fallback Engine
async function executeYtdlpFallback(url, outputPath, command, chatId, msg, conn, reply) {
  if (!ytdlp) {
    return await reply("❌ *Unable to process YouTube link due to YouTube anti-bot restrictions.*");
  }

  try {
    const isAudioOnly = ["song", "yta"].includes(command);
    
    await ytdlp(url, {
      output: outputPath,
      format: isAudioOnly ? "bestaudio/best" : "mp4[height<=720]+bestaudio/best[height<=720]/best",
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true
    });

    if (!fs.existsSync(outputPath)) {
      return await reply("❌ *Failed to save downloaded YouTube stream.*");
    }

    const stats = fs.statSync(outputPath);
    if (stats.size / (1024 * 1024) > 99) {
      return await reply("❌ *Media file exceeds WhatsApp limit (100MB).*");
    }

    if (isAudioOnly) {
      await conn.sendMessage(
        chatId,
        { audio: fs.readFileSync(outputPath), mimetype: "audio/mp4", ptt: false },
        { quoted: msg }
      );
    } else {
      await conn.sendMessage(
        chatId,
        {
          video: fs.readFileSync(outputPath),
          caption: `🎥 *Downloaded Video*\n\n⚡ *Downloaded via SHABAAN GILL-MD*`
        },
        { quoted: msg }
      );
    }

    await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } }).catch(() => {});
  } catch (e) {
    console.error("❌ Fallback yt-dlp error:", e.message);
    return await reply("❌ *Failed to process YouTube stream via fallback engine.*");
  } finally {
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch (e) {}
    }
  }
}

module.exports = { handleCommand };

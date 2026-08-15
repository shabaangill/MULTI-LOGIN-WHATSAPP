const axios = require("axios");

/**
 * Enterprise-Grade ChatGPT / AI Command Handler
 * Features:
 *  1. Custom API Key Support (OpenAI / Compatible Gateways)
 *  2. 3-Tier Fallback System (Pollinations -> Popcat -> Vyturex)
 *  3. Anti-WAF Spoofing Headers (Bypasses Datacenter IP Blocks)
 *  4. In-Place Message Editing with Graceful Failure Handling
 */
module.exports = async function chatgpt({ conn, m, args, jid, reply }) {
  const query = args.join(" ").trim();

  if (!query) {
    return reply(
      "💬 *Usage:* `.chatgpt <your question>`\n\n*Example:* `.chatgpt Write a 2-line motivational quote`"
    );
  }

  // 1. Dispatch initial status indicator
  let loadingMsg;
  try {
    loadingMsg = await conn.sendMessage(
      jid,
      { text: "⏳ *Thinking...* 🤔" },
      { quoted: m }
    );
  } catch (err) {
    console.error("⚠️ Failed to dispatch loading message:", err.message);
  }

  // Standard request headers to prevent WAF / Cloudflare blocks on host servers
  const httpHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  let aiResponse = "";
  const apiKey = process.env.OPENAI_API_KEY || global.settings?.openaiKey;

  // 🔴 TIER 0: Official OpenAI API (Executed if key exists in env or settings)
  if (apiKey) {
    try {
      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a concise, helpful assistant." },
            { role: "user", content: query },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 15000,
        }
      );
      aiResponse = res.data?.choices?.[0]?.message?.content?.trim();
    } catch (err) {
      console.warn("⚠️ Tier 0 (OpenAI Key) failed:", err.message);
    }
  }

  // 🟢 TIER 1: Pollinations AI Gateway
  if (!aiResponse) {
    try {
      const res = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(query)}?model=openai`,
        { headers: httpHeaders, timeout: 12000 }
      );
      if (res.data && typeof res.data === "string" && res.data.trim().length > 0) {
        aiResponse = res.data.trim();
      }
    } catch (err) {
      console.warn("⚠️ Tier 1 (Pollinations) failed:", err.message);
    }
  }

  // 🟡 TIER 2: Popcat Chatbot Gateway
  if (!aiResponse) {
    try {
      const res = await axios.get(
        `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(query)}&owner=Shabaan&botname=Bot`,
        { headers: httpHeaders, timeout: 10000 }
      );
      if (res.data && res.data.response) {
        aiResponse = res.data.response.trim();
      }
    } catch (err) {
      console.warn("⚠️ Tier 2 (Popcat) failed:", err.message);
    }
  }

  // 🔵 TIER 3: Vyturex Gateway
  if (!aiResponse) {
    try {
      const res = await axios.get(
        `https://api.vyturex.com/chatgpt?query=${encodeURIComponent(query)}`,
        { headers: httpHeaders, timeout: 10000 }
      );
      if (res.data && res.data.result) {
        aiResponse = res.data.result.trim();
      }
    } catch (err) {
      console.warn("⚠️ Tier 3 (Vyturex) failed:", err.message);
    }
  }

  // 📤 Deliver Output
  if (aiResponse) {
    const formattedResponse = `🤖 *AI Response:*\n\n${aiResponse}`;

    if (loadingMsg?.key) {
      return await conn.sendMessage(jid, {
        text: formattedResponse,
        edit: loadingMsg.key,
      });
    }
    return await reply(formattedResponse);
  }

  // 🛑 Error Handler (Reaches here only if ALL tiers fail or time out)
  const failureMessage =
    "❌ *ChatGPT Service Unavailable*\n\nAll public AI gateways are currently blocking requests from this host IP. To fix this permanently, add a free/paid `OPENAI_API_KEY` to your `settings.js` or environment variables.";

  if (loadingMsg?.key) {
    await conn.sendMessage(jid, { text: failureMessage, edit: loadingMsg.key });
  } else {
    await reply(failureMessage);
  }
};

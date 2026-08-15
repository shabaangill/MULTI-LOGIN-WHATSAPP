// 📂 File: menu_commands.js
// 🛠️ Extended Menu Handler — Complete Feature Suite

const axios = require("axios");

// In-Memory Game States
const activeGames = new Map();

/**
 * Helper to fetch anime/reaction image URL across multiple APIs with fallback
 */
async function fetchAnimeMedia(cmd) {
  const cleanCmd = cmd.toLowerCase();

  // Waifu.pics SFW mapping table
  const waifuPicsMap = {
    "kill": "kill", "pat": "pat", "cry": "cry", "hug": "hug", "kiss": "kiss", 
    "slap": "slap", "sad": "cry", "bite": "bite", "baka": "bonk", "smile": "smile", 
    "love": "hug", "waifu": "waifu", "neko": "neko", "neko2": "neko", "cuddle": "cuddle",
    "animehug": "hug", "animekiss": "kiss", "animegirl": "waifu", "blush": "blush",
    "shinobu": "shinobu", "megumin": "megumin"
  };

  const endpoint = waifuPicsMap[cleanCmd] || "waifu";

  // Try Primary API: Waifu.pics
  try {
    const res = await axios.get(`https://api.waifu.pics/sfw/${endpoint}`, { timeout: 5000 });
    if (res.data && res.data.url) return res.data.url;
  } catch (err) {}

  // Try Secondary API: Nekos.best
  try {
    const nekosRes = await axios.get(`https://nekos.best/api/v2/neko`, { timeout: 5000 });
    if (nekosRes.data?.results?.[0]?.url) return nekosRes.data.results[0].url;
  } catch (err) {}

  // Try Tertiary API: Waifu.im
  try {
    const imRes = await axios.get("https://api.waifu.im/search?is_nsfw=false", { timeout: 5000 });
    if (imRes.data?.images?.[0]?.url) return imRes.data.images[0].url;
  } catch (err) {}

  // Emergency CDN Fallback
  return "https://i.imgur.com/83pA8yM.jpeg";
}

/**
 * Main Command Processing Function
 */
async function handleMenuCommands({ conn, msg, command, args, chatId, senderId, reply }) {
  try {
    const cmd = (command || "").toLowerCase();

    // ─────────────────────────────────────────────
    // 🖼️ 1. PHOTO MENU
    // ─────────────────────────────────────────────
    const photoCommands = [
      "art", "wallpaper", "gamewallpaper", "cyber", "gremory", 
      "hacker", "hestia", "jibril", "rose", "technology", 
      "pubg", "freefire", "mountain", "islamic", "dog", "lmgoat"
    ];

    if (photoCommands.includes(cmd)) {
      await conn.sendMessage(chatId, { react: { text: "🖼️", key: msg.key } }).catch(() => {});
      
      const seed = encodeURIComponent(cmd + Math.random().toString(36).substring(7));
      const imageUrl = `https://picsum.photos/seed/${seed}/1280/720`;

      await conn.sendMessage(
        chatId, 
        { 
          image: { url: imageUrl }, 
          caption: `┌─── 🖼️ *ＨＤ  ＷＡＬＬＰＡＰＥＲ* ───\n│\n│ 🎯 *Category:* \`${cmd.toUpperCase()}\`\n│ 📐 *Resolution:* 1280x720 High-Res\n│ 👤 *Requested By:* @${senderId.split("@")[0]}\n│\n└──────────────────────────`,
          mentions: [senderId]
        }, 
        { quoted: msg }
      );
      return true;
    }

    // ─────────────────────────────────────────────
    // 💫 2. REACT MENU
    // ─────────────────────────────────────────────
    const reactCommands = [
      "kill", "pat", "cry", "hug", "kiss", "slap", "sad", "bite", "baka", "smile", "love"
    ];

    if (reactCommands.includes(cmd)) {
      await conn.sendMessage(chatId, { react: { text: "💫", key: msg.key } }).catch(() => {});
      const mediaUrl = await fetchAnimeMedia(cmd);

      await conn.sendMessage(
        chatId, 
        { 
          image: { url: mediaUrl }, 
          caption: `┌─── 💫 *ＡＮＩＭＥ  ＲＥＡＣＴＩＯＮ* ───\n│\n│ 📌 *Action:* \`${cmd.toUpperCase()}\`\n│ 👤 *Sender:* @${senderId.split("@")[0]}\n│\n└──────────────────────────`,
          mentions: [senderId]
        }, 
        { quoted: msg }
      );
      return true;
    }

    // ─────────────────────────────────────────────
    // 🎮 3. GAME MENU
    // ─────────────────────────────────────────────
    if (cmd === "tictactoe" || cmd === "ttt") {
      const pos = parseInt(args[0]);
      let game = activeGames.get(chatId);

      if (!game || args[0] === "reset") {
        game = { board: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] };
        activeGames.set(chatId, game);
      }

      if (!pos || pos < 1 || pos > 9) {
        const b = game.board;
        await reply(`┌─── 🎮 *ＴＩＣ - ＴＡＣ - ＴＯＥ* ───\n│\n│  ${b[0]} │ ${b[1]} │ ${b[2]}\n│ ───┼───┼───\n│  ${b[3]} │ ${b[4]} │ ${b[5]}\n│ ───┼───┼───\n│  ${b[6]} │ ${b[7]} │ ${b[8]}\n│\n│ 💬 *Usage:* \`.ttt <position 1-9>\`\n└──────────────────────────`);
        return true;
      }

      if (game.board[pos - 1] === "❌" || game.board[pos - 1] === "⭕") {
        await reply("⚠️ *Position taken! Select an empty slot.*");
        return true;
      }

      game.board[pos - 1] = "❌";

      const available = game.board.map((v, i) => (v !== "❌" && v !== "⭕" ? i : null)).filter(v => v !== null);
      if (available.length > 0) {
        const botMove = available[Math.floor(Math.random() * available.length)];
        game.board[botMove] = "⭕";
      }

      const b = game.board;
      await reply(`┌─── 🎮 *ＴＩＣ - ＴＡＣ - ＴＯＥ* ───\n│\n│  ${b[0]} │ ${b[1]} │ ${b[2]}\n│ ───┼───┼───\n│  ${b[3]} │ ${b[4]} │ ${b[5]}\n│ ───┼───┼───\n│  ${b[6]} │ ${b[7]} │ ${b[8]}\n│\n│ ❌ = You | ⭕ = Bot\n└──────────────────────────`);
      return true;
    }

    if (cmd === "rps") {
      const userChoice = (args[0] || "").toLowerCase();
      const choices = ["rock", "paper", "scissors"];
      if (!choices.includes(userChoice)) {
        await reply("⚠️ *Usage:* `.rps rock` | `.rps paper` | `.rps scissors`");
        return true;
      }

      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      let result = "It's a tie! 👔";

      if (
        (userChoice === "rock" && botChoice === "scissors") ||
        (userChoice === "paper" && botChoice === "rock") ||
        (userChoice === "scissors" && botChoice === "paper")
      ) {
        result = "You won! 🎉";
      } else if (userChoice !== botChoice) {
        result = "Bot won! 🤖";
      }

      await reply(`┌─── 🎮 *ＲＯＣＫ  ＰＡＰＥＲ  ＳＣＩＳＳＯＲＳ* ───\n│\n│ 👤 *You:* \`${userChoice.toUpperCase()}\`\n│ 🤖 *Bot:* \`${botChoice.toUpperCase()}\`\n│\n│ 🏆 *Result:* *${result}*\n└──────────────────────────`);
      return true;
    }

    if (cmd === "flag") {
      const flags = [
        { country: "Pakistan", flag: "🇵🇰" }, { country: "Japan", flag: "🇯🇵" },
        { country: "United Kingdom", flag: "🇬🇧" }, { country: "Turkey", flag: "🇹🇷" },
        { country: "Brazil", flag: "🇧🇷" }, { country: "Canada", flag: "🇨🇦" }
      ];
      const pick = flags[Math.floor(Math.random() * flags.length)];
      await reply(`┌─── 🎌 *ＧＵＥＳＳ  ＴＨＥ  ＦＬＡＧ* ───\n│\n│ 🚩 *Flag:* ${pick.flag}\n│ 💡 *Answer:* || ${pick.country} ||\n└──────────────────────────`);
      return true;
    }

    if (cmd === "math") {
      const num1 = Math.floor(Math.random() * 50) + 1;
      const num2 = Math.floor(Math.random() * 20) + 1;
      const op = ["+", "-", "*"][Math.floor(Math.random() * 3)];
      const ans = eval(`${num1} ${op} ${num2}`);
      await reply(`┌─── 🧮 *ＭＡＴＨ  ＣＨＡＬＬＥＮＧＥ* ───\n│\n│ ❓ *Solve:* \`${num1} ${op} ${num2}\`\n│ 💡 *Answer:* || ${ans} ||\n└──────────────────────────`);
      return true;
    }

    if (cmd === "guessnumber") {
      const secret = Math.floor(Math.random() * 10) + 1;
      const userGuess = parseInt(args[0]);
      if (isNaN(userGuess)) {
        await reply("⚠️ *Usage:* `.guessnumber <1-10>`");
        return true;
      }
      if (userGuess === secret) await reply(`🎉 *BINGO!* The secret number was indeed *${secret}*!`);
      else await reply(`❌ *NOPE!* You guessed *${userGuess}*, but the secret number was *${secret}*.`);
      return true;
    }

    if (cmd === "scramble") {
      const words = [
        { word: "JAVASCRIPT", hint: "Coding Language" },
        { word: "WHATSAPP", hint: "Chat App" },
        { word: "DEVELOPER", hint: "Creator" }
      ];
      const pick = words[Math.floor(Math.random() * words.length)];
      const scrambled = pick.word.split('').sort(() => 0.5 - Math.random()).join('');
      await reply(`┌─── 🧩 *ＷＯＲＤ  ＳＣＲＡＭＢＬＥ* ───\n│\n│ 🔤 *Scrambled:* \`${scrambled}\`\n│ 💡 *Hint:* ${pick.hint}\n│ 💡 *Answer:* || ${pick.word} ||\n└──────────────────────────`);
      return true;
    }

    if (cmd === "riddle") {
      await reply(`┌─── ❓ *ＲＩＤＤＬＥ  ＴＩＭＥ* ───\n│\n│ ❓ *Question:* What has hands, but can’t clap?\n│ 💡 *Answer:* || A Clock ||\n└──────────────────────────`);
      return true;
    }

    if (cmd === "emoji") {
      const emojis = ["🍎", "🚀", "🍕", "🎮", "⚽", "🐱", "💎"];
      const pick = emojis[Math.floor(Math.random() * emojis.length)];
      await reply(`┌─── 🎨 *ＥＭＯＪＩ  ＧＵＥＳＳ* ───\n│\n│ 🎯 *Emoji:* ${pick}\n│\n└──────────────────────────`);
      return true;
    }

    // ─────────────────────────────────────────────
    // 🎉 4. FUN MENU
    // ─────────────────────────────────────────────
    if (cmd === "joke") {
      try {
        const res = await axios.get("https://official-joke-api.appspot.com/random_joke", { timeout: 5000 });
        await reply(`┌─── 😂 *ＪＯＫＥ  ＴＩＭＥ* ───\n│\n│ 💬 ${res.data.setup}\n│ 🤣 *${res.data.punchline}*\n│\n└──────────────────────────`);
      } catch (e) {
        await reply("😂 Why don't scientists trust atoms? Because they make up everything!");
      }
      return true;
    }

    if (cmd === "meme") {
      try {
        const res = await axios.get("https://meme-api.com/gimme", { timeout: 5000 });
        if (res.data?.url) {
          await conn.sendMessage(chatId, { image: { url: res.data.url }, caption: `🎉 *Meme:* ${res.data.title}` }, { quoted: msg });
          return true;
        }
      } catch (e) {}
      await reply("😂 *Meme:* Me running my WhatsApp Bot without errors: 😎⚡");
      return true;
    }

    if (cmd === "anime") {
      const mediaUrl = await fetchAnimeMedia("waifu");
      await conn.sendMessage(chatId, { image: { url: mediaUrl }, caption: "⛩️ *Featured Anime Art*" }, { quoted: msg });
      return true;
    }

    if (cmd === "quote") {
      const quotes = [
        "Code is like humor. When you have to explain it, it’s bad.",
        "Simplicity is the soul of efficiency.",
        "Make it work, make it right, make it fast."
      ];
      await reply(`💬 *Quote:* "${quotes[Math.floor(Math.random() * quotes.length)]}"`);
      return true;
    }

    if (cmd === "truthordare" || cmd === "tod") {
      const choice = (args[0] || "").toLowerCase();
      if (choice === "truth") await reply("📜 *TRUTH:* What is your biggest fear?");
      else if (choice === "dare") await reply("🔥 *DARE:* Change your WhatsApp profile picture to a potato for 1 hour!");
      else await reply("⚠️ *Usage:* `.tod truth` or `.tod dare`");
      return true;
    }

    if (cmd === "eightball" || cmd === "8ball") {
      const question = args.join(" ");
      if (!question) {
        await reply("⚠️ *Usage:* `.8ball Will I achieve my goals?`");
        return true;
      }
      const choices = ["Yes, definitely! ✨", "It is decidedly so. 🔮", "Reply hazy, try again. 🌫️", "Don't count on it. ❌"];
      await reply(`🎱 *Question:* ${question}\n🔮 *Answer:* *${choices[Math.floor(Math.random() * choices.length)]}*`);
      return true;
    }

    if (cmd === "roast") {
      const roasts = [
        "Your secrets are always safe with me. I never even listen when you tell me them.",
        "You bring everyone so much joy... when you leave the room."
      ];
      await reply(`🔥 *Roast:* ${roasts[Math.floor(Math.random() * roasts.length)]}`);
      return true;
    }

    if (cmd === "fact" || cmd === "historyfact") {
      try {
        const res = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random", { timeout: 5000 });
        await reply(`💡 *Fact:* ${res.data.text}`);
      } catch (e) {
        await reply("💡 Honey never spoils. 3,000-year-old honey found in Egyptian tombs is still edible!");
      }
      return true;
    }

    if (cmd === "captions") {
      await reply("📝 *Caption:* 'Living life one commit at a time. 🚀✨'");
      return true;
    }

    if (cmd === "trivia") {
      try {
        const res = await axios.get("https://opentdb.com/api.php?amount=1&type=multiple", { timeout: 5000 });
        if (res.data?.results?.[0]) {
          const q = res.data.results[0];
          await reply(`┌─── 🧠 *ＴＲＩＶＩＡ  ＱＵＩＺ* ───\n│\n│ 📂 *Category:* ${q.category}\n│ ❓ *Question:* ${q.question}\n│\n│ 💡 *Answer:* || ${q.correct_answer} ||\n└──────────────────────────`);
          return true;
        }
      } catch (err) {}
      await reply("🧠 *Trivia:* Which planet is known as the Red Planet?\n\n💡 *Answer:* Mars");
      return true;
    }

    // ─────────────────────────────────────────────
    // ⛩️ 5. ANIME MENU (Covers all 46 commands in menu)
    // ─────────────────────────────────────────────
    const animeCommands = [
      "waifu", "neko", "neko2", "akiyama", "asuna", "ayuzawa", "boruto", "ana", 
      "art", "bts", "cartoon", "chiho", "chitoge", "cosplay", "cosplayloli", 
      "cosplaysagiri", "cyber", "deidara", "doraemon", "elena", "emilia", "erza", 
      "exo", "gamewallpaper", "hinata", "husbu", "itachi", "itachiuchiha", "itori", 
      "jojo", "mikasa", "nezuko", "yumeko", "zerotwo", "kitsune", "kurumi", "blush", 
      "rem", "animehug", "animekiss", "cuddle", "animegirl", "shina", "megumin", "luffy"
    ];

    if (animeCommands.includes(cmd)) {
      await conn.sendMessage(chatId, { react: { text: "🌸", key: msg.key } }).catch(() => {});
      const mediaUrl = await fetchAnimeMedia(cmd);

      await conn.sendMessage(
        chatId, 
        { 
          image: { url: mediaUrl }, 
          caption: `┌─── 🌸 *ＡＮＩＭＥ  ＣＯＬＬＥＣＴＩＯＮ* ───\n│\n│ 📌 *Tag:* \`${cmd.toUpperCase()}\`\n│ 👤 *Requested By:* @${senderId.split("@")[0]}\n│\n└──────────────────────────`,
          mentions: [senderId]
        }, 
        { quoted: msg }
      );
      return true;
    }

    // Command not listed in menu_commands.js
    return false;

  } catch (err) {
    console.error("❌ Error inside menu_commands.js:", err);
    return false;
  }
}

module.exports = { handleMenuCommands };

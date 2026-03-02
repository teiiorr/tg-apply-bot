const { BOT_TOKEN, ADMIN_CHAT_ID } = require("./env");

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function telegram(method, body) {
  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram API error: ${response.status} ${text}`);
  }

  return response.json();
}

async function sendMessage(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra,
  });
}

async function sendAdminMessage(text, extra = {}) {
  return sendMessage(ADMIN_CHAT_ID, text, extra);
}

async function sendAdminDocument(fileId, caption) {
  return telegram("sendDocument", {
    chat_id: ADMIN_CHAT_ID,
    document: fileId,
    caption,
    parse_mode: "HTML",
  });
}

module.exports = {
  telegram,
  sendMessage,
  sendAdminMessage,
  sendAdminDocument,
};
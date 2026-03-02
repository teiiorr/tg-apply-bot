const { telegram, sendMessage } = require("./telegram");
const { handleMessage } = require("./bot");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startPolling() {
  let offset = 0;

  console.log("tg-apply-bot: polling started");

  while (true) {
    try {
      const data = await telegram("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message"],
      });

      for (const update of data.result || []) {
        offset = update.update_id + 1;

        try {
          await handleMessage(update.message);
        } catch (error) {
          console.error("Update handling error:", error);

          const chatId = update?.message?.chat?.id;
          if (chatId) {
            try {
              await sendMessage(
                chatId,
                "❌ Bot ichida xatolik yuz berdi. Iltimos, /apply bilan qayta urinib ko‘ring."
              );
            } catch (nestedError) {
              console.error("Failed to notify user about bot error:", nestedError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
      await sleep(3000);
    }
  }
}

module.exports = { startPolling };
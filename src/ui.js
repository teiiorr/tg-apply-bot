function ok(text) {
  return `✅ ${text}`;
}

function err(text) {
  return `❌ ${text}`;
}

function info(text) {
  return `ℹ️ ${text}`;
}

function header(title) {
  return `✨ <b>${title}</b>`;
}

module.exports = { ok, err, info, header };
const { sendMessage, sendAdminMessage, sendAdminDocument } = require("./telegram");
const { ok, err, info, header } = require("./ui");

const sessions = new Map();

const LABS = {
  screenplay: {
    key: "screenplay",
    label: "🎬 Ssenariy yozish laboratoriyasi",
    adminLabel: "Yusuf Roziqov ssenariy yozish laboratoriyasi",
  },
  voice: {
    key: "voice",
    label: "🎙️ Bolalar ovozi dublyaj maktabi",
    adminLabel: "Mukambar Rahimova “Bolalar ovozi” dublyaj maktabi",
  },
};

const REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg‘ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog‘iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
];

const FILE_FIELDS = [
  {
    key: "assignment1",
    title: "1-topshiriq",
    prompt:
      "📄 <b>1-topshiriq</b>\n\nIltimos, PDF yoki Word (.docx) formatida yuboring.\n\nBolaligingizdagi eng esda qolarli voqea haqida insho (1–2 bet).",
  },
  {
    key: "assignment2",
    title: "2-topshiriq",
    prompt:
      "📄 <b>2-topshiriq</b>\n\nIltimos, PDF yoki Word (.docx) formatida yuboring.\n\n“Vatanparvarlik siz uchun nima?” mavzusidagi esse (1–2 bet).",
  },
  {
    key: "assignment3",
    title: "3-topshiriq",
    prompt:
      "📄 <b>3-topshiriq</b>\n\nIltimos, PDF yoki Word (.docx) formatida yuboring.\n\n“Shum bola” filmiga yozilgan taqriz (1 bet).",
  },
  {
    key: "assignment4",
    title: "4-topshiriq",
    prompt:
      "📄 <b>4-topshiriq</b>\n\nIltimos, PDF yoki Word (.docx) formatida yuboring.\n\n“Sen yetim emassan” filmiga taqriz (1 bet).",
  },
];

const STEPS = {
  labChoice: "labChoice",
  fullName: "fullName",
  age: "age",
  birthDate: "birthDate",
  region: "region",
  phone: "phone",
  occupation: "occupation",
  hasExperience: "hasExperience",
  experienceDirection: "experienceDirection",
  publishedWorksUrl: "publishedWorksUrl",
  motivation: "motivation",
  assignment1: "assignment1",
  assignment2: "assignment2",
  assignment3: "assignment3",
  assignment4: "assignment4",
  done: "done",
};

const SCREENPLAY_STEP_ORDER = [
  STEPS.fullName,
  STEPS.birthDate,
  STEPS.region,
  STEPS.phone,
  STEPS.occupation,
  STEPS.hasExperience,
  // experienceDirection только если hasExperience === yes
  STEPS.publishedWorksUrl,
  STEPS.motivation,
  STEPS.assignment1,
  STEPS.assignment2,
  STEPS.assignment3,
  STEPS.assignment4,
];

const VOICE_STEP_ORDER = [STEPS.fullName, STEPS.age, STEPS.region, STEPS.phone];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function isAllowedDocument(document) {
  const lowerName = String(document?.file_name || "").toLowerCase();
  return lowerName.endsWith(".docx") || lowerName.endsWith(".pdf");
}

function getInitialSession() {
  return {
    step: STEPS.labChoice,
    data: {
      lab: "",
      fullName: "",
      age: "",
      birthDate: "",
      region: "",
      phone: "",
      occupation: "",
      hasExperience: "", // "yes" | "no"
      experienceDirection: "",
      publishedWorksUrl: "",
      motivation: "",
      assignment1: null,
      assignment2: null,
      assignment3: null,
      assignment4: null,
    },
  };
}

function labKeyboard() {
  return {
    keyboard: [[LABS.screenplay.label], [LABS.voice.label]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function regionKeyboard() {
  const rows = [];
  for (let i = 0; i < REGIONS.length; i += 2) rows.push(REGIONS.slice(i, i + 2));
  return { keyboard: rows, resize_keyboard: true, one_time_keyboard: true };
}

function yesNoKeyboard() {
  return { keyboard: [["Ha", "Yo‘q"]], resize_keyboard: true, one_time_keyboard: true };
}

function removeKeyboard() {
  return { remove_keyboard: true };
}

function stepProgress(session) {
  const order = getStepOrder(session);
  const index = order.indexOf(session.step);
  const current = index === -1 ? 1 : index + 1;
  const total = order.length + 1;
  return `📌 Bosqich: <b>${current}/${total}</b>`;
}

function getStepOrder(session) {
  if (session?.data?.lab === LABS.voice.key) return VOICE_STEP_ORDER;
  return SCREENPLAY_STEP_ORDER;
}

async function sendStepPrompt(chatId, step, session) {
  const prefix = session ? `${stepProgress(session)}\n\n` : "";

  switch (step) {
    case STEPS.labChoice:
      await sendMessage(
        chatId,
        ["🎬 Iltimos, qaysi laboratoriyaga ro‘yxatdan o‘tmoqchi ekaningizni tanlang:"].join("\n"),
        { parse_mode: "HTML", reply_markup: labKeyboard() }
      );
      return;

    case STEPS.fullName:
      if (session?.data?.lab === LABS.voice.key) {
        await sendMessage(
          chatId,
          `${prefix}${header("F.I.O.")}\n\n👤 Iltimos, nomzod bolaning to‘liq ism, familiya va otasining ismini kiriting.`,
          { parse_mode: "HTML", reply_markup: removeKeyboard() }
        );
        return;
      }

      await sendMessage(
        chatId,
        `${prefix}${header("F.I.O.")}\n\n👤 Iltimos, to‘liq ism, familiya va otangizning ismini kiriting.`,
        { parse_mode: "HTML", reply_markup: removeKeyboard() }
      );
      return;

    case STEPS.age:
      await sendMessage(chatId, `${prefix}${header("Yoshi")}\n\n🎂 Iltimos, nomzod bolaning yoshini kiriting.`, {
        parse_mode: "HTML",
        reply_markup: removeKeyboard(),
      });
      return;

    case STEPS.birthDate:
      await sendMessage(
        chatId,
        `${prefix}${header("Tug‘ilgan sana")}\n\n📅 Namuna: 01.10.1999`,
        { parse_mode: "HTML", reply_markup: removeKeyboard() }
      );
      return;

    case STEPS.region:
      await sendMessage(
        chatId,
        `${prefix}${header("Hudud")}\n\n📍 Qaysi viloyat yoki shaharda istiqomat qilasiz?`,
        { parse_mode: "HTML", reply_markup: regionKeyboard() }
      );
      return;

    case STEPS.phone:
      await sendMessage(
        chatId,
        `${prefix}${header("Telefon raqam")}\n\n📞 Bog‘lanish uchun telefon raqamingizni kiriting.`,
        { parse_mode: "HTML", reply_markup: removeKeyboard() }
      );
      return;

    case STEPS.occupation:
      await sendMessage(
        chatId,
        `${prefix}${header("Faoliyatingiz")}\n\n💼 Hozirgi vaqtda nima ish bilan shug‘ullanasiz? (Masalan: talaba, o‘qituvchi, jurnalist…)`,
        { parse_mode: "HTML", reply_markup: removeKeyboard() }
      );
      return;

    case STEPS.hasExperience:
      await sendMessage(
        chatId,
        `${prefix}${header("Tajriba")}\n\n🎯 Ilgari ssenariy yozish bo‘yicha tajribangiz bo‘lganmi?`,
        { parse_mode: "HTML", reply_markup: yesNoKeyboard() }
      );
      return;

    case STEPS.experienceDirection:
      await sendMessage(
        chatId,
        `${prefix}${header("Yo‘nalish")}\n\n✍️ Qaysi yo‘nalishda? (Nasr, she’riyat, dramaturgiya, blogerlik…)`,
        { parse_mode: "HTML", reply_markup: removeKeyboard() }
      );
      return;

    case STEPS.publishedWorksUrl:
      await sendMessage(
        chatId,
        `${prefix}${header("Nashr etilgan ishlar")}\n\n🔗 Havola (link) yuboring. Agar yo‘q bo‘lsa, <b>yo‘q</b> deb yozing.`,
        { parse_mode: "HTML", reply_markup: removeKeyboard() }
      );
      return;

    case STEPS.motivation:
      await sendMessage(
        chatId,
        `${prefix}${header("Motivatsiya")}\n\n🌟 Nima sababdan aynan bolalar uchun yozishni istaysiz? (Qisqacha, lekin mazmunli)`,
        { parse_mode: "HTML", reply_markup: removeKeyboard() }
      );
      return;

    case STEPS.assignment1:
      await sendMessage(chatId, `${prefix}${FILE_FIELDS[0].prompt}`, {
        parse_mode: "HTML",
        reply_markup: removeKeyboard(),
      });
      return;

    case STEPS.assignment2:
      await sendMessage(chatId, `${prefix}${FILE_FIELDS[1].prompt}`, {
        parse_mode: "HTML",
        reply_markup: removeKeyboard(),
      });
      return;

    case STEPS.assignment3:
      await sendMessage(chatId, `${prefix}${FILE_FIELDS[2].prompt}`, {
        parse_mode: "HTML",
        reply_markup: removeKeyboard(),
      });
      return;

    case STEPS.assignment4:
      await sendMessage(chatId, `${prefix}${FILE_FIELDS[3].prompt}`, {
        parse_mode: "HTML",
        reply_markup: removeKeyboard(),
      });
      return;

    default:
      return;
  }
}

function getNextStep(step, session) {
  if (step === STEPS.labChoice) {
    return session.data.lab ? getStepOrder(session)[0] : STEPS.labChoice;
  }

  const order = getStepOrder(session);
  const index = order.indexOf(step);

  if (index === -1 || index === order.length - 1) return STEPS.done;

  const nextStep = order[index + 1];
  if (nextStep === STEPS.experienceDirection && session.data.hasExperience !== "yes") {
    return STEPS.publishedWorksUrl;
  }

  return nextStep;
}

async function startApplication(chatId) {
  sessions.set(chatId, getInitialSession());

  await sendMessage(
    chatId,
    [
      "Assalomu alaykum!",
      "",
      "Bolalar kontentini rivojlantirish markazi qoshidagi \"Ijodiy laboratoriyalar\" botiga xush kelibsiz.",
      "",
      "Bu yerda siz o‘zingizga mos laboratoriyani tanlab, ro‘yxatdan o‘tishingiz mumkin.",
      "",
      "Iltimos, savollarga ketma-ket va aniq javob bering.",
      "Ma’lumotlaringiz laboratoriya saralashi uchun muhim.",
      "",
      info("Bekor qilish: /cancel"),
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: labKeyboard() }
  );

  const session = sessions.get(chatId);
  await sendStepPrompt(chatId, STEPS.labChoice, session);
}

async function finishApplication(chatId, session) {
  const { data } = session;
  const isVoice = data.lab === LABS.voice.key;

  const summary = isVoice
    ? [
        "--------------",
        "<b>📥 Yangi ariza (Telegram bot)</b>",
        "--------------",
        `<b>🏫 Laboratoriya:</b> ${escapeHtml(LABS.voice.adminLabel)}`,
        `<b>👤 F.I.O.:</b> ${escapeHtml(data.fullName)}`,
        `<b>🎂 Yoshi:</b> ${escapeHtml(data.age)}`,
        `<b>📍 Hudud:</b> ${escapeHtml(data.region)}`,
        `<b>📞 Telefon:</b> ${escapeHtml(data.phone)}`,
        "--------------",
      ].join("\n")
    : [
    "--------------",
    "<b>📥 Yangi ariza (Telegram bot)</b>",
    "--------------",
    `<b>🏫 Laboratoriya:</b> ${escapeHtml(LABS.screenplay.adminLabel)}`,
    `<b>👤 F.I.O.:</b> ${escapeHtml(data.fullName)}`,
    `<b>📅 Tug‘ilgan sana:</b> ${escapeHtml(data.birthDate)}`,
    `<b>📍 Hudud:</b> ${escapeHtml(data.region)}`,
    `<b>📞 Telefon:</b> ${escapeHtml(data.phone)}`,
    `<b>💼 Faoliyati:</b> ${escapeHtml(data.occupation)}`,
    `<b>🎯 Tajriba bor:</b> ${data.hasExperience === "yes" ? "Ha" : "Yo‘q"}`,
    data.hasExperience === "yes" ? `<b>✍️ Yo‘nalish:</b> ${escapeHtml(data.experienceDirection)}` : null,
    data.publishedWorksUrl ? `<b>🔗 Nashr etilgan ishlar:</b> ${escapeHtml(data.publishedWorksUrl)}` : null,
    "",
    "<b>🌟 Motivatsiya:</b>",
    escapeHtml(data.motivation),
    "--------------",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendAdminMessage(summary, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    if (!isVoice) {
      for (const field of FILE_FIELDS) {
        const file = data[field.key];
        await sendAdminDocument(file.fileId, `${escapeHtml(data.fullName)} | ${field.title}`);
      }
    }

    sessions.delete(chatId);

    const successLines = isVoice
      ? [
          "🎉 <b>Ariza muvaffaqiyatli qabul qilindi!</b>",
          "",
          "Siz yuborgan ma’lumotlar ekspertlar tomonidan ko‘rib chiqiladi.",
          "Saralashdan o‘tgan nomzodlar bilan tez orada bog‘lanamiz.",
        ]
      : [
          "🎉 <b>Ariza muvaffaqiyatli qabul qilindi!</b>",
          "",
          "Siz yuborgan ma’lumotlar ekspertlar tomonidan ko‘rib chiqiladi.",
          "Saralashdan o‘tgan nomzodlar bilan tez orada bog‘lanamiz.",
          "",
          "Bolalar uchun ijod qilish — katta mas’uliyat.",
          "Sizga muvaffaqiyat tilaymiz! 🌟",
        ];

    await sendMessage(chatId, successLines.join("\n"), {
      parse_mode: "HTML",
      reply_markup: removeKeyboard(),
    });
  } catch (error) {
    console.error("Failed to finish application:", error);
    await sendMessage(
      chatId,
      err("Arizani yakunlashda texnik xatolik yuz berdi. Iltimos, /apply bilan qayta urinib ko‘ring."),
      { reply_markup: removeKeyboard() }
    );
  }
}

async function confirmAndAdvance(chatId, message, session) {
  await sendMessage(chatId, ok(message), { reply_markup: removeKeyboard() });

  session.step = getNextStep(session.step, session);

  if (session.step === STEPS.done) {
    await finishApplication(chatId, session);
    return;
  }

  await sendStepPrompt(chatId, session.step, session);
}

async function handleTextStep(chatId, text, session) {
  switch (session.step) {
    case STEPS.labChoice:
      if (text === LABS.screenplay.label) {
        session.data.lab = LABS.screenplay.key;
        await sendMessage(
          chatId,
          [
            "Assalomu alaykum! Bolalar kontentini rivojlantirish markazi hamda kinodramaturg va kinorejissyor Yusuf Roziqovning ssenariy yozish laboratoriyasiga ro‘yxatdan o‘tish botiga xush kelibsiz.",
            "",
            "Bu yerda siz o‘z ijodiy ishlaringizni topshirishingiz va laboratoriya ishtirokchisiga aylanishingiz mumkin.",
          ].join("\n"),
          { parse_mode: "HTML", reply_markup: removeKeyboard() }
        );
        session.step = getNextStep(session.step, session);
        await sendStepPrompt(chatId, session.step, session);
        return;
      }

      if (text === LABS.voice.label) {
        session.data.lab = LABS.voice.key;
        await sendMessage(
          chatId,
          [
            "Siz quyidagi yo‘nalishni tanladingiz:",
            `<b>${escapeHtml(LABS.voice.label)}</b>`,
            "",
            "Assalomu alaykum! Bolalar kontentini rivojlantirish markazi hamda Mukambar Rahimovaning",
            "“Bolalar ovozi” dublyaj maktabiga ro‘yxatdan o‘tish botiga xush kelibsiz.",
          ].join("\n"),
          { parse_mode: "HTML", reply_markup: removeKeyboard() }
        );
        session.step = getNextStep(session.step, session);
        await sendStepPrompt(chatId, session.step, session);
        return;
      }

      await sendMessage(chatId, err("Iltimos, laboratoriyani tugmalar orqali tanlang."));
      return;

    case STEPS.fullName:
      if (text.length < 5) {
        await sendMessage(chatId, err("Iltimos, F.I.O. ni to‘liqroq kiriting."));
        return;
      }
      session.data.fullName = text;
      await confirmAndAdvance(chatId, "F.I.O. qabul qilindi.", session);
      return;

    case STEPS.age: {
      const parsedAge = Number(text);
      if (!Number.isInteger(parsedAge) || parsedAge < 4 || parsedAge > 25) {
        await sendMessage(chatId, err("Yoshni to‘g‘ri kiriting (masalan: 12)."));
        return;
      }
      session.data.age = String(parsedAge);
      await confirmAndAdvance(chatId, "Yosh qabul qilindi.", session);
      return;
    }

    case STEPS.birthDate:
      if (!/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
        await sendMessage(chatId, err("Tug‘ilgan sana noto‘g‘ri formatda. Namuna: 01.10.1999"));
        return;
      }
      session.data.birthDate = text;
      await confirmAndAdvance(chatId, "Tug‘ilgan sana qabul qilindi.", session);
      return;

    case STEPS.region:
      if (!REGIONS.includes(text)) {
        await sendMessage(chatId, err("Iltimos, hududni tugmalar orqali tanlang."));
        return;
      }
      session.data.region = text;
      await confirmAndAdvance(chatId, "Hudud qabul qilindi.", session);
      return;

    case STEPS.phone:
      if (text.replace(/\D/g, "").length < 9) {
        await sendMessage(chatId, err("Telefon raqamini to‘g‘ri kiriting."));
        return;
      }
      session.data.phone = text;
      await confirmAndAdvance(chatId, "Telefon raqam qabul qilindi.", session);
      return;

    case STEPS.occupation:
      if (text.length < 3) {
        await sendMessage(chatId, err("Faoliyat turini aniqroq kiriting."));
        return;
      }
      session.data.occupation = text;
      await confirmAndAdvance(chatId, "Faoliyatingiz qabul qilindi.", session);
      return;

    case STEPS.hasExperience: {
      const normalized = text.toLowerCase();
      if (!["ha", "yo‘q", "yo'q", "yoq"].includes(normalized)) {
        await sendMessage(chatId, err("Iltimos, Ha yoki Yo‘q tugmasini tanlang."));
        return;
      }
      session.data.hasExperience = normalized === "ha" ? "yes" : "no";
      await confirmAndAdvance(chatId, "Javob qabul qilindi.", session);
      return;
    }

    case STEPS.experienceDirection:
      if (text.length < 2) {
        await sendMessage(chatId, err("Yo‘nalishni qisqacha bo‘lsa ham kiriting."));
        return;
      }
      session.data.experienceDirection = text;
      await confirmAndAdvance(chatId, "Yo‘nalish qabul qilindi.", session);
      return;

    case STEPS.publishedWorksUrl:
      const lowered = text.toLowerCase();
      session.data.publishedWorksUrl = lowered === "yo‘q" || lowered === "yo'q" ? "" : text;
      await confirmAndAdvance(chatId, "Ma’lumot qabul qilindi.", session);
      return;

    case STEPS.motivation:
      if (text.length < 10) {
        await sendMessage(chatId, err("Iltimos, javobni biroz to‘liqroq yozing (kamida 1–2 gap)."));
        return;
      }
      session.data.motivation = text;
      await confirmAndAdvance(chatId, "Motivatsiya qabul qilindi.", session);
      return;

    default:
      await sendMessage(chatId, info("Bu bosqichda hujjat yuborish kerak."));
      return;
  }
}

async function handleDocumentStep(chatId, document, session) {
  const fileField = FILE_FIELDS.find((item) => item.key === session.step);

  if (!fileField) {
    await sendMessage(chatId, err("Bu bosqichda hujjat emas, matn yuborilishi kerak."));
    await sendStepPrompt(chatId, session.step, session);
    return;
  }

  if (!isAllowedDocument(document)) {
    await sendMessage(chatId, err("Faqat PDF yoki Word (.docx) formatidagi fayllar qabul qilinadi."));
    return;
  }

  session.data[fileField.key] = {
    fileId: document.file_id,
    fileName: document.file_name,
  };

  await confirmAndAdvance(chatId, `${fileField.title} qabul qilindi.`, session);
}

async function handleMessage(message) {
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();
  const document = message?.document;

  console.log("TEMP CHAT_ID:", chatId);

  if (!chatId) return;

  if (text === "/start") {
    await startApplication(chatId);
    return;
  }

  if (text === "/help") {
    await sendMessage(
      chatId,
      [
        "🧾 <b>Yordam</b>",
        "",
        "Bot arizani bosqichma-bosqich yig‘adi.",
        "",
        "📌 Qoidalar:",
        "• Hudud va Ha/Yo‘q tanlovlari tugmalar orqali beriladi",
        "• Hujjatlar faqat PDF yoki DOCX formatda qabul qilinadi",
        "• Har bir bosqichni ketma-ket to‘ldiring",
        "",
        "Agar xatolik bo‘lsa /cancel qilib qayta boshlashingiz mumkin.",
      ].join("\n"),
      { parse_mode: "HTML" }
    );
    return;
  }

  if (text === "/cancel") {
    sessions.delete(chatId);
    await sendMessage(chatId, ok("Joriy ariza bekor qilindi. Qayta boshlash uchun /apply yozing."), {
      reply_markup: removeKeyboard(),
    });
    return;
  }

  if (text === "/apply") {
    await startApplication(chatId);
    return;
  }

  const session = sessions.get(chatId);

  if (!session) {
    await sendMessage(chatId, info("Ariza topshirish uchun /apply yozing."));
    return;
  }

  if (document) {
    await handleDocumentStep(chatId, document, session);
    return;
  }

  if (text) {
    await handleTextStep(chatId, text, session);
    return;
  }

  await sendMessage(chatId, err("Iltimos, matn yoki hujjat yuboring."));
}

module.exports = { handleMessage };

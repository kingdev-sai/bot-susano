module.exports.config = {
  name: "محرك2",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "لي حواك",
  description: "إرسال رسالة تلقائية بشرط وجود نشاط في المجموعة",
  commandCategory: "إدارة البوت",
  usages: "تفعيل | ايقاف | رسالة [نص] | وقت [30s/0.5m]",
  cooldowns: 0
};

module.exports.languages = {
  "vi": {},
  "en": {}
};

module.exports.onLoad = () => {
  global.motorData2 = global.motorData2 || {};
  global.lastActivity = global.lastActivity || {};
};

module.exports.handleEvent = async function ({ event }) {
  const { threadID, isGroup, senderID } = event;
  if (!isGroup) return;
  // تسجيل آخر نشاط في المجموعة
  if (senderID !== global.config?.BOTID) {
    global.lastActivity[threadID] = Date.now();
  }
};

module.exports.run = async function ({ api, event, args, permssion }) {
  const { threadID, messageID } = event;

  if (permssion < 2) return api.sendMessage("⛔ هذا الأمر خاص بأدمن البوت فقط.", threadID, messageID);
  if (!args[0]) return api.sendMessage(
    "📌 الاستخدام:\nمحرك2 تفعيل\nمحرك2 ايقاف\nمحرك2 رسالة [النص]\nمحرك2 وقت [30s أو 0.5m]",
    threadID, messageID
  );

  if (!global.motorData2[threadID]) {
    global.motorData2[threadID] = {
      status: false,
      message: null,
      time: null,
      interval: null
    };
  }

  const data = global.motorData2[threadID];

  if (args[0] === "رسالة") {
    const msg = args.slice(1).join(" ");
    if (!msg) return api.sendMessage("⚠️ اكتب الرسالة بعد الأمر.", threadID, messageID);
    data.message = msg;
    return api.sendMessage(`✅ تم حفظ الرسالة:\n"${msg}"`, threadID, messageID);
  }

  else if (args[0] === "وقت") {
    const input = args[1];
    if (!input) return api.sendMessage("⚠️ حدد الوقت.\nمثال: محرك2 وقت 30s", threadID, messageID);

    let ms = 0;
    if (input.endsWith("s")) ms = parseFloat(input) * 1000;
    else if (input.endsWith("m")) ms = parseFloat(input) * 60 * 1000;
    else return api.sendMessage("⚠️ استخدم s للثواني أو m للدقائق.", threadID, messageID);

    if (ms < 5000) return api.sendMessage("⚠️ الحد الأدنى 5 ثواني.", threadID, messageID);

    data.time = ms;
    return api.sendMessage(`✅ تم حفظ الوقت: ${input}`, threadID, messageID);
  }

  else if (args[0] === "تفعيل") {
    if (data.status === true) return api.sendMessage("⚠️ المحرك مفعل مسبقاً.", threadID, messageID);
    if (!data.message) return api.sendMessage("⚠️ لم تحدد الرسالة بعد.", threadID, messageID);
    if (!data.time) return api.sendMessage("⚠️ لم تحدد الوقت بعد.", threadID, messageID);

    data.status = true;
    data.interval = setInterval(() => {
      const lastActive = global.lastActivity[threadID];
      if (!lastActive) return;
      // يرسل فقط اذا كان هناك نشاط خلال ضعف وقت المحرك
      if (Date.now() - lastActive < data.time * 2) {
        api.sendMessage(data.message, threadID);
      }
    }, data.time);

    return api.sendMessage(
      `✅ تم تفعيل المحرك الذكي.\n📝 الرسالة: "${data.message}"\n⏱ كل: ${data.time / 1000}s\n🔔 يرسل فقط عند وجود نشاط`,
      threadID, messageID
    );
  }

  else if (args[0] === "ايقاف") {
    if (data.status === false) return api.sendMessage("⚠️ المحرك غير مفعل أصلاً.", threadID, messageID);
    clearInterval(data.interval);
    data.status = false;
    data.interval = null;
    return api.sendMessage("🔴 تم إيقاف المحرك.", threadID, messageID);
  }

  else {
    return api.sendMessage(
      "📌 الاستخدام:\nمحرك2 تفعيل\nمحرك2 ايقاف\nمحرك2 رسالة [النص]\nمحرك2 وقت [30s أو 0.5m]",
      threadID, messageID
    );
  }
};

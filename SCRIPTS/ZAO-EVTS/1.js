module.exports.config = {
  name: "0joinNoti_0",
  eventType: ["log:subscribe"],
  version: "1.0.2",
  credits: "MrTomXxX / ported to AR",
  description: "إشعار انضمام عضو جديد للمجموعة مع صورة/فيديو عشوائي",
  dependencies: {
    "fs-extra": "",
    "path": ""
  }
};

module.exports.onLoad = function () {
  const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
  const { join } = global.nodemodule["path"];

  const cacheDir   = join(__dirname, "cache", "joinGif");
  const randomDir  = join(__dirname, "cache", "joinGif", "randomgif");

  if (!existsSync(cacheDir))  mkdirSync(cacheDir,  { recursive: true });
  if (!existsSync(randomDir)) mkdirSync(randomDir, { recursive: true });
};

module.exports.run = async function ({ api, event, Users, Threads }) {
  const { join } = global.nodemodule["path"];
  const { threadID } = event;

  if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
    api.changeNickname(
      `» ${global.config.PREFIX} « → ${global.config.BOTNAME || "ZAO Bot"}`,
      threadID,
      api.getCurrentUserID()
    );
    return api.sendMessage(
      `▂▃▅▆ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠... 𝟏𝟎𝟎% ▆▅▃▂\n\n تِٰـِۢسِٰـِۢجِٰـِۢيِٰـِۢل ﭑِٰڈِٰـِۢخِٰـِۢﯛل ﭑِٰﻝِٰـِۢﯛِٰـِۢصِٰـِۢﯛل ﭑِٰﻝِٰـِۢﭑِٰفِٰـِۢخِٰـِۢﭑِٰمِٰـِۢة 😈💥🔥`,
      threadID
    );
  }

  try {
    const { createReadStream, existsSync, readdirSync } = global.nodemodule["fs-extra"];
    const moment = require("moment-timezone");
    const time   = moment.tz("Asia/Riyadh").format("DD/MM/YYYY || HH:mm:ss");
    const hours  = parseInt(moment.tz("Asia/Riyadh").format("HH"));

    const greeting =
      hours < 6  ? "منتصف الليل" :
      hours < 12 ? "الصباح" :
      hours < 15 ? "الظهيرة" :
      hours < 19 ? "المساء" :
                   "الليل";

    let { threadName, participantIDs } = await api.getThreadInfo(threadID);
    const threadData = global.data.threadData.get(parseInt(threadID)) || {};

    const mentions = [];
    const nameArray = [];
    const memberNumbers = [];
    let i = 0;

    for (const id in event.logMessageData.addedParticipants) {
      const userName = event.logMessageData.addedParticipants[id].fullName;
      nameArray.push(userName);
      mentions.push({ tag: userName, id });
      memberNumbers.push(participantIDs.length - i++);
    }
    memberNumbers.sort((a, b) => a - b);

    const memberType = memberNumbers.length > 1 ? "مجموعة" : "عضو";

    let msg = typeof threadData.customJoin !== "undefined"
      ? threadData.customJoin
      : `مرحباً {name} في مجموعة {threadName} 🎉\nالعضو رقم: {memberNumber}\nالنوع: {type}\nالوقت: {time}`;

    msg = msg
      .replace(/\{name\}/g,         nameArray.join('، '))
      .replace(/\{type\}/g,         memberType)
      .replace(/\{memberNumber\}/g,  memberNumbers.join('، '))
      .replace(/\{soThanhVien\}/g,   memberNumbers.join('، '))
      .replace(/\{threadName\}/g,    threadName)
      .replace(/\{session\}/g,       greeting)
      .replace(/\{time\}/g,          time);

    const pathDir = join(__dirname, "cache", "joinGif");
    const pathGif = join(pathDir, "join.mp4");
    const randomDir = join(pathDir, "randomgif");

    let formPush;
    if (existsSync(pathGif)) {
      formPush = { body: msg, attachment: createReadStream(pathGif), mentions };
    } else {
      const files = readdirSync(randomDir);
      if (files.length > 0) {
        const randomFile = join(randomDir, files[Math.floor(Math.random() * files.length)]);
        formPush = { body: msg, attachment: createReadStream(randomFile), mentions };
      } else {
        formPush = { body: msg, mentions };
      }
    }

    return api.sendMessage(formPush, threadID);
  } catch (e) {
    console.error('[joinNoti] خطأ:', e?.message || e);
  }
};

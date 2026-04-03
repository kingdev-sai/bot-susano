module.exports = function ({ api, models, Users, Threads, Currencies, globalData, usersData, threadsData, message }) {
  const logger = require("../../utils/log.js");
  const moment = require("moment");

  return function ({ event }) {
    const timeStart = Date.now();
    const time = moment.tz("Asia/Manila").format("HH:mm:ss L");
    const { userBanned, threadBanned } = global.data;
    const { events } = global.client;
    const { allowInbox, DeveloperMode } = global.config;
    const senderID = String(event.senderID || "");
    const threadID = String(event.threadID || "");

    if (userBanned.has(senderID) || threadBanned.has(threadID)) return;
    if (allowInbox == false && senderID === threadID) return;

    const eventType = event.logMessageType;
    if (!eventType) return;

    for (const [key, value] of events.entries()) {
      if (!value.config?.eventType) continue;
      if (!value.config.eventType.includes(eventType)) continue;

      const eventRun = events.get(key);
      try {
        const Obj = {
          api,
          message,
          event,
          models,
          usersData,
          threadsData,
          Users,
          Threads,
          Currencies
        };
        const evtRunResult = eventRun.run(Obj);
        if (evtRunResult && typeof evtRunResult.catch === 'function') {
          evtRunResult.catch(error => {
            logger(
              global.getText('handleEvent', 'eventError', eventRun?.config?.name, String(error?.message || error)),
              'error'
            );
          });
        }
        if (DeveloperMode == true) {
          logger(
            global.getText('handleEvent', 'executeEvent', time, eventRun.config.name, threadID, Date.now() - timeStart),
            '[ Event ]'
          );
        }
      } catch (error) {
        logger(
          global.getText('handleEvent', 'eventError', eventRun?.config?.name, String(error?.message || error)),
          "error"
        );
      }
    }
  };
};

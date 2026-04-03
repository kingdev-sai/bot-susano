module.exports = function ({ api, models, Users, Threads, Currencies, globalData, usersData, threadsData, message }) {
  const humanTyping = (() => { try { return require("../humanTyping"); } catch (_) { return null; } })();

  return function ({ event }) {
    if (!event.messageReply) return;
    const { handleReply, commands } = global.client;
    const { messageID, threadID, messageReply } = event;
    if (!handleReply || handleReply.length === 0) return;

    const indexOfHandle = handleReply.findIndex(e => e.messageID == messageReply.messageID);
    if (indexOfHandle < 0) return;

    const indexOfMessage = handleReply[indexOfHandle];
    const handleNeedExec = commands.get(indexOfMessage.name);
    if (!handleNeedExec) return api.sendMessage(global.getText('handleReply', 'missingValue'), threadID, messageID);

    try {
      var getText2;
      if (handleNeedExec.languages && typeof handleNeedExec.languages == 'object') {
        getText2 = (...value) => {
          const reply = handleNeedExec.languages || {};
          if (!reply.hasOwnProperty(global.config.language)) return '';
          var lang = handleNeedExec.languages[global.config.language][value[0]] || '';
          for (var i = value.length; i > 0; i--) {
            lang = lang.replace(new RegExp('%' + i, 'g'), value[i]);
          }
          return lang;
        };
      } else {
        getText2 = () => {};
      }

      const _origSend = api.sendMessage.bind(api);
      const _wrappedApi = Object.assign(Object.create(api), {
        sendMessage: async function (msg, tid, ...rest) {
          if (humanTyping) {
            const delay = humanTyping.calcDelay(msg);
            if (delay > 0) await humanTyping.simulateTyping(api, tid || threadID, delay);
          }
          return _origSend(msg, tid, ...rest);
        }
      });

      const Obj = {
        api: _wrappedApi,
        event,
        models,
        Users,
        Threads,
        Currencies,
        message,
        usersData,
        threadsData,
        handleReply: indexOfMessage,
        getText: getText2
      };
      const replyResult = handleNeedExec.handleReply(Obj);
      if (replyResult && typeof replyResult.catch === 'function') {
        replyResult.catch(error => {
          console.error(
            '[handleReply] Unhandled rejection in handleReply:',
            indexOfMessage?.name,
            error?.message || error
          );
        });
      }
    } catch (error) {
      return api.sendMessage(global.getText('handleReply', 'executeError', error), threadID, messageID);
    }
  };
};

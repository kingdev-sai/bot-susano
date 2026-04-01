function calcDelay(form) {
  const cfg = global.config?.humanTyping;
  if (!cfg || !cfg.enable) return 0;

  let text = '';
  if (typeof form === 'string') text = form;
  else if (form && typeof form.body === 'string') text = form.body;

  const minDelay  = cfg.minDelay       || 600;
  const maxDelay  = cfg.maxDelay       || 3500;
  const cps       = cfg.charsPerSecond || 14;
  const jitterPct = cfg.jitterPercent  || 25;

  let delay = (text.length / cps) * 1000;
  delay = Math.max(minDelay, Math.min(delay, maxDelay));

  const jitter = delay * (jitterPct / 100);
  delay += (Math.random() * jitter * 2) - jitter;

  if (!text && form && form.attachment) delay = minDelay + Math.random() * 600;

  return Math.max(300, Math.round(delay));
}

async function simulateTyping(api, threadID, delayMs) {
  if (!delayMs) return;
  try {
    if (typeof api.sendTypingIndicator === 'function') {
      api.sendTypingIndicator(threadID, () => {});
    }
  } catch (_) {}
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

function wrapApiWithTyping(api, threadID) {
  const _orig = api.sendMessage.bind(api);
  return Object.assign(Object.create(api), {
    sendMessage: async function (form, tid, ...rest) {
      const target = tid || threadID;
      const delay  = calcDelay(form);
      if (delay > 0) await simulateTyping(api, target, delay);
      return _orig(form, target, ...rest);
    }
  });
}

module.exports = { calcDelay, simulateTyping, wrapApiWithTyping };

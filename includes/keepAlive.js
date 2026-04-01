/**
 * keepAlive.js — مقتبس من GoatBot V2 ومُكيّف لـ ZAO
 * يرسل ping لفيسبوك مباشرةً عبر الكوكيز لإبقاء الجلسة حية
 * ويحدّث fb_dtsg كل 48 ساعة لمنع انتهاء صلاحية الرمز
 */

const axios = require('axios');
const fs    = require('fs-extra');
const path  = require('path');

let pingTimer     = null;
let dtsgTimer     = null;
let saveTimer     = null;
let isSaving      = false;

function log(level, msg) {
  try {
    const logger = global.loggeryuki;
    if (logger) {
      logger.log([
        { message: '[ KEEP-ALIVE ]: ', color: ['red', 'cyan'] },
        { message: msg, color: 'white' }
      ]);
      return;
    }
  } catch (_) {}
  console[level === 'error' ? 'error' : 'log']('[KEEP-ALIVE]', msg);
}

function getRandomMs(minMin, maxMin) {
  return Math.floor(Math.random() * ((maxMin - minMin) * 60000 + 1)) + minMin * 60000;
}

async function doPing() {
  try {
    const api = global._botApi;
    if (!api) return;

    const appState = api.getAppState();
    if (!appState || !appState.length) return;

    const cookieStr = appState.map(c => `${c.key}=${c.value}`).join('; ');
    const userAgent = global.config?.FCAOption?.userAgent ||
      'Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36';

    await axios.get('https://mbasic.facebook.com/', {
      headers: {
        cookie: cookieStr,
        'user-agent': userAgent,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ar,en-US;q=0.9',
      },
      timeout: 15000
    });

    log('info', 'تم إرسال ping لفيسبوك — الجلسة محافظة على نشاطها ✓');
  } catch (e) {
    log('warn', 'فشل ping: ' + (e.message || e));
  }
}

async function doSaveCookies(source) {
  if (isSaving) return;
  if (global.isRelogining) return;
  isSaving = true;
  try {
    const api = global._botApi;
    if (!api) return;

    const appState = api.getAppState();
    if (!appState || !appState.length) return;

    const statePath = path.join(process.cwd(), global.config?.APPSTATEPATH || 'ZAO-STATE.json');
    const altPath   = path.join(process.cwd(), 'alt.json');
    const newData   = JSON.stringify(appState, null, 2);

    const current = await fs.readFile(statePath, 'utf-8').catch(() => '');
    if (current.trim() === newData.trim()) return;

    await fs.writeFile(statePath, newData, 'utf-8');
    await fs.writeFile(altPath,   newData, 'utf-8');
    log('info', `تم حفظ الكوكيز إلى ZAO-STATE.json & alt.json${source ? ` (${source})` : ''} ✓`);
  } catch (e) {
    log('warn', 'فشل حفظ الكوكيز: ' + (e.message || e));
  } finally {
    isSaving = false;
  }
}

async function doRefreshDtsg() {
  try {
    const api = global._botApi;
    if (!api || typeof api.refreshFb_dtsg !== 'function') return;
    await api.refreshFb_dtsg();
    log('info', 'تم تجديد رمز fb_dtsg بنجاح ✓');
  } catch (e) {
    log('warn', 'فشل تجديد fb_dtsg: ' + (e.message || e));
  }
}

function schedulePing() {
  if (pingTimer) clearTimeout(pingTimer);
  const delay   = getRandomMs(8, 18);
  const minutes = Math.round(delay / 60000);
  pingTimer = setTimeout(async () => {
    await doPing();
    schedulePing();
  }, delay);
  log('info', `Ping القادم بعد ${minutes} دقيقة`);
}

function startKeepAlive() {
  if (pingTimer) clearTimeout(pingTimer);
  if (dtsgTimer) clearInterval(dtsgTimer);
  if (saveTimer) clearInterval(saveTimer);

  log('info', 'بدأ نظام إبقاء الجلسة — Ping كل 8-18 دقيقة | كوكيز كل ساعتين | dtsg كل 48 ساعة');

  schedulePing();

  saveTimer = setInterval(() => doSaveCookies('scheduled'), 2 * 60 * 60 * 1000);

  dtsgTimer = setInterval(() => doRefreshDtsg(), 48 * 60 * 60 * 1000);
}

function stopKeepAlive() {
  if (pingTimer) clearTimeout(pingTimer);
  if (dtsgTimer) clearInterval(dtsgTimer);
  if (saveTimer) clearInterval(saveTimer);
  pingTimer = dtsgTimer = saveTimer = null;
}

module.exports = { startKeepAlive, stopKeepAlive, doSaveCookies, doPing };

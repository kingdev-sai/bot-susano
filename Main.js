'use strict';

// ══════════════════════════════════════════════════════════════
//  ZAO Bot — Unified Entry Point
//  يعتمد فقط على وحدات Node.js المدمجة (بدون أي npm package)
//  متوافق مع: Railway / Replit / أي بيئة Linux
// ══════════════════════════════════════════════════════════════

const { spawn }     = require('child_process');
const http          = require('http');
const fs            = require('fs');
const path          = require('path');

const PORT      = parseInt(process.env.PORT || '3000', 10);
const __dir     = __dirname;
const ALT_PATH  = path.join(__dir, 'alt.json');
const STATE_PATH = path.join(__dir, 'ZAO-STATE.json');

// ─── Logger بسيط ─────────────────────────────────────────────
function log(tag, msg) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

// ─── شعار الإقلاع ──────────────────────────────────────────
log('ZAO', '══════════════════════════════════════');
log('ZAO', '   ZAO Bot — Unified Launcher          ');
log('ZAO', '   by SAIM — Single-bot mode           ');
log('ZAO', '══════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════
//  HTTP Server — صحة البوت (Railway health-check / keep-alive)
// ═══════════════════════════════════════════════════════════════
let botChild   = null;
let restarts   = 0;
let botStart   = Date.now();
let isStopping = false;

const server = http.createServer((req, res) => {
  const body = JSON.stringify({
    status:   'running',
    bot:      'ZAO',
    restarts,
    uptime:   Math.floor(process.uptime()),
    botAlive: botChild !== null,
    time:     new Date().toISOString(),
  });
  res.writeHead(200, {
    'Content-Type':  'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
});

server.listen(PORT, '0.0.0.0', () => {
  log('SERVER', `HTTP health-check server listening on 0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  log('SERVER', `HTTP server error (non-fatal): ${err.message}`);
});

// ─── Self-ping كل 10 ثوانٍ — يُبقي البوت يعمل على Replit ──
setInterval(() => {
  const req = http.get(`http://127.0.0.1:${PORT}/`, { timeout: 8000 }, () => {});
  req.on('error', () => {});
  req.end();
}, 10_000);

// ═══════════════════════════════════════════════════════════════
//  حماية الكوكيز — استعادة alt.json إذا فسد ZAO-STATE.json
// ═══════════════════════════════════════════════════════════════
function restoreCookies() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      try {
        const raw  = fs.readFileSync(STATE_PATH, 'utf-8').trim();
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) return; // الملف سليم
      } catch (_) {
        log('PROTECT', 'ZAO-STATE.json تالف — محاولة الاستعادة من alt.json...');
      }
    }

    if (!fs.existsSync(ALT_PATH)) return;

    const altRaw  = fs.readFileSync(ALT_PATH, 'utf-8').trim();
    const altData = JSON.parse(altRaw);
    if (!Array.isArray(altData) || altData.length === 0) return;

    fs.writeFileSync(STATE_PATH, altRaw, 'utf-8');
    log('PROTECT', `تم استعادة ${altData.length} كوكي من alt.json إلى ZAO-STATE.json ✓`);
  } catch (e) {
    log('PROTECT', `خطأ في الاستعادة (غير قاتل): ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Watchdog — تشغيل ZAO.js وإعادة التشغيل عند التوقف
// ═══════════════════════════════════════════════════════════════
const MAX_RESTARTS = 100;                  // عدد كبير — البوت يبقى يعمل دائماً
const STABLE_MS    = 10 * 60 * 1000;      // 10 دقيقة = اعتُبر مستقراً
const BASE_DELAY   = 3_000;               // 3 ثوانٍ أول تأخير
const MAX_DELAY    = 2 * 60 * 1000;       // 2 دقيقة أقصى تأخير

function startBot() {
  if (isStopping) return;

  restoreCookies();

  botChild = spawn(process.execPath, ['ZAO.js'], {
    cwd:   __dir,
    stdio: 'inherit',
    shell: false,
    env:   { ...process.env },
  });

  botStart = Date.now();
  log('WATCHDOG', `تم تشغيل ZAO.js — PID ${botChild.pid} — إعادة تشغيل رقم ${restarts}`);

  botChild.on('error', (err) => {
    log('WATCHDOG', `خطأ في spawn (غير قاتل): ${err.message}`);
  });

  botChild.on('close', (code) => {
    botChild = null;
    if (isStopping) return;

    const uptime = Date.now() - botStart;

    if (code === 0) {
      // خروج نظيف (auto-relogin أو تحديث كوكيز) — نُعيد الفور
      log('WATCHDOG', 'خروج نظيف — إعادة التشغيل فوراً (تحديث الجلسة)...');
      restarts = 0;
      return setTimeout(startBot, 1_000);
    }

    if (uptime >= STABLE_MS) {
      // كان يعمل بشكل مستقر → نُصفّر العداد
      log('WATCHDOG', `كان مستقراً ${Math.round(uptime / 60000)} دقيقة — إعادة تعيين عداد الأعطال.`);
      restarts = 0;
    }

    restarts++;
    log('WATCHDOG', `انتهى بكود ${code} — محاولة ${restarts}/${MAX_RESTARTS}`);

    if (restarts > MAX_RESTARTS) {
      // لا نُغلق Main.js — نُصفّر العداد ونحاول بعد 5 دقائق
      log('WATCHDOG', `تجاوز الحد الأقصى (${MAX_RESTARTS}) — انتظار 5 دقائق ثم إعادة المحاولة.`);
      restarts = Math.floor(MAX_RESTARTS / 2);
      return setTimeout(startBot, 5 * 60 * 1000);
    }

    // Exponential backoff: 3s → 6s → 12s … حتى 2 دقيقة
    const delay = Math.min(BASE_DELAY * Math.pow(2, restarts - 1), MAX_DELAY);
    log('WATCHDOG', `إعادة التشغيل بعد ${Math.round(delay / 1000)} ثانية...`);
    setTimeout(startBot, delay);
  });
}

// ═══════════════════════════════════════════════════════════════
//  Graceful Shutdown
// ═══════════════════════════════════════════════════════════════
function shutdown(signal) {
  isStopping = true;
  log('LAUNCHER', `استُقبل ${signal} — إيقاف تشغيل ZAO...`);
  if (botChild) {
    try { botChild.kill('SIGTERM'); } catch (_) {}
  }
  setTimeout(() => process.exit(0), 4_000);
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT',  () => shutdown('SIGINT'));

// أخطاء غير متوقعة — نُسجّلها فقط ولا نُوقف Main.js
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason || 'unknown');
  log('LAUNCHER', `unhandledRejection (غير قاتل): ${msg}`);
});

process.on('uncaughtException', (err) => {
  log('LAUNCHER', `uncaughtException (غير قاتل): ${err?.message || err}`);
  // لا نستدعي process.exit — Main.js يبقى يعمل
});

// ═══════════════════════════════════════════════════════════════
//  بدء التشغيل
// ═══════════════════════════════════════════════════════════════
startBot();

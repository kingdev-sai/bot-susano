# ZAO Bot — Facebook Messenger Bot

## Overview
بوت ZAO الموحّد لـ Facebook Messenger مبني على Node.js يعمل كبوت متكامل.
- **بوت واحد فقط**: ZAO (تم دمج جميع ميزات White/GoatBot داخله)
- **نقطة دخول واحدة**: `Main.js` → يُشغّل `ZAO.js` مع watchdog وحماية كاملة

## Architecture

### نقطة الدخول — Main.js
- يعتمد فقط على وحدات Node.js المدمجة (بدون أي npm dependency)
- يُشغّل `ZAO.js` كـ subprocess
- HTTP server على `PORT` (0.0.0.0) لـ health-check
- Watchdog: إعادة تشغيل تلقائية (exponential backoff 3s → 2min, max 100 محاولة)
- استعادة الكوكيز من `alt.json` → `ZAO-STATE.json` عند كل إعادة تشغيل
- Self-ping كل 10 ثوانٍ لإبقاء العملية حية
- `uncaughtException` + `unhandledRejection` لا تُوقف Main.js

### ZAO Bot — ZAO.js
- تسجيل دخول عبر `AppState` أو `Email/Password`
- يحمّل الأوامر من `SCRIPTS/ZAO-CMDS/` والأحداث من `SCRIPTS/ZAO-EVTS/`
- قاعدة بيانات: SQLite عبر Sequelize
- PREFIX: `.` (نقطة)
- ADMINBOT: `["61588122232768"]`

## أنظمة الحماية المدمجة

| النظام | الملف | التفاصيل |
|--------|-------|----------|
| HTTP Keep-Alive | Main.js | Self-ping كل 10 ثوانٍ |
| Cookie Restore | Main.js | استعادة alt.json عند كل restart |
| Watchdog | Main.js | إعادة تشغيل تلقائية مع backoff |
| Session Ping | includes/keepAlive.js | Ping لـ Facebook كل 8-18 دقيقة عشوائي |
| Cookie Save | includes/keepAlive.js | حفظ ZAO-STATE.json + alt.json كل ساعتين |
| dtsg Refresh | includes/keepAlive.js | تجديد fb_dtsg كل 48 ساعة |
| MQTT HealthCheck | includes/mqttHealthCheck.js | فحص كل 2-5 دقائق، backoff تصاعدي، max 5 محاولات |
| Auto-Relogin | includes/login/autoRelogin.js | إعادة تسجيل الدخول عند انتهاء الجلسة |
| MQTT Silence | ZAO.js | إعادة تشغيل المستمع إذا صمت > 20 دقيقة |
| Memory Guard | ZAO.js | إعادة تشغيل إذا تجاوز heap 512 MB |
| Graceful Exit | ZAO.js | حفظ الكوكيز عند SIGTERM/SIGINT |
| Session Check | ZAO.js | فحص صحة الكوكيز كل 35 دقيقة |
| GoatBot Alias | ZAO.js | global.GoatBot = alias لـ global.config للتوافق |

## الأوامر المضافة

| الأمر | الوصف | الصلاحية |
|-------|--------|-----------|
| `.divel` | معلومات المطور + إحصائيات البوت + حالة الحماية | الجميع |
| `.cookieupdate` | حفظ الكوكيز الحية الآن | أدمن فقط |

## ملفات الكوكيز

| الملف | يُحفَظ متى |
|-------|-----------|
| `ZAO-STATE.json` | عند تسجيل الدخول + keepAlive (كل 2h) + SIGTERM |
| `alt.json` | نفس ZAO-STATE.json — نسخة احتياطية للاسترداد |

## Configuration
- **ZAO-SETTINGS.json** — جميع إعدادات البوت

## Environment Variables
- `PORT` — بورت HTTP server (Railway يضبطه تلقائياً، افتراضي: 3000)
- `FB_EMAIL` / `FB_PASSWORD` — بيانات دخول Facebook (اختياري إذا وُجد ZAO-STATE.json)

## Railway
- **railway.toml** موجود مع: `restartPolicyType = "ALWAYS"`, healthcheck `/health`
- `npm start` → `node Main.js`
- لا يحتاج تعديلات إضافية

## تشغيل محلي
```bash
cd Zaogreatergreater-New-Blood
npm install
node Main.js
```

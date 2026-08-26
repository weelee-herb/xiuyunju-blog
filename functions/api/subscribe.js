// ─────────────────────────────────────────────────────────────
// Cloudflare Pages Function：/api/subscribe
// 用于「Cloudflare Pages 纯静态部署」时跑订阅接口并调用 Resend 发信。
// （Node/Railway 部署走的是 src/pages/api/subscribe.ts，二者选一即可。）
//
// 环境变量在 Cloudflare 控制台 → Settings → Environment variables 里配：
//   RESEND_API_KEY  (必填)
//   EMAIL_FROM      (必填，必须是 Resend 验证过的域名发件人)
//   EMAIL_SUBJECT   (可选)
//   EMAIL_TO_OWNER  (可选，新订阅通知站长)
//   UNSUBSCRIBE_SECRET (可选，退订签名；未设置时回退使用 RESEND_API_KEY)
//
// 注意：邮件里的站名/资源链接在此文件底部 buildEmail() 里，改 src/config.ts
// 时记得同步这里，或把值改成读环境变量。
// ─────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_BUCKETS = new Map();
const EMAIL_SEEN = new Map();

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function signEmail(context, email) {
  const secret = context.env.UNSUBSCRIBE_SECRET || context.env.RESEND_API_KEY || '';
  if (!secret) return '';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const buffer = await crypto.subtle.sign('HMAC', key, encoder.encode(String(email).trim().toLowerCase()));
  let binary = '';
  new Uint8Array(buffer).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function requestIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    'local'
  );
}

function rateLimit(request, email) {
  const now = Date.now();
  const key = requestIp(request);
  const recent = (RATE_BUCKETS.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 3) {
    RATE_BUCKETS.set(key, recent);
    return { limited: true, message: '操作太频繁了，请一分钟后再试' };
  }
  const last = EMAIL_SEEN.get(email) || 0;
  if (now - last < 60_000) {
    return { limited: true, message: '这封欢迎邮件刚刚发过，请查收邮箱（或稍后再试）' };
  }
  RATE_BUCKETS.set(key, [...recent, now]);
  EMAIL_SEEN.set(email, now);
  return { limited: false };
}

function buildEmail(email, unsubscribeUrl) {
  const siteName = '云岫居';
  const author = '林屿';
  const resourceTitle = '《识药闯关》看图认中药小游戏';
  const resourceUrl = 'https://xiuyunju.cc.cd/game/';
  const note = '本期附赠：300 味中药看图认名小游戏（离线可玩，纯兴趣分享）。';
  const name = email.split('@')[0];
  return `<div style="background:#e9e1cd;padding:44px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#f7f2e6;border:1px solid #d8cdb2;border-radius:2px;">
      <tr><td style="padding:42px 46px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:46px;height:46px;background:#ab3a2a;color:#f7f1e4;border-radius:3px;font-family:'Kaiti SC','STKaiti',serif;font-size:24px;text-align:center;vertical-align:middle;">云</td>
          <td style="padding-left:14px;font-family:'Kaiti SC','STKaiti',serif;font-size:21px;color:#2a251d;letter-spacing:4px;vertical-align:middle;">${esc(siteName)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:24px 46px 6px;font-family:'Songti SC','Noto Serif SC','STSong',serif;font-size:15px;line-height:1.95;color:#5d5544;">
        你好，${esc(name)}：<br/>感谢订阅。以后每有新的创作笔记与资源，我都会写一封短笺，送到你的邮箱。
      </td></tr>
      <tr><td style="padding:20px 46px;">
        <a href="${esc(resourceUrl)}" style="display:inline-block;background:#ab3a2a;color:#f7f1e4;text-decoration:none;padding:12px 30px;border-radius:2px;font-size:14px;letter-spacing:2px;">领取 ${esc(resourceTitle)}</a>
      </td></tr>
      <tr><td style="padding:4px 46px 22px;font-size:13px;color:#8d8471;font-family:'Songti SC','Noto Serif SC',serif;">${esc(note)}</td></tr>
      <tr><td style="padding:20px 46px 38px;border-top:1px solid #e3dac4;font-size:12px;color:#8d8471;line-height:1.9;font-family:'Songti SC','Noto Serif SC',serif;">
        若这封信并非你订阅，直接忽略即可；想退订请<a href="${esc(unsubscribeUrl)}" style="color:#6e918a;">一键退订</a>，无需回复邮件。<br/>祝好 —— ${esc(author)}
      </td></tr>
    </table>
  </td></tr></table>
</div>`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestPost(context) {
  let email = '';
  let honeypot = '';
  try {
    const body = await context.request.json();
    email = String(body?.email ?? '').trim().toLowerCase();
    honeypot = String(body?.website ?? '').trim();
  } catch {}

  // 蜜罐命中：直接假装成功，不发信
  if (honeypot) {
    return json({ ok: true, message: '已发送，请查收邮箱 ✉' }, 200);
  }

  // 防跨站滥用：带 Origin 的请求必须与本站在同一域名
  const origin = context.request.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const reqHost = context.request.headers.get('host') || new URL(context.request.url).host;
      if (originHost !== reqHost) {
        return json({ ok: false, code: 'FORBIDDEN', message: '请求来源不被允许' }, 403);
      }
    } catch {
      return json({ ok: false, code: 'FORBIDDEN', message: '请求来源不被允许' }, 403);
    }
  }

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, code: 'BAD_EMAIL', message: '邮箱格式看起来不太对，请再检查一下' }, 400);
  }

  const rate = rateLimit(context.request, email);
  if (rate.limited) {
    return json({ ok: false, code: 'RATE_LIMITED', message: rate.message }, 429);
  }

  const key = context.env.RESEND_API_KEY;
  if (!key) {
    return json({ ok: false, code: 'NOT_CONFIGURED', message: '站长还没有配置邮件服务（RESEND_API_KEY）' }, 503);
  }

  const from = context.env.EMAIL_FROM || '';
  if (!from) {
    return json({ ok: false, code: 'NOT_CONFIGURED', message: '站长还没有配置发件人（EMAIL_FROM）' }, 503);
  }
  const subject = context.env.EMAIL_SUBJECT || '「云岫居」欢迎订阅 · 《识药闯关》看图认中药小游戏';
  const siteUrl = String(context.env.SITE_URL || 'https://xiuyunju.cc.cd').replace(/\/+$/, '');
  const signature = await signEmail(context, email);
  const unsubscribeUrl =
    siteUrl + '/api/unsubscribe?email=' + encodeURIComponent(email) + '&sig=' + encodeURIComponent(signature);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: email,
        subject,
        html: buildEmail(email, unsubscribeUrl),
        headers: {
          'List-Unsubscribe': '<' + unsubscribeUrl + '>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('Resend', res.status, t.slice(0, 300));
      return json({ ok: false, code: 'SEND_FAILED', message: '邮件发送失败，请稍后再试' }, 502);
    }

    const owner = context.env.EMAIL_TO_OWNER;
    if (owner) {
      // 必须 await：Worker 返回后环境即冻结，不等待的请求会被丢弃
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: owner,
            subject: '新订阅者：' + email,
            html: '<div style="font-family:serif;">新订阅者：<strong>' + esc(email) + '</strong></div>',
          }),
        });
      } catch {}
    }

    return json({ ok: true, message: '已发送，请查收邮箱 ✉' }, 200);
  } catch (err) {
    console.error('subscribe', err);
    return json({ ok: false, code: 'SEND_FAILED', message: '邮件发送失败，请稍后再试' }, 502);
  }
}

// Cloudflare Pages Function：/api/unsubscribe
// 欢迎邮件里的一键退订入口：GET 展示确认页，POST 调用 Resend suppression。
// 使用 Resend 的 suppressions 列表后，后续发信会自动跳过已退订邮箱。

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_BUCKETS = new Map();

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function page(email, message, ok = false) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>退订 · 云岫居</title>
    <meta name="robots" content="noindex,nofollow" />
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#e9e1cd;color:#2a251d;font-family:'Songti SC','Noto Serif SC','STSong',serif}
      .card{width:min(520px,88vw);padding:42px 36px;background:#f7f2e6;border:1px solid #d8cdb2}
      h1{margin:0 0 12px;font-size:24px;letter-spacing:4px}
      p{margin:0 0 20px;color:#5d5544;line-height:1.9}
      button{margin-top:8px;padding:10px 26px;border:1px solid #ab3a2a;background:#ab3a2a;color:#f7f1e4;font:inherit;letter-spacing:2px;cursor:pointer}
      .ok{color:#6e918a}
      .err{color:#ab3a2a}
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${ok ? '已成功退订' : '确认退订'}</h1>
      <p>${message}</p>
      ${ok ? '' : `<form method="post" action="/api/unsubscribe">
        <input type="hidden" name="email" value="${esc(email)}" />
        <button type="submit">确认退订</button>
      </form>`}
      <p class="remind">如果你不想错过，也可以直接关闭此页面，订阅不会改变。</p>
    </main>
  </body>
</html>`;
}

function requestIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    'local'
  );
}

function rateLimit(request) {
  const now = Date.now();
  const key = requestIp(request);
  const recent = (RATE_BUCKETS.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) {
    RATE_BUCKETS.set(key, recent);
    return true;
  }
  RATE_BUCKETS.set(key, [...recent, now]);
  return false;
}

async function suppress(context, email) {
  const key = context.env.RESEND_API_KEY;
  if (!key) return { ok: false, code: 'NOT_CONFIGURED' };
  try {
    const response = await fetch('https://api.resend.com/suppressions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('unsubscribe failed', response.status, text.slice(0, 200));
      return { ok: false, code: 'SEND_FAILED' };
    }
    return { ok: true };
  } catch (err) {
    console.error('unsubscribe error', err);
    return { ok: false, code: 'SEND_FAILED' };
  }
}

async function readEmail(context) {
  const query = new URL(context.request.url).searchParams.get('email') || '';
  if (query) return query.trim().toLowerCase();
  const text = await context.request.text().catch(() => '');
  if (!text) return '';
  try {
    const body = JSON.parse(text);
    return String(body?.email || '').trim().toLowerCase();
  } catch {
    return String(new URLSearchParams(text).get('email') || '').trim().toLowerCase();
  }
}

export async function onRequestGet(context) {
  const email = new URL(context.request.url).searchParams.get('email') || '';
  if (!EMAIL_RE.test(email.trim().toLowerCase())) {
    return new Response(page('', '链接不完整，请重新打开邮件里的退订链接。', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return new Response(page(email.trim().toLowerCase(), `我们不会再向 ${esc(email.trim().toLowerCase())} 发送订阅邮件。`, false), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost(context) {
  if (rateLimit(context.request)) {
    return json({ ok: false, code: 'RATE_LIMITED', message: '操作太频繁，请稍后再试' }, 429);
  }
  const email = await readEmail(context);
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, message: '邮箱格式不正确' }, 400);
  }
  const result = await suppress(context, email);
  if (!result.ok) {
    const message = result.code === 'NOT_CONFIGURED'
      ? '退订服务尚未配置，请稍后再试'
      : '退订失败，请稍后再试';
    return json({ ok: false, code: result.code, message }, 502);
  }
  const accept = context.request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    return new Response(page(email, '我们不会再向这个邮箱发送订阅邮件。', true), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return json({ ok: true, message: '已退订成功' });
}

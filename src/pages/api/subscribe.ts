import type { APIRoute } from 'astro';
import { site } from '../../config';
import { sendViaResend, subscriberEmail, ownerNotifyEmail } from '../../lib/email';

// 混合模式下该路由走服务器端渲染（部署到支持 Node 的平台即可生效）
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 简单的内存限流：每个 IP 每分钟最多 3 次，同一邮箱 60 秒内只发一次
const ipBucket = new Map<string, number[]>();
const emailSeen = new Map<string, number>();

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: jsonHeaders });

export const POST: APIRoute = async ({ request }) => {
  let email = '';
  let honeypot = '';
  try {
    const body = await request.json();
    email = String(body?.email ?? '').trim().toLowerCase();
    honeypot = String(body?.website ?? '').trim();
  } catch {}

  // 蜜罐命中：直接假装成功，不发信也不告警
  if (honeypot) {
    return reply(200, { ok: true, message: site.subscribe.success });
  }

  // 防跨站滥用：带 Origin 的请求必须与本站在同一域名
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const reqHost = request.headers.get('host') || new URL(request.url).host;
      if (originHost !== reqHost) {
        return reply(403, { ok: false, code: 'FORBIDDEN', message: '请求来源不被允许' });
      }
    } catch {
      return reply(403, { ok: false, code: 'FORBIDDEN', message: '请求来源不被允许' });
    }
  }

  if (!EMAIL_RE.test(email)) {
    return reply(400, { ok: false, code: 'BAD_EMAIL', message: '邮箱格式看起来不太对，请再检查一下' });
  }

  const now = Date.now();
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    'local';

  const recent = (ipBucket.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 3) {
    ipBucket.set(ip, recent);
    return reply(429, { ok: false, code: 'RATE_LIMITED', message: '操作太频繁了，请一分钟后再试' });
  }
  const last = emailSeen.get(email) ?? 0;
  if (now - last < 60_000) {
    return reply(429, { ok: false, code: 'RATE_LIMITED', message: '这封欢迎邮件刚刚发过，请查收邮箱（或稍后再试）' });
  }

  ipBucket.set(ip, [...recent, now]);
  emailSeen.set(email, now);

  if (!import.meta.env.RESEND_API_KEY) {
    return reply(503, {
      ok: false,
      code: 'NOT_CONFIGURED',
      message: '站长还没有配置邮件服务（RESEND_API_KEY），请参照 README 完成配置',
    });
  }

  try {
    const { subject, html } = subscriberEmail(email);
    await sendViaResend(email, subject, html);

    // 可选：通知站长有新订阅（失败不影响主流程，但需要等待完成）
    const owner = import.meta.env.EMAIL_TO_OWNER;
    if (owner) {
      const n = ownerNotifyEmail(email);
      await sendViaResend(owner, n.subject, n.html).catch(() => {});
    }
  } catch (err) {
    console.error('[subscribe] 发送失败:', err);
    return reply(502, {
      ok: false,
      code: 'SEND_FAILED',
      message: '邮件发送失败，请稍后再试，或直接发邮件给 ' + site.email,
    });
  }

  return reply(200, { ok: true, message: site.subscribe.success });
};

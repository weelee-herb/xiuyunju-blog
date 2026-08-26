// Cloudflare Pages Function：/admin-api
// 评论管理端从这里转发到 Vercel 上的 Waline 后台，密钥只经过本站与 Vercel。
// 注意：不要在此文件打印或记录 X-Admin-Key。

const UPSTREAM = 'https://comment-section-flax.vercel.app/admin-api';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Access-Control-Max-Age': '600',
};

const RATE_BUCKETS = new Map();

function requestIp(context) {
  return (
    context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    context.request.headers.get('cf-connecting-ip') ||
    'local'
  );
}

function rateLimit(context) {
  const now = Date.now();
  const key = requestIp(context);
  const recent = (RATE_BUCKETS.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 30) {
    RATE_BUCKETS.set(key, recent);
    return true;
  }
  RATE_BUCKETS.set(key, [...recent, now]);
  return false;
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS,
      ...extra,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  if (rateLimit(context)) {
    return json({ ok: false, message: '操作太频繁，请稍后再试' }, 429);
  }
  const key = context.request.headers.get('x-admin-key') || '';
  if (!key) {
    return json({ ok: false, message: '密钥错误' }, 401);
  }

  const contentType = context.request.headers.get('content-type') || 'application/json';
  const body = await context.request.text();

  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'X-Admin-Key': key,
      },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        ...CORS,
      },
    });
  } catch (error) {
    return json({ ok: false, message: '后台暂时不可用' }, 502);
  }
}

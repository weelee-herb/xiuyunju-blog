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

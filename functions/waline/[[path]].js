// Cloudflare Pages Function：/waline/*
// 将博客评论组件的所有 Waline 请求转发到 Vercel 后端，
// 让国内访客也能通过 xiuyunju.cc.cd 正常加载和发表评论。

const UPSTREAM = 'https://comment-section-flax.vercel.app';
const CACHEABLE_GET = /^(?:\/(?:comment|avatar|reaction)(?:\/|$)|(?:\/)?)$/;

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-worker',
  'cf-visitor',
  'cf-request-id',
]);

function responseJson(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extra,
    },
  });
}

export async function onRequest(context) {
  const request = context.request;
  const requestUrl = new URL(request.url);
  const prefix = '/waline';

  let path = requestUrl.pathname;
  if (path === prefix) {
    path = '/';
  } else if (path.startsWith(prefix + '/')) {
    path = path.slice(prefix.length);
  } else {
    path = '/' + path.replace(/^\/+/, '');
  }

  const upstreamUrl = UPSTREAM + path + requestUrl.search;
  const method = request.method;

  const headers = new Headers();
  for (const [name, value] of request.headers) {
    const lower = name.toLowerCase();
    if (
      SKIP_REQUEST_HEADERS.has(lower) ||
      lower.startsWith('cf-') ||
      lower.startsWith('x-forwarded-')
    ) {
      continue;
    }
    headers.set(name, value);
  }

  // Cloudflare 的 cf-connecting-ip 是边缘可信的真实访客 IP；
  // 转发给它，Vercel 上的人机验证限流与评论频率限制才能按真实访客计算。
  const realIp = request.headers.get('cf-connecting-ip') || '';
  if (realIp) {
    headers.set('x-forwarded-for', realIp);
    headers.set('x-real-ip', realIp);
  }

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
    });

    const data = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    for (const [name, value] of upstream.headers) {
      const lower = name.toLowerCase();
      if (
        lower === 'content-length' ||
        lower === 'transfer-encoding' ||
        lower === 'connection'
      ) {
        continue;
      }
      responseHeaders.set(name, value);
    }
    if (!responseHeaders.has('content-type')) {
      responseHeaders.set('content-type', 'application/json; charset=utf-8');
    }
    if (method === 'GET' && upstream.status === 200 && CACHEABLE_GET.test(path)) {
      // 评论列表等公开 GET 允许 Cloudflare 边缘缓存，缓解冷启动；用户态接口不会命中。
      responseHeaders.set(
        'Cache-Control',
        'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
      );
    } else if (method === 'GET') {
      responseHeaders.set('Cache-Control', 'no-store');
    }

    return new Response(data, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return responseJson({ ok: false, message: '评论服务暂时不可用' }, 502);
  }
}

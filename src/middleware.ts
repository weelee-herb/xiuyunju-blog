// 全站安全响应头（Node/Railway 部署生效；Cloudflare Pages 用 public/_headers）
import { defineMiddleware } from 'astro:middleware';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://giscus.app https://cloud.umami.is https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.loli.net https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com https://gstatic.loli.net https://fonts.loli.net data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.web3forms.com https://cloud.umami.is https://comment-section-flax.vercel.app",
  "frame-src https://giscus.app",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.web3forms.com",
].join('; ');

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', CSP);
  return response;
});

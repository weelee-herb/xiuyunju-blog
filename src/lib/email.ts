import { site } from '../config';

// 用 Resend 的 HTTP API 发信（无需额外依赖）
// 文档：https://resend.com/docs/api-reference/emails/send-email
export async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const key = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.EMAIL_FROM || `${site.name} <share@example.com>`;
  if (!key) throw new Error('NOT_CONFIGURED');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    // unsubscribe: true → Resend 自动附带一键退订链接与 List-Unsubscribe 头
    body: JSON.stringify({ from, to, subject, html, unsubscribe: true }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 发给订阅者的欢迎邮件（宋式风格的 HTML 邮件）
export function subscriberEmail(email: string) {
  const { resourceTitle, resourceUrl, note } = site.subscribe;
  const subject = import.meta.env.EMAIL_SUBJECT || `「${site.name}」欢迎订阅 · ${resourceTitle}`;
  const name = email.split('@')[0];
  const html = `
<div style="background:#e9e1cd;padding:44px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0"
             style="max-width:560px;width:100%;background:#f7f2e6;border:1px solid #d8cdb2;border-radius:2px;">
        <tr>
          <td style="padding:42px 46px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:46px;height:46px;background:#ab3a2a;color:#f7f1e4;border-radius:3px;
                           font-family:'Kaiti SC','STKaiti',serif;font-size:24px;text-align:center;vertical-align:middle;">云</td>
                <td style="padding-left:14px;font-family:'Kaiti SC','STKaiti',serif;font-size:21px;
                           color:#2a251d;letter-spacing:4px;vertical-align:middle;">${escapeHtml(site.name)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 46px 6px;font-family:'Songti SC','Noto Serif SC','STSong',serif;
                     font-size:15px;line-height:1.95;color:#5d5544;">
            你好，${escapeHtml(name)}：<br/>
            感谢订阅。以后每有新的创作笔记与资源，我都会写一封短笺，送到你的邮箱。
          </td>
        </tr>
        <tr>
          <td style="padding:20px 46px;">
            <a href="${escapeHtml(resourceUrl)}"
               style="display:inline-block;background:#ab3a2a;color:#f7f1e4;text-decoration:none;
                      padding:12px 30px;border-radius:2px;font-size:14px;letter-spacing:2px;">领取 ${escapeHtml(resourceTitle)}</a>
          </td>
        </tr>
        ${note ? `<tr><td style="padding:4px 46px 22px;font-size:13px;color:#8d8471;font-family:'Songti SC','Noto Serif SC',serif;">${escapeHtml(note)}</td></tr>` : ''}
        <tr>
          <td style="padding:20px 46px 38px;border-top:1px solid #e3dac4;font-size:12px;color:#8d8471;
                     line-height:1.9;font-family:'Songti SC','Noto Serif SC',serif;">
            若这封信并非你订阅，直接忽略即可；想退订请<a href="mailto:${escapeHtml(site.email)}?subject=${encodeURIComponent('退订')}" style="color:#6e918a;">点此退订</a>。<br/>祝好 —— ${escapeHtml(site.author)}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</div>`.trim();
  return { subject, html };
}

// 可选：通知站长有新订阅
export function ownerNotifyEmail(subscriber: string) {
  const subject = `[${site.name}] 新订阅者：${subscriber}`;
  const html = `
<div style="background:#e9e1cd;padding:44px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0"
             style="max-width:520px;width:100%;background:#f7f2e6;border:1px solid #d8cdb2;">
        <tr><td style="padding:34px 40px;font-family:'Songti SC','Noto Serif SC',serif;font-size:15px;line-height:1.9;color:#5d5544;">
          有人订阅了你的分享：<br/><strong style="color:#2a251d;">${escapeHtml(subscriber)}</strong>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`.trim();
  return { subject, html };
}

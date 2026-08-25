// 干支纪年与日期格式化
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function ganzhiYear(year: number): string {
  // 公元 4 年为甲子年
  const i = ((year - 4) % 60 + 60) % 60;
  return GAN[i % 10] + ZHI[i % 12];
}

export function formatDateCN(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

export function readingTime(text: string): number {
  const chars = text.replace(/\s/g, '').length;
  return Math.max(1, Math.round(chars / 400));
}

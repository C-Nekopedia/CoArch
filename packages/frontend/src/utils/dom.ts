/**
 * 转义HTML特殊字符，防止XSS攻击
 * @param str - 需要转义的字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

/**
 * 安全地设置元素的innerHTML，自动转义内容
 * @param element - HTML元素
 * @param html - 要设置的HTML字符串
 */
export function safeInnerHTML(element: HTMLElement, html: string): void {
  element.innerHTML = escapeHtml(html);
}
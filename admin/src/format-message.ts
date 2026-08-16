const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'CODE',
  'PRE',
  'A',
  'BR',
]);

export function previewMessage(message: string | null, max = 80): string {
  if (!message) {
    return '—';
  }
  const plain = message
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) {
    return plain;
  }
  return `${plain.slice(0, max).trim()}…`;
}

export function sanitizeTelegramHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) {
    return escapeText(html);
  }
  return serializeChildren(root);
}

function serializeChildren(node: ParentNode): string {
  let out = '';
  for (const child of Array.from(node.childNodes)) {
    out += serializeNode(child);
  }
  return out;
}

function serializeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(node.textContent ?? '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (tag === 'BR') {
    return '<br>';
  }
  if (!ALLOWED_TAGS.has(tag)) {
    return serializeChildren(el);
  }
  const inner = serializeChildren(el);
  if (tag === 'A') {
    const href = el.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href)) {
      return `<a href="${escapeAttr(href)}" rel="noreferrer" target="_blank">${inner}</a>`;
    }
    return inner;
  }
  const lower = tag.toLowerCase();
  return `<${lower}>${inner}</${lower}>`;
}

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}

/** Tiny markdown -> HTML for blueprint docs chunks (headings, lists, code, bold, links). No deps. */
const esc = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function linkify(s: string): string {
  const e = esc(s);
  let out = '';
  let i = 0;
  while (i < e.length) {
    const open = e.indexOf('[', i);
    if (open === -1) {
      out += e.slice(i);
      break;
    }
    const mid = e.indexOf('](', open + 1);
    if (mid === -1) {
      out += e.slice(i);
      break;
    }
    const close = e.indexOf(')', mid + 2);
    if (close === -1) {
      out += e.slice(i);
      break;
    }
    const label = e.slice(open + 1, mid);
    const url = e.slice(mid + 2, close);
    const badUrl =
      !label ||
      !url ||
      url.includes(' ') ||
      url.includes('\t') ||
      url.includes('\n') ||
      url.includes('<') ||
      url.includes('>');
    if (badUrl) {
      out += e.slice(i, mid + 2);
      i = mid + 2;
      continue;
    }
    out += e.slice(i, open);
    out += `<a href="${url}">${label}</a>`;
    i = close + 1;
  }
  return out;
}

function inline(s: string): string {
  const coded = linkify(s).replaceAll(/`([^`]+)`/g, '<code>$1</code>');
  return coded.replaceAll(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

interface MdState {
  html: string;
  inCode: boolean;
  listOpen: boolean;
  para: string[];
}

function flushPara(st: MdState): void {
  if (st.para.length) {
    st.html += `<p>${st.para.map(inline).join(' ')}</p>`;
    st.para = [];
  }
}

function closeList(st: MdState): void {
  if (st.listOpen) {
    st.html += '</ul>';
    st.listOpen = false;
  }
}

function handleFence(st: MdState): void {
  flushPara(st);
  closeList(st);
  st.inCode = !st.inCode;
  st.html += st.inCode ? '<pre><code>' : '</code></pre>';
}

function handleHeading(st: MdState, hashes: string, text: string): void {
  flushPara(st);
  closeList(st);
  const lvl = Math.min(3, hashes.length + 1);
  st.html += `<h${lvl}>${inline(text)}</h${lvl}>`;
}

function handleListItem(st: MdState, text: string): void {
  flushPara(st);
  if (!st.listOpen) {
    st.html += '<ul>';
    st.listOpen = true;
  }
  st.html += `<li>${inline(text)}</li>`;
}

function handleLine(st: MdState, line: string): void {
  if (st.inCode) {
    if (line.startsWith('```')) {
      handleFence(st);
    } else {
      st.html += `${esc(line)}\n`;
    }
    return;
  }
  if (line.startsWith('```')) {
    handleFence(st);
    return;
  }
  const h = /^(#{1,4})\s+(.*)/.exec(line);
  if (h) {
    handleHeading(st, h[1], h[2]);
    return;
  }
  const li = /^[-*]\s+(.*)/.exec(line) ?? /^\d+[.)]\s+(.*)/.exec(line);
  if (li) {
    handleListItem(st, li[1]);
    return;
  }
  if (!line.trim()) {
    flushPara(st);
    closeList(st);
    return;
  }
  st.para.push(line.trim());
}

export function md(src: string): string {
  const st: MdState = { html: '', inCode: false, listOpen: false, para: [] };
  for (const line of src.split('\n')) {
    handleLine(st, line);
  }
  flushPara(st);
  closeList(st);
  if (st.inCode) {
    st.html += '</code></pre>';
  }
  return st.html.replace('<code></code>', '');
}

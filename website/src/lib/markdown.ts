/** Tiny markdown -> HTML for blueprint docs chunks (headings, lists, code, bold, links). No deps. */
const esc = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function linkify(s: string): string {
  return esc(s).replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
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

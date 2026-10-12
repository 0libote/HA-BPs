/** Tiny markdown -> HTML for blueprint docs chunks (headings, lists, code, bold, links). No deps. */
export function md(src: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) => {
    let h = esc(s);
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return h;
  };
  const lines = src.split('\n');
  let html = '';
  let inCode = false;
  let codeLang = '';
  let listOpen = false;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      html += `<p>${para.map(inline).join(' ')}</p>`;
      para = [];
    }
  };
  const closeList = () => {
    if (listOpen) {
      html += '</ul>';
      listOpen = false;
    }
  };
  for (const line of lines) {
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      if (!inCode) {
        flushPara(); closeList();
        inCode = true; codeLang = fence[1];
        html += '<pre><code>';
      } else {
        inCode = false;
        html += '</code></pre>';
      }
      continue;
    }
    if (inCode) {
      html += esc(line) + '\n';
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flushPara(); closeList();
      const lvl = Math.min(3, h[1].length + 1);
      html += `<h${lvl}>${inline(h[2])}</h${lvl}>`;
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      flushPara();
      if (!listOpen) {
        html += '<ul>';
        listOpen = true;
      }
      html += `<li>${inline(li[1])}</li>`;
      continue;
    }
    const num = line.match(/^\d+[.)]\s+(.*)/);
    if (num) {
      flushPara();
      if (!listOpen) {
        html += '<ul>';
        listOpen = true;
      }
      html += `<li>${inline(num[1])}</li>`;
      continue;
    }
    if (!line.trim()) {
      flushPara(); closeList();
      continue;
    }
    para.push(line.trim());
  }
  flushPara(); closeList();
  if (inCode) html += '</code></pre>';
  return html.replace('<code></code>', '');
}

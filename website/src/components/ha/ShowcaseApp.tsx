import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  type Blueprint,
  buildAutomationYaml,
  initialValues,
} from '../../lib/blueprints';
import { MdiIcon } from './mdi';
import { ComboBox, FieldControl, type ComboItem } from './widgets';

/** Blueprint `mdi:*` section icon → mdi.json key. */
function sectionIcon(icon: string): string {
  const key = icon.replace(/^mdi:/, '');
  return key || 'tune';
}

/* Blueprint switcher icons (real MDI). */
const BP_MDI: Record<string, string> = {
  'doorbell-announcement': 'doorbell',
  'bilresa-scroll-wheel': 'remote',
  'myggspray-auto-lights': 'motion-sensor',
  'forgot-to-turn-off': 'lightbulb-group-off-outline',
};

const SIDEBAR_PANELS = [
  { label: 'Overview', icon: 'view-dashboard' },
  { label: 'Energy', icon: 'lightning-bolt' },
  { label: 'Map', icon: 'map' },
  { label: 'Logbook', icon: 'post-outline' },
  { label: 'History', icon: 'history' },
  { label: 'Media', icon: 'folder-play' },
  { label: 'To-do', icon: 'clipboard-check' },
];

/** Tiny inline-code formatter for blueprint help texts (`code` → <code>). */
function rich(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split('`');
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        style={{ fontFamily: 'var(--ha2-mono)', fontSize: '0.92em', color: '#8fd4f5' }}
      >
        {p}
      </code>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}

/** Plain-text description with bare URLs linkified, like ha-markdown does for these. */
function Description({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i}>
          {p.split(/(https?:\/\/[^\s)]+)/g).map((chunk, j) =>
            /^https?:\/\//.test(chunk) ? (
              <a key={j} href={chunk} target="_blank" rel="noreferrer" style={{ color: 'var(--ha2-primary)' }}>
                {chunk}
              </a>
            ) : (
              <React.Fragment key={j}>{rich(chunk)}</React.Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}

export interface ShowcaseAppProps {
  blueprint: Blueprint;
  all: { slug: string; name: string; file: string }[];
  storeKey?: string;
}

export default function ShowcaseApp({ blueprint, all, storeKey }: ShowcaseAppProps) {
  const key = storeKey ?? `showcase:${blueprint.slug}`;
  const [values, setValues] = useState<Record<string, any>>(() => initialValues(blueprint));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(blueprint.sections.map((s) => [s.key, !s.collapsed])),
  );
  const [name, setName] = useState(blueprint.name);
  const [yamlMode, setYamlMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail collapse
  const menuRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // Restore draft (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.values) setValues((v) => ({ ...v, ...parsed.values }));
          if (typeof parsed.name === 'string' && parsed.name) setName(parsed.name);
        }
      }
      setCollapsed(localStorage.getItem('showcase:rail') === 'collapsed');
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist draft.
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ values, name }));
    } catch { /* ignore */ }
  }, [key, values, name]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const say = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const yaml = useMemo(() => buildAutomationYaml(blueprint, values, name), [blueprint, values, name]);
  const set = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = yaml;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const switchItems: ComboItem[] = all.map((b) => ({
    id: b.slug,
    headline: b.name,
    support: `blueprints/${b.file}`,
  }));

  const toggleRail = () => {
    if (window.innerWidth <= 900) {
      setRailOpen((o) => !o);
    } else {
      setCollapsed((c) => {
        try {
          localStorage.setItem('showcase:rail', c ? 'expanded' : 'collapsed');
        } catch { /* ignore */ }
        return !c;
      });
    }
  };

  const demoOnly = () => say('Demo replica — only the automation editor is interactive');

  return (
    <div className="ha-app2">
      {/* slim caption for screen-reader / no-JS honesty is in the Astro shell */}
      <aside className={`ha2-sidebar${collapsed ? '' : ' expanded'}${railOpen ? ' drawer-open' : ''}`} aria-label="Home Assistant sidebar">
        <div className="ha2-side-menu">
          <button type="button" className="ha2-iconbtn" aria-label="Toggle sidebar" onClick={toggleRail}>
            <MdiIcon name={collapsed ? 'menu' : 'menu-open'} size={24} />
          </button>
          <div className="ha2-side-title">Home Assistant</div>
        </div>
        <nav className="ha2-panels">
          {SIDEBAR_PANELS.map((p) => (
            <button type="button" key={p.label} className="ha2-panel-item" title={p.label} onClick={demoOnly}>
              <MdiIcon name={p.icon} size={24} />
              <span className="lbl">{p.label}</span>
            </button>
          ))}
          <div className="ha2-spacer" />
          <button type="button" className="ha2-panel-item selected" title="Settings" onClick={demoOnly}>
            <MdiIcon name="cog" size={24} />
            <span className="lbl">Settings</span>
          </button>
          <button type="button" className="ha2-panel-item" title="Notifications" onClick={demoOnly}>
            <MdiIcon name="bell" size={24} />
            <span className="lbl">Notifications</span>
          </button>
          <button type="button" className="ha2-panel-item" title="Profile" onClick={demoOnly}>
            <span className="ha2-userbadge">O</span>
            <span className="lbl">0libote</span>
          </button>
        </nav>
      </aside>
      {railOpen && <div className="ha2-scrim" onClick={() => setRailOpen(false)} />}

      <div className="ha2-main">
        <div className="ha2-subpage">
          <button type="button" className="ha2-iconbtn ha2-only-mobile" aria-label="Open sidebar" onClick={() => setRailOpen(true)}>
            <MdiIcon name="menu" size={24} />
          </button>
          <a className="ha2-iconbtn" aria-label="Back to showcase" href="/showcase" title="Back to showcase">
            <MdiIcon name="arrow-left" size={24} />
          </a>
          <input
            className="ha2-doc-title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Automation name"
            spellCheck={false}
          />
          <div className="ha2-menu-pop" ref={menuRef}>
            <button
              type="button"
              className="ha2-iconbtn"
              aria-label="Automation options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MdiIcon name="dots-vertical" size={24} />
            </button>
            {menuOpen && (
              <div className="ha2-menu" role="menu">
                <button type="button" onClick={() => { setYamlMode((m) => !m); setMenuOpen(false); }}>
                  <MdiIcon name="pencil" size={18} />
                  {yamlMode ? 'Edit in visual editor' : 'Edit in YAML'}
                </button>
                <button type="button" onClick={() => { void copyYaml(); setMenuOpen(false); }}>
                  <MdiIcon name="content-save" size={18} />
                  Copy automation YAML
                </button>
                <a className="rowlink" href={blueprint.githubUrl} target="_blank" rel="noreferrer">
                  <MdiIcon name="arrowUpRight" size={18} />
                  View blueprint source
                </a>
                <a className="rowlink" href={`/docs/${blueprint.slug}`}>
                  <MdiIcon name="book" size={18} />
                  Open setup guide
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="ha2-content">
          <div className="ha2-card">
            <h2 className="ha2-card-header">Blueprint</h2>
            <div className="ha2-picker-container">
              <ComboBox
                label="Blueprint to use"
                placeholder="Pick a blueprint"
                items={switchItems}
                value={blueprint.slug}
                onPick={(id) => {
                  if (id !== blueprint.slug) window.location.href = `/showcase/${id}`;
                }}
                renderValue={() => (
                  <>
                    <MdiIcon name={BP_MDI[blueprint.slug] ?? 'remote'} size={24} />
                    <span>
                      <span className="ha2-overline">Blueprint to use</span>
                      <span className="ha2-headline">{blueprint.name}</span>
                    </span>
                  </>
                )}
                searchPlaceholder="Search blueprints"
              />
            </div>

            {yamlMode ? (
              <div style={{ padding: '12px 16px 16px' }}>
                <pre className="ha2-yamlpre">{yaml}</pre>
                <p className="ha2-caption" style={{ margin: '12px 0 0' }}>
                  Read-only in this demo — Home Assistant edits this YAML live.{' '}
                  <button
                    type="button"
                    onClick={() => setYamlMode(false)}
                    style={{ background: 'none', border: 0, padding: 0, color: 'var(--ha2-primary)', cursor: 'pointer', font: 'inherit' }}
                  >
                    Back to visual editor
                  </button>
                </p>
              </div>
            ) : (
              <>
                {blueprint.description && (
                  <div className="ha2-card-desc">
                    <Description text={blueprint.description} />
                  </div>
                )}
                {blueprint.sections.map((s) => {
                  const required = s.fields.some((f) => f.default == null);
                  const isOpen = !!open[s.key];
                  return (
                    <div className={'ha2-exp' + (isOpen ? ' open' : '')} key={s.key}>
                      <button
                        type="button"
                        className="ha2-exp-summary"
                        aria-expanded={isOpen}
                        disabled={required}
                        style={required ? { cursor: 'default' } : undefined}
                        onClick={() => !required && setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
                      >
                        <span className="lead">
                          <MdiIcon name={sectionIcon(s.icon)} size={24} />
                        </span>
                        <span className="hd">{s.name}</span>
                        {!required && (
                          <span className="chev">
                            <MdiIcon name="chevron-down" size={24} />
                          </span>
                        )}
                      </button>
                      {isOpen && (
                        <div className="ha2-exp-body">
                          {s.description && (
                            <div className="ha2-exp-desc">
                              <Description text={s.description} />
                            </div>
                          )}
                          {s.fields.map((f) => (
                            <div className="ha2-row" key={f.key}>
                              <div className="ha2-row-name">{f.name}</div>
                              {f.description && (
                                <div className="ha2-row-desc">{rich(f.description)}</div>
                              )}
                              <div className="ha2-row-widget">
                                <FieldControl field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ height: 8 }} />
              </>
            )}
          </div>

          <p className="ha2-caption">
            Interactive replica with mock entities — your draft is kept in this browser only.{' '}
            <a href={`/docs/${blueprint.slug}`}>Setup guide</a>
            {' · '}
            <a href={blueprint.importUrl} target="_blank" rel="noreferrer">Import in Home Assistant</a>
          </p>
        </div>
      </div>

      <button type="button" className="ha2-fab" onClick={() => void copyYaml()} title="Copy automation YAML">
        <MdiIcon name={savedFlash ? 'check' : 'content-save'} size={20} />
        {savedFlash ? 'COPIED' : 'SAVE'}
      </button>

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2b2b30',
            color: 'var(--ha2-text)',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13.5,
            boxShadow: '0 8px 24px rgba(0,0,0,.5)',
            zIndex: 70,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

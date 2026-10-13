import React, { useEffect, useMemo, useState } from 'react';
import {
  type Blueprint,
  buildAutomationYaml,
  initialValues,
} from '../../lib/blueprints';
import { MdiIcon } from './mdi';
import { FieldControl } from './widgets';

/** Blueprint `mdi:*` section icon → mdi.json key. */
function sectionIcon(icon: string): string {
  return icon.replace(/^mdi:/, '') || 'tune';
}

/** Stable key for text fragments that have no id (position is identity here). */
function fragKey(seen: Map<string, number>, scope: string, value: string): string {
  const k = `${scope}:${value}`;
  const n = (seen.get(k) ?? 0) + 1;
  seen.set(k, n);
  return `${scope}-${value.length}-${n}-${value.slice(0, 32)}`;
}

/** Tiny inline-code formatter for blueprint help texts (`code` → <code>). */
function rich(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split('`');
  if (parts.length === 1) return text;
  const seen = new Map<string, number>();
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <code
        key={fragKey(seen, 'code', p)}
        style={{ fontFamily: 'var(--ha2-mono)', fontSize: '0.92em', color: '#8fd4f5' }}
      >
        {p}
      </code>
    ) : (
      <React.Fragment key={fragKey(seen, 'text', p)}>{p}</React.Fragment>
    ),
  );
}

/** Plain-text description with bare URLs linkified. */
function Description({ text }: Readonly<{ text: string }>) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const seenPara = new Map<string, number>();
  return (
    <>
      {paras.map((p) => {
        const seenChunk = new Map<string, number>();
        return (
          <p key={fragKey(seenPara, 'para', p)}>
            {p.split(/(https?:\/\/[^\s)]+)/g).map((chunk) =>
              /^https?:\/\//.test(chunk) ? (
                <a key={fragKey(seenChunk, 'link', chunk)} href={chunk} target="_blank" rel="noreferrer" style={{ color: 'var(--ha2-primary)' }}>
                  {chunk}
                </a>
              ) : (
                <React.Fragment key={fragKey(seenChunk, 'text', chunk)}>{rich(chunk)}</React.Fragment>
              ),
            )}
          </p>
        );
      })}
    </>
  );
}

export interface ShowcaseAppProps {
  blueprint: Blueprint;
  storeKey?: string;
}

export default function ShowcaseApp({ blueprint, storeKey }: Readonly<ShowcaseAppProps>) {
  const key = storeKey ?? `showcase:${blueprint.slug}`;
  const [values, setValues] = useState<Record<string, any>>(() => initialValues(blueprint));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(blueprint.sections.map((s) => [s.key, !s.collapsed])),
  );
  const [name, setName] = useState(blueprint.name);
  const [copied, setCopied] = useState(false);

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
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist draft.
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ values, name }));
    } catch { /* ignore */ }
  }, [key, values, name]);

  const yaml = useMemo(() => buildAutomationYaml(blueprint, values, name), [blueprint, values, name]);
  const set = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — nothing else to do.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="ha2-scope">
      <div className="ha2-demo-bar">
        <div>
          <p className="meta-line" style={{ margin: 0 }}>
            {blueprint.domain} · HA {blueprint.min_version}+ · {blueprint.fieldCount} inputs
          </p>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            Mock entities only — nothing here controls a real home. Your draft stays in this browser.
          </p>
        </div>
        <div className="ha2-demo-actions">
          <button type="button" className="ha-btn subtle small" onClick={() => setValues(initialValues(blueprint))}>
            Reset defaults
          </button>
          <button type="button" className="ha-btn subtle small" onClick={() => void copyYaml()}>
            {copied ? 'Copied' : 'Copy YAML'}
          </button>
          <a className="ha-btn small" href={blueprint.importUrl} target="_blank" rel="noreferrer">
            Import in HA
          </a>
        </div>
      </div>

      <div className="ha2-demo-grid">
        <div>
          <div className="ha2-name-row">
            <label htmlFor="ha2-automation-name">Automation name</label>
            <input
              id="ha2-automation-name"
              className="ha2-text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="ha2-card">
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
          </div>
        </div>

        <div className="ha2-yaml-side">
          <div className="ha-card">
            <b>Automation YAML — live</b>
            <p className="small muted">Updates as you configure. Paste it into an automation that uses this blueprint.</p>
            <pre className="ha-pre">{yaml}</pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" className="ha-btn subtle small" onClick={() => void copyYaml()}>
                {copied ? 'Copied' : 'Copy YAML'}
              </button>
              <a className="link-quiet small" href={blueprint.githubUrl} target="_blank" rel="noreferrer">
                View source YAML
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

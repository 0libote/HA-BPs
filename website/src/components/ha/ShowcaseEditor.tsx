import React, { useMemo, useState } from 'react';
import {
  type Blueprint,
  type BpField,
  buildAutomationYaml,
  initialValues,
} from '../../lib/blueprints';
import { filterEntities, rgbToCss, rgbToHex, hexToRgb } from './mockEntities';
import { Icon } from './Icon';
import { mdiIcon } from '../icons';

/* ---------------- field widgets ---------------- */

function EntityPicker({ field, value, onChange }: { field: BpField; value: any; onChange: (v: any) => void }) {
  const multiple = !!field.selector?.multiple;
  const [q, setQ] = useState('');
  const options = useMemo(() => filterEntities(field.selector?.filter), [field]);
  const selected: string[] = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];
  const filtered = options.filter(
    (e) =>
      !q ||
      e.entity_id.toLowerCase().includes(q.toLowerCase()) ||
      e.friendly.toLowerCase().includes(q.toLowerCase()),
  );
  const toggle = (id: string) => {
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    } else {
      onChange(value === id ? '' : id);
    }
  };
  return (
    <div className="ha-entity-box">
      <div className="ha-chips">
        {selected.map((id) => (
          <span className="ha-chip" key={id}>
            <span className="dot" />
            <code>{id}</code>
            <button onClick={() => toggle(id)} aria-label={`Remove ${id}`}><Icon name="x" size={12} /></button>
          </span>
        ))}
        {selected.length === 0 && <span className="small muted">No entity selected — pick below, like in HA.</span>}
      </div>
      <div className="ha-search">
        <Icon name="search" size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${options.length} matching entities…`} />
      </div>
      <div className="ha-entity-list">
        {filtered.map((e) => (
          <button
            key={e.entity_id}
            className={'ha-entity-opt' + (selected.includes(e.entity_id) ? ' picked' : '')}
            onClick={() => toggle(e.entity_id)}
          >
            <span className="dot" />
            <span>
              {e.friendly}
              <small>{e.entity_id} · {e.state}</small>
            </span>
            <span style={{ marginLeft: 'auto' }}>{selected.includes(e.entity_id) ? <span className="tick"><Icon name="check" size={14} /></span> : null}</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="small muted" style={{ padding: 8 }}>No matches.</div>}
      </div>
    </div>
  );
}

function NumberField({ field, value, onChange }: { field: BpField; value: any; onChange: (v: any) => void }) {
  const s = field.selector ?? {};
  const mode = s.mode ?? 'slider';
  const unit = s.unit_of_measurement ?? '';
  const num = typeof value === 'number' ? value : Number(value ?? s.min ?? 0);
  if (mode === 'box') {
    return (
      <div className="ha-box-row">
        <input
          className="ha-input" type="number"
          min={s.min} max={s.max} step={s.step ?? 1}
          value={num} onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span className="ha-unit">{unit}</span>}
      </div>
    );
  }
  return (
    <div className="ha-slider-row">
      <input
        type="range" min={s.min ?? 0} max={s.max ?? 100} step={s.step ?? 1}
        value={num} onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="ha-slider-val">
        <input
          type="number" min={s.min} max={s.max} step={s.step ?? 1}
          value={num} onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span>{unit}</span>}
      </div>
    </div>
  );
}

function DurationField({ field, value, onChange }: { field: BpField; value: any; onChange: (v: any) => void }) {
  const v = typeof value === 'object' && value !== null ? value : { hours: 0, minutes: 0, seconds: 0 };
  const enableDay = !!field.selector?.enable_day;
  const set = (k: string, n: number) => onChange({ ...v, [k]: Math.max(0, Math.floor(n || 0)) });
  const parts = [...(enableDay ? ['days'] : []), 'hours', 'minutes', 'seconds'];
  return (
    <div className="ha-dur">
      {parts.map((p) => (
        <div key={p}>
          <label>{p}</label>
          <input
            className="ha-input" type="number" min={0}
            value={v[p] ?? 0} onChange={(e) => set(p, Number(e.target.value))}
          />
        </div>
      ))}
    </div>
  );
}

function SelectField({ field, value, onChange }: { field: BpField; value: any; onChange: (v: any) => void }) {
  const opts: any[] = field.selector?.options ?? [];
  return (
    <select className="ha-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label ?? o.value;
        return <option key={val} value={val}>{label}</option>;
      })}
    </select>
  );
}

function ConditionActionField({ kind, value, onChange }: { kind: string; value: any; onChange: (v: any) => void }) {
  const arr: any[] = Array.isArray(value) ? value : [];
  const add = () => onChange([...arr, kind === 'condition' ? { condition: 'state', entity_id: '' } : { action: 'notify.notify', data: { message: 'Hello' } }]);
  return (
    <div className="ha-yaml-ph">
      {arr.length === 0 ? (
        <div>No {kind}s — optional, exactly like HA when left empty.</div>
      ) : (
        <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
          {arr.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#141417', border: '1px solid var(--ha-border)', borderRadius: 7, padding: '7px 10px', fontFamily: 'var(--ha-mono)', fontSize: 11.5 }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {i + 1}. {JSON.stringify(item).slice(0, 90)}
              </span>
              <button className="ha-btn subtle" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => onChange(arr.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
        </div>
      )}
      <button className="ha-btn subtle" onClick={add}><span style={{ display: 'inline-flex' }}><Icon name="plus" size={14} /></span> Add {kind}</button>
    </div>
  );
}

function ColorRgbField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const rgb = Array.isArray(value) ? value : [255, 214, 170];
  return (
    <div className="ha-color-row">
      <input
        type="color" className="ha-color-dot" title="Pick colour"
        value={rgbToHex(rgb)} onChange={(e) => onChange(hexToRgb(e.target.value))}
        style={{ background: rgbToCss(rgb) }}
      />
      <div>
        <div style={{ fontFamily: 'var(--ha-mono)', fontSize: 13 }}>{rgbToHex(rgb)} · rgb({rgb.join(', ')})</div>
        <div className="small muted">Same RGB picker HA shows for colour lists.</div>
      </div>
    </div>
  );
}

function ColorTempField({ field, value, onChange }: { field: BpField; value: any; onChange: (v: any) => void }) {
  const s = field.selector ?? {};
  const num = typeof value === 'number' ? value : Number(value ?? s.min ?? 2700);
  return (
    <div>
      <div className="ha-temp-slider">
        <input type="range" min={s.min ?? 2000} max={s.max ?? 6500} step={50} value={num} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div className="ha-box-row" style={{ marginTop: 8 }}>
        <input className="ha-input" type="number" min={s.min} max={s.max} step={50} value={num} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="ha-unit">K · {num <= 3000 ? 'warm' : num <= 4500 ? 'neutral' : 'cool'}</span>
      </div>
    </div>
  );
}

function ObjectListField({ field, value, onChange }: { field: BpField; value: any; onChange: (v: any) => void }) {
  const arr: any[] = Array.isArray(value) ? value : [];
  const move = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      {arr.map((item, i) => (
        <div className="ha-obj" key={i}>
          <div className="ha-obj-head">
            <span className="grip">⋮⋮</span>
            <span className="mini-dot" style={{ background: rgbToCss(item?.colour) }} />
            <b>{item?.name || `Colour ${i + 1}`}</b>
            <button className="mini-btn" aria-label="Move up" onClick={() => move(i, -1)}><Icon name="chevUp" size={14} /></button>
            <button className="mini-btn" aria-label="Move down" onClick={() => move(i, 1)}><Icon name="chevDown" size={14} /></button>
            <button className="mini-btn" aria-label="Remove" onClick={() => onChange(arr.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>
          </div>
          <div className="ha-obj-body">
            <div>
              <label>Name — display only</label>
              <input
                className="ha-input" value={item?.name ?? ''}
                onChange={(e) => onChange(arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
            </div>
            <div>
              <label>Colour — RGB picker</label>
              <ColorRgbField
                value={item?.colour}
                onChange={(c) => onChange(arr.map((x, j) => (j === i ? { ...x, colour: c } : x)))}
              />
            </div>
          </div>
        </div>
      ))}
      {arr.length === 0 && <div className="small muted" style={{ marginBottom: 8 }}>Empty list — HA ignores this preset's colours when duplicating.</div>}
      <button
        className="ha-add-btn"
        onClick={() => onChange([...arr, { name: `Colour ${arr.length + 1}`, colour: [255, 214, 170] }])}
      >
        <Icon name="plus" size={14} /> Add colour
      </button>
    </div>
  );
}

function FieldControl({ field, value, onChange }: { field: BpField; value: any; onChange: (v: any) => void }) {
  switch (field.selectorType) {
    case 'entity': return <EntityPicker field={field} value={value} onChange={onChange} />;
    case 'number': return <NumberField field={field} value={value} onChange={onChange} />;
    case 'text':
      return field.selector?.multiline ? (
        <textarea className="ha-textarea" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="ha-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      );
    case 'boolean':
      return (
        <div className="ha-toggle-row">
          <span className="small">{value ? 'On' : 'Off'}</span>
          <span className="ha-switch">
            <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
            <span className="tr" /><span className="th" />
          </span>
        </div>
      );
    case 'duration': return <DurationField field={field} value={value} onChange={onChange} />;
    case 'select': return <SelectField field={field} value={value} onChange={onChange} />;
    case 'condition': return <ConditionActionField kind="condition" value={value} onChange={onChange} />;
    case 'action': return <ConditionActionField kind="action" value={value} onChange={onChange} />;
    case 'color_rgb': return <ColorRgbField value={value} onChange={onChange} />;
    case 'color_temp': return <ColorTempField field={field} value={value} onChange={onChange} />;
    case 'object': return <ObjectListField field={field} value={value} onChange={onChange} />;
    default:
      return <input className="ha-input" value={typeof value === 'string' ? value : JSON.stringify(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
  }
}

/* ---------------- main editor ---------------- */

export default function ShowcaseEditor({ blueprint }: { blueprint: Blueprint }) {
  const [values, setValues] = useState<Record<string, any>>(() => initialValues(blueprint));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(blueprint.sections.map((s) => [s.key, !s.collapsed])),
  );
  const [name, setName] = useState(`${blueprint.name} — demo`);
  const [copied, setCopied] = useState(false);
  const yaml = useMemo(() => buildAutomationYaml(blueprint, values, name), [blueprint, values, name]);
  const set = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="ha-editor-top">
        <div className="title-block">
          <p className="meta-line" style={{ margin: 0 }}>{blueprint.domain} · HA {blueprint.min_version}+ · {blueprint.fieldCount} inputs</p>
          <div className="small muted" style={{ marginTop: 6 }}>Mock entities only — nothing here controls a real home. Import into HA for real devices.</div>
          <input className="ha-automation-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Automation name" />
        </div>
        <div className="ha-toolbar">
          <button className="ha-btn subtle" onClick={() => setValues(initialValues(blueprint))}>Reset defaults</button>
          <button
            className="ha-btn subtle"
            onClick={() => { navigator.clipboard?.writeText(yaml); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
          >
            {copied ? 'Copied' : 'Copy YAML'}
          </button>
          <a className="ha-btn" href={blueprint.importUrl} target="_blank" rel="noreferrer">Import in HA</a>
        </div>
      </div>

      <div className="showcase-layout">
        <div>
          {blueprint.sections.map((s) => (
            <div className={'ha-section' + (open[s.key] ? ' open' : '')} key={s.key}>
              <button className="ha-section-head" onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}>
                <span className="ha-sec-ico"><Icon name={mdiIcon[s.icon] ?? 'sliders'} size={19} /></span>
                <span className="t">
                  <b>{s.name}</b>
                  {s.description && <span>{s.description.split('\n')[0].slice(0, 120)}</span>}
                </span>
                <span className="ha-chev"><Icon name="chevDown" size={18} /></span>
              </button>
              {open[s.key] && (
                <div className="ha-section-body">
                  {s.description && <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{s.description}</p>}
                  {s.fields.map((f) => (
                    <div className="ha-field" key={f.key}>
                      <label className="f-name">{f.name}<span className="f-key">{f.key}</span></label>
                      {f.description && <p className="f-desc">{f.description}</p>}
                      <FieldControl field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="ha-yaml-side">
          <div className="ha-card">
            <b>Automation YAML — live</b>
            <p className="small muted">Updates as you configure, like HA's YAML view. Paste into an automation using this blueprint.</p>
            <pre className="ha-pre">{yaml}</pre>
            <div className="ha-toolbar" style={{ marginTop: 10 }}>
              <a className="ha-btn subtle" href={blueprint.githubUrl} target="_blank" rel="noreferrer">View source YAML</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

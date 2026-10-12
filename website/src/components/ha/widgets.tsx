import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BpField } from '../../lib/blueprints';
import { filterEntities, rgbToCss, rgbToHex, hexToRgb, type MockEntity } from './mockEntities';
import { MdiIcon } from './mdi';

/* Domain badge colours + icons (state-badge look). */
const DOMAIN_BADGE: Record<string, { icon: string; bg: string }> = {
  light: { icon: 'lightbulb', bg: '#b98a1d' },
  media_player: { icon: 'speaker', bg: '#1d7bb5' },
  binary_sensor: { icon: 'motion-sensor', bg: '#2e7d32' },
  sensor: { icon: 'thermometer', bg: '#00695c' },
  tts: { icon: 'account-voice', bg: '#6a1fb5' },
  event: { icon: 'remote', bg: '#4a4a52' },
};

export function EntityBadge({ entity, size = 36 }: { entity: MockEntity; size?: number }) {
  const b = DOMAIN_BADGE[entity.domain] ?? { icon: 'shape', bg: '#4a4a52' };
  return (
    <span className="ha2-badge" style={{ background: b.bg, width: size, height: size }}>
      <MdiIcon name={b.icon} size={Math.round(size * 0.62)} />
    </span>
  );
}

function useDismiss(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onDismiss]);
  return ref;
}

/* ---------------- generic closed combo box ---------------- */

export interface ComboItem {
  id: string;
  headline: string;
  support?: string;
  unknown?: boolean;
  badge?: React.ReactNode;
  domainLabel?: string;
}

export function ComboBox({
  label,
  placeholder,
  items,
  value,
  multiple,
  values,
  onPick,
  onClear,
  renderValue,
  searchPlaceholder,
}: {
  label?: string;
  placeholder: string;
  items: ComboItem[];
  value?: string;
  multiple?: boolean;
  values?: string[];
  onPick: (id: string) => void;
  onClear?: () => void;
  renderValue?: () => React.ReactNode;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useDismiss(() => {
    setOpen(false);
    setQ('');
  });
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (i) =>
        i.headline.toLowerCase().includes(needle) ||
        i.id.toLowerCase().includes(needle) ||
        (i.support ?? '').toLowerCase().includes(needle),
    );
  }, [items, q]);

  const multi = !!multiple;
  const sel: string[] = multi ? (values ?? []) : value ? [value] : [];
  const unknownSingle = !multi && value ? !items.some((i) => i.id === value) : false;

  return (
    <div className="ha2-combo-wrap" ref={ref}>
      <button
        type="button"
        className={'ha2-field' + (open ? ' open' : '') + (unknownSingle ? ' unknown' : '')}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {multi ? (
          <span className="ha2-chips">
            {sel.length === 0 && <span className="ha2-placeholder">{placeholder}</span>}
            {sel.map((id) => {
              const it = items.find((i) => i.id === id);
              return (
                <span
                  className="ha2-chip"
                  key={id}
                  onClick={(e) => e.stopPropagation()}
                >
                  <code>{it?.headline ?? id}</code>
                  <button
                    type="button"
                    aria-label={`Remove ${id}`}
                    onClick={() => onPick(id)}
                  >
                    <MdiIcon name="close" size={13} />
                  </button>
                </span>
              );
            })}
          </span>
        ) : (
          <span className="ha2-field-main">
            {renderValue ? (
              renderValue()
            ) : value ? (
              (() => {
                const it = items.find((i) => i.id === value);
                if (!it) {
                  return (
                    <>
                      <MdiIcon name="shape" size={24} />
                      <span>
                        <span className="ha2-headline">{value}</span>
                        <span className="ha2-support unknown-t">Unknown entity</span>
                      </span>
                    </>
                  );
                }
                return (
                  <>
                    {it.badge}
                    <span>
                      {label && <span className="ha2-overline">{label}</span>}
                      <span className="ha2-headline">{it.headline}</span>
                      {it.support && <span className="ha2-support">{it.support}</span>}
                    </span>
                  </>
                );
              })()
            ) : (
              <span className="ha2-placeholder">{placeholder}</span>
            )}
          </span>
        )}
        {!multi && value && onClear && (
          <button
            type="button"
            className="ha2-x"
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <MdiIcon name="close" size={18} />
          </button>
        )}
        <span className="chev">
          <MdiIcon name="menu-down" size={22} />
        </span>
      </button>
      {open && (
        <div className="ha2-drop">
          <div className="ha2-drop-search">
            <MdiIcon name="magnify" size={20} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search'}
              aria-label="Search"
            />
          </div>
          <div className="ha2-drop-list">
            {filtered.map((it) => {
              const picked = sel.includes(it.id);
              return (
                <button
                  type="button"
                  key={it.id}
                  className="ha2-opt"
                  onClick={() => {
                    onPick(it.id);
                    if (!multi) {
                      setOpen(false);
                      setQ('');
                    }
                  }}
                >
                  {it.badge}
                  <span className="tx">
                    <span className="ha2-headline">{it.headline}</span>
                    {it.support && (
                      <span className={'ha2-support' + (it.unknown ? ' unknown-t' : '')}>
                        {it.support}
                      </span>
                    )}
                  </span>
                  {it.domainLabel && <span className="domain">{it.domainLabel}</span>}
                  {picked && (
                    <span className="tick">
                      <MdiIcon name="check" size={18} />
                    </span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && <div className="ha2-no-match">No match for “{q}”</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- entity pickers ---------------- */

function entityItems(entities: MockEntity[], opts?: { domainLabel?: boolean }): ComboItem[] {
  return entities.map((e) => ({
    id: e.entity_id,
    headline: e.friendly,
    support: e.entity_id,
    badge: <EntityBadge entity={e} />,
    domainLabel: opts?.domainLabel ? e.domain : undefined,
  }));
}

export function EntitySingle({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  const entities = useMemo(() => filterEntities(field.selector?.filter), [field]);
  const items = useMemo(() => entityItems(entities), [entities]);
  return (
    <ComboBox
      placeholder="Pick an entity"
      items={items}
      value={typeof value === 'string' ? value : ''}
      onPick={(id) => onChange(value === id ? '' : id)}
      onClear={() => onChange('')}
      searchPlaceholder={`Search ${entities.length} matching entities`}
    />
  );
}

export function EntityMulti({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  const entities = useMemo(() => filterEntities(field.selector?.filter), [field]);
  const items = useMemo(() => entityItems(entities), [entities]);
  const arr: string[] = Array.isArray(value) ? value : [];
  return (
    <ComboBox
      multiple
      placeholder="Pick entities"
      items={items}
      values={arr}
      onPick={(id) =>
        onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
      }
      searchPlaceholder={`Search ${entities.length} matching entities`}
    />
  );
}

/* ---------------- select ---------------- */

export function SelectField({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  const opts: any[] = field.selector?.options ?? [];
  const items: ComboItem[] = opts.map((o) => {
    const v = typeof o === 'string' ? o : o.value;
    const label = typeof o === 'string' ? o : (o.label ?? o.value);
    return { id: String(v), headline: String(label) };
  });
  return (
    <ComboBox
      placeholder="Select"
      items={items}
      value={value == null ? '' : String(value)}
      onPick={(id) => {
        const orig = opts.find((o) => String(typeof o === 'string' ? o : o.value) === id);
        onChange(typeof orig === 'string' ? orig : (orig?.value ?? id));
      }}
      searchPlaceholder="Search options"
    />
  );
}

/* ---------------- number (slider + box) ---------------- */

export function NumberField({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  const s = field.selector ?? {};
  const isBox = s.mode === 'box' || s.min === undefined || s.max === undefined;
  const unit = s.unit_of_measurement ?? '';
  const step = s.step ?? 1;
  const num = typeof value === 'number' ? value : Number(value ?? s.min ?? 0);
  const clamp = (n: number) => {
    if (Number.isNaN(n)) return n;
    if (s.min !== undefined) n = Math.max(s.min, n);
    if (s.max !== undefined) n = Math.min(s.max, n);
    return n;
  };
  if (isBox) {
    return (
      <span style={{ display: 'flex', alignItems: 'center' }}>
        <input
          className="ha2-text"
          style={{ flex: 1 }}
          type="number"
          min={s.min}
          max={s.max}
          step={step}
          value={Number.isNaN(num) ? '' : num}
          onChange={(e) => onChange(e.target.value === '' ? undefined : clamp(Number(e.target.value)))}
        />
        {unit && <span className="ha2-unit">{unit}</span>}
      </span>
    );
  }
  const min = s.min ?? 0;
  const max = s.max ?? 100;
  const fill = max === min ? 0 : ((num - min) / (max - min)) * 100;
  return (
    <div className="ha2-numrow">
      <input
        type="range"
        className="ha2-range"
        aria-label={field.name}
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(num) ? min : num}
        style={{ ['--fill' as any]: `${Math.max(0, Math.min(100, fill))}%` }}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      <input
        type="number"
        className="ha2-num"
        aria-label={`${field.name} value`}
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(num) ? '' : num}
        onChange={(e) => onChange(e.target.value === '' ? undefined : clamp(Number(e.target.value)))}
      />
      {unit && <span className="ha2-unit">{unit}</span>}
    </div>
  );
}

/* ---------------- text ---------------- */

export function TextField({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.selector?.multiline) {
    return (
      <textarea
        className="ha2-text"
        rows={3}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      className="ha2-text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ---------------- boolean ---------------- */

export function BooleanField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="ha2-switch-row">
      <span className="ha2-switch">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span className="tr" />
        <span className="th" />
      </span>
    </div>
  );
}

/* ---------------- duration ---------------- */

export function DurationField({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  const v = typeof value === 'object' && value !== null ? value : {};
  const parts = [...(field.selector?.enable_day ? ['days'] : []), 'hours', 'minutes', 'seconds'];
  const labels: Record<string, string> = { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' };
  return (
    <div className="ha2-dur">
      {parts.map((p) => (
        <div className="ha2-dur-part" key={p}>
          <label>{labels[p]}</label>
          <input
            className="ha2-text ha2-num"
            style={{ width: '100%', textAlign: 'left' }}
            type="number"
            min={0}
            value={v[p] ?? 0}
            onChange={(e) =>
              onChange({ ...v, [p]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
            }
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------- condition / action ---------------- */

export function ConditionActionField({
  kind,
  value,
  onChange,
}: {
  kind: string;
  value: any;
  onChange: (v: any) => void;
}) {
  const arr: any[] = Array.isArray(value) ? value : [];
  const add = () =>
    onChange([
      ...arr,
      kind === 'condition'
        ? { condition: 'state', entity_id: '' }
        : { action: 'notify.notify', data: { message: 'Hello' } },
    ]);
  return (
    <div>
      {arr.length === 0 && <div className="ha2-empty-note">No {kind}s — optional.</div>}
      {arr.map((item, i) => (
        <div className="ha2-yamlitem" key={i}>
          <span>
            {i + 1}. {JSON.stringify(item).slice(0, 90)}
          </span>
          <button
            type="button"
            className="ha2-x"
            aria-label="Remove"
            onClick={() => onChange(arr.filter((_, j) => j !== i))}
          >
            <MdiIcon name="close" size={18} />
          </button>
        </div>
      ))}
      <button type="button" className="ha2-add" onClick={add}>
        <MdiIcon name="plus" size={18} /> Add {kind}
      </button>
    </div>
  );
}

/* ---------------- colour ---------------- */

export function ColorRgbField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const rgb = Array.isArray(value) ? value : [255, 214, 170];
  return (
    <div className="ha2-colortop">
      <input
        type="color"
        className="ha2-colorwell"
        title="Pick colour"
        value={rgbToHex(rgb)}
        onChange={(e) => onChange(hexToRgb(e.target.value))}
        style={{ background: rgbToCss(rgb) }}
      />
      <span className="ha2-hex">
        {rgbToHex(rgb)} · rgb({rgb.join(', ')})
      </span>
    </div>
  );
}

export function ColorTempField({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  const s = field.selector ?? {};
  const min = s.min ?? 2000;
  const max = s.max ?? 6500;
  const num = typeof value === 'number' ? value : Number(value ?? min);
  const fill = ((num - min) / (max - min)) * 100;
  return (
    <div className="ha2-temprow">
      <input
        type="range"
        className="ha2-range"
        aria-label={field.name}
        min={min}
        max={max}
        step={50}
        value={num}
        style={{ ['--fill' as any]: `${Math.max(0, Math.min(100, fill))}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        className="ha2-num"
        aria-label={`${field.name} value`}
        min={min}
        max={max}
        step={50}
        value={num}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ha2-unit">K</span>
    </div>
  );
}

/* ---------------- colour object list ---------------- */

export function ObjectListField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
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
        <div className="ha2-obj" key={i}>
          <div className="ha2-obj-head">
            <span className="grip">
              <MdiIcon name="drag" size={18} />
            </span>
            <span className="ha2-obj-dot" style={{ background: rgbToCss(item?.colour) }} />
            <b>{item?.name || `Colour ${i + 1}`}</b>
            <button type="button" className="ha2-x" aria-label="Move up" onClick={() => move(i, -1)}>
              <MdiIcon name="chevron-up" size={18} />
            </button>
            <button type="button" className="ha2-x" aria-label="Move down" onClick={() => move(i, 1)}>
              <MdiIcon name="chevron-down" size={18} />
            </button>
            <button
              type="button"
              className="ha2-x"
              aria-label="Remove"
              onClick={() => onChange(arr.filter((_, j) => j !== i))}
            >
              <MdiIcon name="close" size={18} />
            </button>
          </div>
          <div className="ha2-obj-body">
            <div>
              <label>Name</label>
              <input
                className="ha2-text"
                style={{ minHeight: 48 }}
                value={item?.name ?? ''}
                onChange={(e) =>
                  onChange(arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
            </div>
            <div>
              <label>Colour</label>
              <ColorRgbField
                value={item?.colour}
                onChange={(c) => onChange(arr.map((x, j) => (j === i ? { ...x, colour: c } : x)))}
              />
            </div>
          </div>
        </div>
      ))}
      {arr.length === 0 && (
        <div className="ha2-empty-note">Empty — HA ignores this preset's colours when duplicating.</div>
      )}
      <button
        type="button"
        className="ha2-add"
        onClick={() => onChange([...arr, { name: `Colour ${arr.length + 1}`, colour: [255, 214, 170] }])}
      >
        <MdiIcon name="plus" size={18} /> Add colour
      </button>
    </div>
  );
}

/* ---------------- dispatcher ---------------- */

export function FieldControl({
  field,
  value,
  onChange,
}: {
  field: BpField;
  value: any;
  onChange: (v: any) => void;
}) {
  switch (field.selectorType) {
    case 'entity':
      return field.selector?.multiple ? (
        <EntityMulti field={field} value={value} onChange={onChange} />
      ) : (
        <EntitySingle field={field} value={value} onChange={onChange} />
      );
    case 'number':
      return <NumberField field={field} value={value} onChange={onChange} />;
    case 'text':
      return <TextField field={field} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanField value={value} onChange={onChange} />;
    case 'duration':
      return <DurationField field={field} value={value} onChange={onChange} />;
    case 'select':
      return <SelectField field={field} value={value} onChange={onChange} />;
    case 'condition':
      return <ConditionActionField kind="condition" value={value} onChange={onChange} />;
    case 'action':
      return <ConditionActionField kind="action" value={value} onChange={onChange} />;
    case 'color_rgb':
      return <ColorRgbField value={value} onChange={onChange} />;
    case 'color_temp':
      return <ColorTempField field={field} value={value} onChange={onChange} />;
    case 'object':
      return <ObjectListField value={value} onChange={onChange} />;
    default:
      return (
        <input
          className="ha2-text"
          value={typeof value === 'string' ? value : JSON.stringify(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

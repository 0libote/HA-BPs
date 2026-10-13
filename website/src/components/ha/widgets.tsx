import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { BpField } from '../../lib/blueprints';
import { reconcileRows, type KeyedRow, type RowState } from '../../lib/keyedRows';
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

function selectedIds(multiple: boolean | undefined, values: any, value: any): string[] {
  if (multiple) return Array.isArray(values) ? values : [];
  return value ? [value] : [];
}

/* Single-select closed value: known entity, unknown id, or placeholder. */
function SingleValue({
  label,
  placeholder,
  items,
  value,
}: Readonly<{
  label?: string;
  placeholder: string;
  items: readonly ComboItem[];
  value: string;
}>) {
  if (!value) return <span className="ha2-placeholder">{placeholder}</span>;
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
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);
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
  const sel: string[] = selectedIds(multi, values, value);
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
                <span className="ha2-chip" key={id}>
                  <code>{it?.headline ?? id}</code>
                  <button
                    type="button"
                    aria-label={`Remove ${id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPick(id);
                    }}
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
            ) : (
              <SingleValue label={label} placeholder={placeholder} items={items} value={multi ? '' : (value ?? '')} />
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
              ref={searchRef}
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

function optValue(o: any): any {
  return typeof o === 'string' ? o : o.value;
}

function optLabel(o: any): string {
  return String(typeof o === 'string' ? o : (o.label ?? o.value));
}

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
    const v = optValue(o);
    return { id: String(v), headline: optLabel(o) };
  });
  return (
    <ComboBox
      placeholder="Select"
      items={items}
      value={value == null ? '' : String(value)}
      onPick={(id) => {
        const orig = opts.find((o) => String(optValue(o)) === id);
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
      {parts.map((p) => {
        const id = `dur-${field.key}-${p}`;
        return (
          <div className="ha2-dur-part" key={p}>
            <label htmlFor={id}>{labels[p]}</label>
            <input
              id={id}
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
        );
      })}
    </div>
  );
}

/* ---------------- condition / action ---------------- */

const EMPTY_ROWS: any[] = [];

function useKeyedRows(value: any, onChange: (v: any[]) => void) {
  const values: any[] = Array.isArray(value) ? value : EMPTY_ROWS;
  const [state, setState] = useState<RowState<any>>(() =>
    reconcileRows({ values: EMPTY_ROWS, rows: [], nextKey: 0 }, values),
  );
  // Restore/reset can replace the parent's values. Reconcile before rendering
  // so surviving rows retain identity without storing keys in drafts or YAML.
  let current = state;
  if (state.values !== values) {
    current = reconcileRows(state, values);
    setState(current);
  }
  const update = (rows: KeyedRow<any>[], nextKey = current.nextKey) => {
    const nextValues = rows.map((row) => row.value);
    setState({ values: nextValues, rows, nextKey });
    onChange(nextValues);
  };
  const add = (item: any) =>
    update([...current.rows, { key: current.nextKey, value: item }], current.nextKey + 1);
  return { rows: current.rows, update, add };
}

export function ConditionActionField({
  kind,
  value,
  onChange,
}: {
  kind: string;
  value: any;
  onChange: (v: any) => void;
}) {
  const { rows, update, add: addRow } = useKeyedRows(value, onChange);
  const add = () => {
    const item =
      kind === 'condition'
        ? { condition: 'state', entity_id: '' }
        : { action: 'notify.notify', data: { message: 'Hello' } };
    addRow(item);
  };
  const removeAt = (key: number) => update(rows.filter((row) => row.key !== key));
  return (
    <div>
      {rows.length === 0 && <div className="ha2-empty-note">No {kind}s — optional.</div>}
      {rows.map((row, i) => (
        <div className="ha2-yamlitem" key={row.key}>
          <span>
            {i + 1}. {JSON.stringify(row.value).slice(0, 90)}
          </span>
          <button
            type="button"
            className="ha2-x"
            aria-label="Remove"
            onClick={() => removeAt(row.key)}
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

export function ColorRgbField({
  inputId,
  value,
  onChange,
}: Readonly<{
  inputId?: string;
  value: any;
  onChange: (v: any) => void;
}>) {
  const rgb = Array.isArray(value) ? value : [255, 214, 170];
  return (
    <div className="ha2-colortop">
      <input
        id={inputId}
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

export function ObjectListField({
  idPrefix,
  value,
  onChange,
}: Readonly<{
  idPrefix: string;
  value: any;
  onChange: (v: any) => void;
}>) {
  const instanceId = useId();
  const { rows, update, add } = useKeyedRows(value, onChange);
  const move = (key: number, dir: number) => {
    const i = rows.findIndex((row) => row.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const patch = (key: number, p: Record<string, any>) =>
    update(rows.map((row) => (row.key === key ? { ...row, value: { ...row.value, ...p } } : row)));
  return (
    <div>
      {rows.map((row, i) => {
        const item = row.value;
        const nameId = `${idPrefix}-${instanceId}-name-${row.key}`;
        const colourId = `${idPrefix}-${instanceId}-colour-${row.key}`;
        return (
          <div className="ha2-obj" key={row.key}>
            <div className="ha2-obj-head">
              <span className="grip">
                <MdiIcon name="drag" size={18} />
              </span>
              <span className="ha2-obj-dot" style={{ background: rgbToCss(item?.colour) }} />
              <b>{item?.name || `Colour ${i + 1}`}</b>
              <button type="button" className="ha2-x" aria-label="Move up" onClick={() => move(row.key, -1)}>
                <MdiIcon name="chevron-up" size={18} />
              </button>
              <button type="button" className="ha2-x" aria-label="Move down" onClick={() => move(row.key, 1)}>
                <MdiIcon name="chevron-down" size={18} />
              </button>
              <button
                type="button"
                className="ha2-x"
                aria-label="Remove"
                onClick={() => update(rows.filter((x) => x.key !== row.key))}
              >
                <MdiIcon name="close" size={18} />
              </button>
            </div>
            <div className="ha2-obj-body">
              <div>
                <label htmlFor={nameId}>Name</label>
                <input
                  id={nameId}
                  className="ha2-text"
                  style={{ minHeight: 48 }}
                  value={item?.name ?? ''}
                  onChange={(e) => patch(row.key, { name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={colourId}>Colour</label>
                <ColorRgbField
                  inputId={colourId}
                  value={item?.colour}
                  onChange={(c) => patch(row.key, { colour: c })}
                />
              </div>
            </div>
          </div>
        );
      })}
      {rows.length === 0 && (
        <div className="ha2-empty-note">Empty — HA ignores this preset's colours when duplicating.</div>
      )}
      <button
        type="button"
        className="ha2-add"
        onClick={() =>
          add({ name: `Colour ${rows.length + 1}`, colour: [255, 214, 170] })
        }
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
      return <ObjectListField idPrefix={field.key} value={value} onChange={onChange} />;
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

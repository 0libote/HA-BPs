import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from 'yaml';
import { blueprints, buildAutomationYaml, initialValues } from '../src/lib/blueprints.ts';
import { reconcileRows, type RowState } from '../src/lib/keyedRows.ts';

for (const blueprint of blueprints) {
  test(`${blueprint.slug} export preserves blueprint execution mode and YAML values`, () => {
    const values = initialValues(blueprint);
    const name = 'Room: "manual" # living room\nlights';
    const exported = parse(buildAutomationYaml(blueprint, values, name));
    assert.equal(exported.alias, name);
    assert.equal(exported.mode, undefined);
    assert.equal(exported.use_blueprint.path, `0libote/${blueprint.file}`);
  });
}

test('doorbell export preserves nested custom action data', () => {
  const blueprint = blueprints.find((bp) => bp.slug === 'doorbell-announcement')!;
  const values = initialValues(blueprint);
  values.extra_actions = [{ action: 'notify.send_message', target: { entity_id: 'notify.phone' },
    data: { message: 'Door: front # 1', title: 'Someone is here' } }];
  const exported = parse(buildAutomationYaml(blueprint, values, 'Doorbell'));
  assert.deepEqual(exported.use_blueprint.input.extra_actions, values.extra_actions);
});

test('doorbell export preserves trigger IDs, event payloads and shorthand conditions', () => {
  const blueprint = blueprints.find((bp) => bp.slug === 'doorbell-announcement')!;
  const values = initialValues(blueprint);
  values.extra_conditions = [{ condition: 'trigger', id: 'binary_ring' }, '{{ true }}'];
  values.extra_actions = [
    { event: 'doorbell_custom', event_data: { id: 'front-door', nested: { id: 42 } } },
    { wait_for_trigger: [{ trigger: 'state', entity_id: 'binary_sensor.front_door_doorbell',
      to: 'on', id: 'ring' }] },
  ];
  const exported = parse(buildAutomationYaml(blueprint, values, 'Doorbell'));
  assert.deepEqual(exported.use_blueprint.input.extra_conditions, values.extra_conditions);
  assert.deepEqual(exported.use_blueprint.input.extra_actions, values.extra_actions);
});

test('row identity survives reordering and assigns separate keys to duplicate values', () => {
  const condition = { condition: 'trigger', id: 'binary_ring' };
  const template = '{{ true }}';
  const values = [condition, condition, template, template];
  const initial = reconcileRows<any>({ values: [], rows: [], nextKey: 0 }, values);
  assert.equal(new Set(initial.rows.map((row) => row.key)).size, values.length);
  const reordered = reconcileRows(initial, [template, condition, template, condition]);
  assert.deepEqual(reordered.rows.map((row) => row.key), [2, 0, 3, 1]);
  assert.deepEqual(reordered.rows.map((row) => row.value), [template, condition, template, condition]);
  const surviving = reordered.rows.filter((row) => row.key !== 0);
  assert.equal(surviving.filter((row) => row.value === condition).length, 1);
  assert.equal(condition.id, 'binary_ring');
});

test('adding and removing rows preserves scalar conditions and never reuses removed keys', () => {
  const initial = reconcileRows<any>({ values: [], rows: [], nextKey: 0 }, ['{{ true }}']);
  const added = reconcileRows(initial, [...initial.values, { condition: 'state', entity_id: '' }]);
  assert.equal(added.rows[0], initial.rows[0]);
  assert.equal(added.rows[0].value, '{{ true }}');
  const emptied = reconcileRows(added, []);
  const restored = reconcileRows(emptied, ['{{ true }}']);
  assert.ok(restored.rows[0].key >= added.nextKey);
});

test('editor row wrappers never enter exported colour configuration', () => {
  const blueprint = blueprints.find((bp) => bp.slug === 'bilresa-scroll-wheel')!;
  const values = initialValues(blueprint);
  const field = 'preset_1_colour_presets';
  const state: RowState<any> = reconcileRows({ values: [], rows: [], nextKey: 0 }, values[field]);
  const rows = [...state.rows].reverse();
  rows[0] = { ...rows[0], value: { ...rows[0].value, name: 'Edited colour' } };
  values[field] = rows.map((row) => row.value);
  const exported = parse(buildAutomationYaml(blueprint, values, 'Colours'));
  assert.deepEqual(exported.use_blueprint.input[field], values[field]);
  assert.ok(exported.use_blueprint.input[field].every((item: any) =>
    !('key' in item) && !('value' in item) && !('id' in item)));
});

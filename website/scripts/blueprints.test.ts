import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from 'yaml';
import { blueprints, buildAutomationYaml, initialValues } from '../src/lib/blueprints.ts';

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

"""Run regression scenarios with HA's actual script engine and template globals.

Services are deterministic fakes: this verifies orchestration, not bulb firmware,
Matter radio delivery or a speaker integration's playback/restore support.
Run inside the Home Assistant container, like validate_with_homeassistant.py.
"""
from __future__ import annotations

import asyncio
from datetime import timedelta
from pathlib import Path

from ha_test_support import create_hass
from homeassistant.components.automation.config import async_validate_config_item
from homeassistant.components.blueprint.models import Blueprint, BlueprintInputs
from homeassistant.components.blueprint.schemas import BLUEPRINT_SCHEMA
from homeassistant.core import Context, State
from homeassistant.helpers.script import Script
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util, yaml as yaml_util

ROOT = Path(__file__).resolve().parents[1]


async def main() -> None:
    hass = await create_hass()
    await async_setup_component(hass, "scene", {})
    # A valid TTS engine has no last-used timestamp before its first request.
    hass.states.async_set("tts.test", "unknown")
    calls: list[tuple[str, str, dict]] = []
    user_volume_override: dict[str, float] = {}
    override_after_off = False

    async def service(call):
        calls.append((call.domain, call.service, dict(call.data)))
        ids = call.data.get("entity_id", [])
        ids = [ids] if isinstance(ids, str) else ids
        for entity in ids:
            old = hass.states.get(entity)
            attrs = dict(old.attributes) if old else {}
            if call.domain == "light":
                if "brightness_pct" in call.data:
                    attrs["brightness"] = round(call.data["brightness_pct"] * 255 / 100)
                if "rgb_color" in call.data:
                    attrs["rgb_color"] = call.data["rgb_color"]
                hass.states.async_set(entity, "on" if call.service == "turn_on" else "off", attrs, context=call.context)
                if call.service == "turn_off" and override_after_off:
                    hass.states.async_set("input_boolean.manual", "on")
            elif call.domain == "input_boolean":
                hass.states.async_set(entity, "on", context=call.context)
            elif call.service == "volume_set":
                attrs["volume_level"] = call.data["volume_level"]
                hass.states.async_set(entity, old.state, attrs, context=call.context)
        if call.domain == "tts":
            player = call.data["media_player_entity_id"]
            old = hass.states.get(player)
            hass.states.async_set(player, "playing", old.attributes)

            async def finish():
                await asyncio.sleep(0.02)
                attrs = dict(hass.states.get(player).attributes)
                if player in user_volume_override:
                    attrs["volume_level"] = user_volume_override[player]
                hass.states.async_set(player, "idle", attrs)

            hass.async_create_task(finish())

    for domain, services in {
        "light": ["turn_on", "turn_off"],
        "input_boolean": ["turn_on"],
        "media_player": ["volume_set", "media_stop"],
        "tts": ["speak"],
    }.items():
        for action in services:
            hass.services.async_register(domain, action, service)

    async def config(filename, inputs):
        bp = Blueprint(yaml_util.load_yaml_dict(ROOT / "blueprints" / filename), expected_domain="automation", schema=BLUEPRINT_SCHEMA)
        instance = BlueprintInputs(bp, {"use_blueprint": {"path": filename, "input": inputs}})
        instance.validate()
        return await async_validate_config_item(hass, "automation", instance.async_substitute())

    async def run(cfg, trigger, name="test"):
        hass.states.async_set(f"automation.{name}", "on")
        script = Script(hass, cfg["actions"], name, "automation", variables=cfg.get("variables"))
        result = await script.async_run({"trigger": trigger, "this": hass.states.get(f"automation.{name}").as_dict()}, Context())
        await hass.async_block_till_done()
        return result

    def set_light(state="off", brightness=128):
        hass.states.async_set("light.test", state, {"brightness": brightness, "supported_color_modes": ["brightness"]})

    def aged(entity, state, seconds, attrs=None):
        # Directly install an old State to avoid real-time sleeps in duration tests.
        old_time = dt_util.utcnow() - timedelta(seconds=seconds)
        hass.states._states[entity] = State(entity, state, attrs, last_changed=old_time)

    motion_inputs = {"motion_sensor": ["binary_sensor.motion"], "illuminance_sensor": ["sensor.lux"],
                     "target_lights": ["light.test"], "restore_previous_profile": False,
                     "manual_override": ["input_boolean.manual"], "no_motion_duration": {"seconds": 20},
                     "maximum_runtime": {"seconds": 100}}
    motion = await config("myggspray-auto-lights.yaml", motion_inputs)
    hass.states.async_set("binary_sensor.motion", "on")
    hass.states.async_set("sensor.lux", "5")
    hass.states.async_set("input_boolean.manual", "off")
    set_light()
    trigger = {"id": "motion_changed", "entity_id": "binary_sensor.motion", "to_state": hass.states.get("binary_sensor.motion")}
    await run(motion, trigger)
    assert hass.states.is_state("light.test", "on"), "motion must activate"
    assert hass.states.get("scene.myggspray_test_active") is not None, "session must be owned"

    aged("binary_sensor.motion", "off", 30)
    aged("scene.myggspray_test_active", "unknown", 40)
    await run(motion, {"id": "reconcile"})
    assert hass.states.is_state("light.test", "off"), "continuous clear must clean up"
    assert hass.states.get("scene.myggspray_test_active") is None

    async def start():
        hass.states.async_set("binary_sensor.motion", "on")
        hass.states.async_set("input_boolean.manual", "off")
        set_light()
        await run(motion, trigger)

    await start()
    hass.states.async_set("input_boolean.manual", "on")
    await run(motion, {"id": "override_changed"})
    assert hass.states.is_state("light.test", "on")
    assert hass.states.get("scene.myggspray_test_active") is None, "override releases ownership"

    await start()
    hass.states.async_set("binary_sensor.motion", "unavailable")
    await run(motion, {"id": "reconcile"})
    assert hass.states.is_state("light.test", "on"), "fault must not darken the room"
    assert hass.states.get("scene.myggspray_test_active") is None

    await start()
    aged("scene.myggspray_test_active", "unknown", 110)
    await run(motion, {"id": "reconcile"})
    assert hass.states.is_state("light.test", "on"), "runtime default must release, not force OFF"
    assert hass.states.get("scene.myggspray_test_active") is None

    await start()
    aged("scene.myggspray_test_active", "unknown", 20)
    old = hass.states.get("light.test")
    set_light("on", 230)
    await run(motion, {"id": "target_changed", "entity_id": "light.test", "from_state": old, "to_state": hass.states.get("light.test")})
    assert hass.states.is_state("light.test", "on")
    assert hass.states.get("scene.myggspray_test_active") is None, "physical brightness change releases ownership"

    await start()
    aged("scene.myggspray_test_active", "unknown", 110)
    forced = await config("myggspray-auto-lights.yaml", {**motion_inputs, "runtime_limit_action": "turn_off"})
    await run(forced, {"id": "reconcile"})
    assert hass.states.is_state("light.test", "off"), "explicit forced runtime OFF"

    await start()
    await run(motion, {"id": "reset"})
    assert hass.states.is_state("light.test", "on"), "restart must leave lights alone"
    assert hass.states.get("scene.myggspray_test_active") is None

    multi = await config("myggspray-auto-lights.yaml", {**motion_inputs, "target_lights": ["light.test", "light.second"]})
    hass.states.async_set("binary_sensor.motion", "on")
    hass.states.async_set("input_boolean.manual", "off")
    set_light()
    hass.states.async_set("light.second", "off", {"supported_color_modes": ["brightness"]})
    await run(multi, trigger)
    aged("binary_sensor.motion", "off", 30)
    aged("scene.myggspray_test_active", "unknown", 40)
    override_after_off = True
    await run(multi, {"id": "reconcile"})
    override_after_off = False
    assert hass.states.is_state("light.second", "on"), "override arriving during cleanup protects remaining lights"
    hass.states.async_set("input_boolean.manual", "off")

    missing = await config("myggspray-auto-lights.yaml", {**motion_inputs, "motion_sensor": ["binary_sensor.motion", "binary_sensor.missing"]})
    hass.states.async_set("binary_sensor.motion", "on")
    set_light()
    await run(missing, trigger)
    assert hass.states.is_state("light.test", "off"), "missing sensors must fail closed"

    remote = await config("bilresa-scroll-wheel.yaml", {"preset_1_lights": ["light.test"],
        "centre_layout": "tap_power_hold_colour", "manual_override": ["input_boolean.manual"]})
    set_light()
    for kind, expected in [("initial_press", "off"), ("long_press", "off"), ("multi_press_1", "on")]:
        before = len(calls)
        event = State("event.remote", dt_util.utcnow().isoformat(), {"event_type": kind, "event_types": ["multi_press_1", "long_press", "long_release"]})
        await run(remote, {"id": "preset1_centre", "from_state": State("event.remote", "2020-01-01T00:00:00+00:00"), "to_state": event})
        assert hass.states.is_state("light.test", expected), kind
        if kind in ["initial_press", "long_press"]:
            assert len(calls) == before, "intermediate gestures must be ignored"
    assert hass.states.is_state("input_boolean.manual", "on"), "valid remote gesture sets shared override"
    before = len(calls)
    stale = State("event.remote", "2020-01-01T00:00:00+00:00", {"event_type": "multi_press_1"})
    await run(remote, {"id": "preset1_centre", "from_state": State("event.remote", "2019-01-01T00:00:00+00:00"), "to_state": stale})
    assert len(calls) == before, "restored old timestamp must be ignored"

    safety = await config("forgot-to-turn-off.yaml", {"presence_sensor": ["binary_sensor.motion", "binary_sensor.missing"],
        "target_lights": ["light.test"], "no_presence_duration": {"seconds": 0}})
    hass.states.async_set("binary_sensor.motion", "off")
    set_light("on")
    await run(safety, {"id": "presence_changed"})
    assert hass.states.is_state("light.test", "on"), "missing sensor blocks passive OFF"
    hass.states.async_set("binary_sensor.missing", "off")
    await run(safety, {"id": "presence_changed"})
    assert hass.states.is_state("light.test", "off"), "all-clear passive OFF"

    bell = await config("doorbell-announcement.yaml", {"tts_entity": "tts.test", "media_players": ["media_player.one", "media_player.two"],
        "cleanup_delay": {"seconds": 1}})
    hass.states.async_set("media_player.one", "idle", {"volume_level": 0.2})
    hass.states.async_set("media_player.two", "idle", {"volume_level": 0.8})
    await run(bell, {"id": "binary_ring"})
    assert hass.states.get("media_player.one").attributes["volume_level"] == 0.2
    assert hass.states.get("media_player.two").attributes["volume_level"] == 0.8
    assert not any(domain == "media_player" and action == "media_stop" for domain, action, _ in calls)
    user_volume_override["media_player.one"] = 0.45
    await run(bell, {"id": "binary_ring"})
    assert hass.states.get("media_player.one").attributes["volume_level"] == 0.45, "preserve deliberate volume change"
    assert hass.states.get("media_player.two").attributes["volume_level"] == 0.8
    await hass.async_stop()
    print("PASS: motion ownership, clear time, overrides, faults, runtime, manual takeover, missing sensors, remote gestures/stale events, passive safety and per-speaker volume restoration")


if __name__ == "__main__":
    asyncio.run(main())

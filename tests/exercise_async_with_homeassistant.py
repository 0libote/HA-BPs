"""Exercise queued gestures and interleaved device responses in HA's script engine."""
from __future__ import annotations

import asyncio
from datetime import timedelta
from pathlib import Path

from ha_test_support import create_hass
from homeassistant.components.automation.config import async_validate_config_item
from homeassistant.components.blueprint.models import Blueprint, BlueprintInputs
from homeassistant.components.blueprint.schemas import BLUEPRINT_SCHEMA
from homeassistant.core import Context, State
from homeassistant.exceptions import HomeAssistantError
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
    playback: dict[str, tuple[float, float]] = {}
    finished: set[str] = set()
    early_restores: set[str] = set()
    expected_early_restores: set[str] = set()
    interrupt_activation = False
    interrupt_shutdown = False
    light_delay = 0.02
    failed_light: str | None = None
    failed_tts: str | None = None
    ignore_override = False

    async def service(call):
        calls.append((call.domain, call.service, dict(call.data)))
        ids = call.data.get("entity_id", [])
        ids = [ids] if isinstance(ids, str) else ids
        for entity in ids:
            old = hass.states.get(entity)
            if call.domain == "light":
                if entity == failed_light:
                    raise HomeAssistantError("Expected simulated light failure")
                attrs = dict(old.attributes)
                if "brightness_pct" in call.data:
                    attrs["brightness"] = round(call.data["brightness_pct"] * 255 / 100)
                for key in ("brightness", "rgb_color", "color_temp_kelvin"):
                    if key in call.data:
                        attrs[key] = call.data[key]
                desired_state = "on" if call.service == "turn_on" else "off"

                async def acknowledge(entity=entity, attrs=attrs, desired_state=desired_state, context=call.context):
                    await asyncio.sleep(light_delay)
                    hass.states.async_set(entity, desired_state, attrs, context=context)

                hass.async_create_task(acknowledge())
                if interrupt_activation and call.service == "turn_on":
                    hass.states.async_set("input_boolean.manual", "on")
                if interrupt_shutdown and call.service == "turn_off":
                    hass.states.async_set("binary_sensor.motion", "on")
            elif call.domain == "input_boolean":
                if not ignore_override:
                    hass.states.async_set(entity, "on")
            elif call.domain == "media_player" and call.service == "volume_set":
                if call.data["volume_level"] != 0.6 and entity in playback:
                    if entity not in finished and entity not in expected_early_restores:
                        early_restores.add(entity)
                hass.states.async_set(entity, old.state, {**old.attributes, "volume_level": call.data["volume_level"]})
        if call.domain == "tts":
            entity = call.data["media_player_entity_id"]
            if entity == failed_tts:
                raise HomeAssistantError("Expected simulated TTS failure")
            start_delay, duration = playback.get(entity, (0, 0.02))

            async def speak():
                await asyncio.sleep(start_delay)
                old = hass.states.get(entity)
                hass.states.async_set(entity, "playing", {**old.attributes, "media_content_id": "announcement"})
                await asyncio.sleep(duration)
                finished.add(entity)
                hass.states.async_set(entity, "idle", hass.states.get(entity).attributes)

            hass.async_create_task(speak())

    for domain, actions in {"light": ["turn_on", "turn_off"], "input_boolean": ["turn_on"],
                            "media_player": ["volume_set", "media_stop"], "tts": ["speak"]}.items():
        for action in actions:
            hass.services.async_register(domain, action, service)

    async def runner(filename, inputs, name):
        bp = Blueprint(yaml_util.load_yaml_dict(ROOT / "blueprints" / filename), schema=BLUEPRINT_SCHEMA)
        instance = BlueprintInputs(bp, {"use_blueprint": {"path": filename, "input": inputs}})
        instance.validate()
        cfg = await async_validate_config_item(hass, "automation", instance.async_substitute())
        hass.states.async_set(f"automation.{name}", "on")
        # Reuse the same Script, retaining the blueprint's actual queue/restart semantics.
        script = Script(hass, cfg["actions"], name, "automation", variables=cfg.get("variables"),
                        script_mode=cfg["mode"], max_runs=cfg.get("max", 10))

        async def run(trigger):
            return await script.async_run({"trigger": trigger, "this": hass.states.get(f"automation.{name}").as_dict()}, Context())

        return run

    def light(entity="light.test", state="off", brightness=128, modes=None):
        modes = modes or ["brightness"]
        hass.states.async_set(entity, state, {"brightness": brightness, "supported_color_modes": modes,
                                             "color_mode": modes[0]})

    def age(entity, state, seconds):
        previous = hass.states.get(entity)
        hass.states._states[entity] = State(entity, state, previous.attributes if previous else {},
            last_changed=dt_util.utcnow() - timedelta(seconds=seconds))

    def gesture(kind="multi_press_1", button="right"):
        return {"id": f"preset1_{button}", "from_state": State("event.remote", "unknown"),
                "to_state": State("event.remote", dt_util.utcnow().isoformat(),
                                  {"event_type": kind, "totalNumberOfPressesCounted": 1})}

    remote = await runner("bilresa-scroll-wheel.yaml", {"preset_1_lights": ["light.test"],
        "brightness_transition": 0, "response_timeout": 0.1}, "remote")
    light(state="on")
    before = len(calls)
    await remote({})
    assert len(calls) == before, "manual execution without a device trigger must be a safe no-op"
    await asyncio.gather(remote(gesture()), remote(gesture()))
    assert hass.states.get("light.test").attributes["brightness"] == round(0.7 * 255), "queued wheel events must accumulate delayed brightness feedback"
    await remote(gesture(button="left"))
    assert hass.states.get("light.test").attributes["brightness"] == round(0.6 * 255)

    light(state="on")
    burst = gesture(kind="multi_press_3")
    burst["to_state"] = State("event.remote", dt_util.utcnow().isoformat(), {"event_type": "multi_press_3"})
    await remote(burst)
    assert hass.states.get("light.test").attributes["brightness"] == round(0.8 * 255), "completed event type supplies missing press-count metadata"

    blocked_remote = await runner("bilresa-scroll-wheel.yaml", {"preset_1_lights": ["light.test"],
        "manual_override": ["input_boolean.manual"], "response_timeout": 0.1}, "blocked_remote")
    light()
    hass.states.async_set("input_boolean.manual", "off")
    ignore_override = True
    await blocked_remote(gesture())
    ignore_override = False
    assert hass.states.is_state("light.test", "off"), "failed override acknowledgement must block remote changes"

    power = await runner("bilresa-scroll-wheel.yaml", {"preset_1_lights": ["light.test", "light.second"],
        "centre_layout": "tap_power_hold_colour", "brightness_transition": 0, "response_timeout": 0.1}, "power")
    light()
    light("light.second")
    failed_light = "light.test"
    await power(gesture(button="centre"))
    failed_light = None
    assert hass.states.is_state("light.second", "on"), "one light error must not prevent other power targets"

    reversed_limits = await runner("bilresa-scroll-wheel.yaml", {"preset_1_lights": ["light.test"],
        "brightness_min": 100, "brightness_max": 1, "brightness_transition": 0, "response_timeout": 0.1}, "reversed_limits")
    light()
    await reversed_limits(gesture())
    assert hass.states.get("light.test").attributes["brightness"] == round(0.01 * 255), "wake at the normalized lower bound"

    colour = await runner("bilresa-scroll-wheel.yaml", {"preset_1_lights": ["light.test", "light.white"],
        "colour_transition": 0, "response_timeout": 0.1,
        "preset_1_colour_presets": [{"name": "Red", "colour": [255, 0, 0]}, {"name": "Blue", "colour": [0, 0, 255]}]}, "colour")
    light(modes=["rgb"])
    light("light.white", modes=["color_temp"])
    await asyncio.gather(colour(gesture(button="centre")), colour(gesture(button="centre")))
    assert list(hass.states.get("light.test").attributes["rgb_color"]) == [0, 0, 255]
    assert hass.states.is_state("light.white", "off"), "colour gestures must leave white-only bulbs alone"

    motion_inputs = {"motion_sensor": ["binary_sensor.motion"], "illuminance_sensor": ["sensor.lux"],
        "target_lights": ["light.test"], "manual_override": ["input_boolean.manual"],
        "no_motion_duration": {"seconds": 20}, "maximum_runtime": {"seconds": 100}}
    motion = await runner("myggspray-auto-lights.yaml", motion_inputs, "motion")
    hass.states.async_set("sensor.lux", "5")
    hass.states.async_set("input_boolean.manual", "off")
    hass.states.async_set("binary_sensor.motion", "on")
    motion_trigger = {"id": "motion_changed", "entity_id": "binary_sensor.motion", "to_state": hass.states.get("binary_sensor.motion")}
    light()
    hass.states.async_set("binary_sensor.motion", "off")
    await motion(motion_trigger)
    assert hass.states.is_state("light.test", "off"), "stale queued motion must not start an empty room session"

    hass.states.async_set("binary_sensor.motion", "on")
    await motion(motion_trigger)
    assert hass.states.is_state("light.test", "on"), "activation must await asynchronous ON feedback"
    age("scene.myggspray_motion_active", "unknown", 20)
    old = hass.states.get("light.test")
    attrs = {**old.attributes, "brightness": 220}
    changed = State("light.test", "on", attrs, context=Context(user_id="user"))
    hass.states.async_set("light.test", "on", attrs)
    await motion({"id": "target_changed", "entity_id": "light.test", "from_state": old, "to_state": changed})
    assert hass.states.get("scene.myggspray_motion_active") is None
    profile = "scene.myggspray_motion_test_profile"
    assert hass.states.get(profile) is not None, "manual takeover must teach the new normal profile"
    light(state="on", brightness=50)
    await hass.services.async_call("scene", "turn_on", {"entity_id": profile}, blocking=True, context=Context())
    await hass.async_block_till_done()
    assert hass.states.get("light.test").attributes["brightness"] == 220, "learn the takeover event's actual brightness"

    light()
    await motion(motion_trigger)
    age("scene.myggspray_motion_active", "unknown", 20)
    old = hass.states.get("light.test")
    attrs = {**old.attributes, "effect": "rainbow"}
    hass.states.async_set("light.test", "on", attrs)
    await motion({"id": "target_changed", "entity_id": "light.test", "from_state": old, "to_state": hass.states.get("light.test")})
    assert hass.states.get("scene.myggspray_motion_active") is None, "physical effect changes must release ownership too"

    multi_motion = await runner("myggspray-auto-lights.yaml", {**motion_inputs, "target_lights": ["light.test", "light.second"]}, "multi_motion")
    light()
    light("light.second")
    interrupt_activation = True
    await multi_motion(motion_trigger)
    interrupt_activation = False
    await hass.async_block_till_done()
    assert hass.states.is_state("light.second", "off"), "override arriving during activation blocks remaining bulbs"
    assert hass.states.get("scene.myggspray_multi_motion_active") is None

    safety = await runner("forgot-to-turn-off.yaml", {"presence_sensor": ["binary_sensor.motion"],
        "target_lights": ["light.test", "light.second"], "no_presence_duration": {"seconds": 0}}, "safety")
    light(state="on")
    light("light.second", state="on")
    hass.states.async_set("binary_sensor.motion", "off")
    interrupt_shutdown = True
    await safety({"id": "presence_changed"})
    interrupt_shutdown = False
    await hass.async_block_till_done()
    assert sum(hass.states.is_state(entity, "on") for entity in ["light.test", "light.second"]) == 1, "presence returning during passive cleanup protects remaining bulbs"

    restarted_safety = await runner("forgot-to-turn-off.yaml", {"presence_sensor": ["binary_sensor.motion"],
        "target_lights": ["light.test"], "no_presence_duration": {"seconds": 0.1}}, "restarted_safety")
    light(state="on")
    hass.states.async_set("binary_sensor.motion", "off")
    countdown = asyncio.create_task(restarted_safety({"id": "presence_changed"}))
    await asyncio.sleep(0.02)
    hass.states.async_set("binary_sensor.motion", "on")
    await restarted_safety({"id": "presence_changed"})
    await countdown
    await asyncio.sleep(0.12)
    assert hass.states.is_state("light.test", "on"), "restart mode must cancel the waiting clear countdown"

    bell = await runner("doorbell-announcement.yaml", {"tts_entity": "tts.test", "media_players": ["media_player.fast", "media_player.slow"],
        "startup_timeout": 0.1, "cleanup_delay": {"seconds": 0.2}}, "bell")
    playback.update({"media_player.fast": (0, 0.01), "media_player.slow": (0.04, 0.02)})
    for entity, volume in [("media_player.fast", 0.2), ("media_player.slow", 0.8)]:
        hass.states.async_set(entity, "idle", {"volume_level": volume})
    await bell({"id": "binary_ring"})
    assert finished == set(playback), "wait for slow speakers even if the first finishes early"
    assert hass.states.get("media_player.slow").attributes["volume_level"] == 0.8

    # A speaker starting after the startup bound needs the full fallback delay.
    finished.clear()
    playback["media_player.slow"] = (0.12, 0.02)
    await bell({"id": "binary_ring"})
    assert finished == set(playback)
    finished.clear()
    playback.pop("media_player.fast")
    failed_tts = "media_player.fast"
    await bell({"id": "binary_ring"})
    failed_tts = None
    assert "media_player.slow" in finished, "one TTS failure must not prevent other speakers"
    assert hass.states.get("media_player.fast").attributes["volume_level"] == 0.2
    assert hass.states.get("media_player.slow").attributes["volume_level"] == 0.8
    expected_early_restores.add("media_player.zero")
    playback["media_player.zero"] = (0, 1)
    for zero in [{"seconds": 0}, "00:00:00", 0]:
        finished.discard("media_player.zero")
        hass.states.async_set("media_player.zero", "idle", {"volume_level": 0.35})
        zero_bell = await runner("doorbell-announcement.yaml", {"tts_entity": "tts.test",
            "media_players": ["media_player.zero"], "cleanup_delay": zero, "startup_timeout": 0.05}, "zero_bell")
        await asyncio.wait_for(zero_bell({"id": "binary_ring"}), timeout=0.5)
        assert hass.states.get("media_player.zero").attributes["volume_level"] == 0.35, "zero timeout must restore instead of becoming an unlimited wait"
        await hass.async_block_till_done()

    hass.states.async_set("tts.test", "unavailable")
    hass.states.async_set("input_boolean.notification", "off")
    offline_bell = await runner("doorbell-announcement.yaml", {"tts_entity": "tts.test",
        "media_players": ["media_player.slow"], "extra_actions": [{"action": "input_boolean.turn_on",
            "target": {"entity_id": "input_boolean.notification"}}]}, "offline_bell")
    before = len(calls)
    await offline_bell({"id": "binary_ring"})
    assert hass.states.is_state("input_boolean.notification", "on"), "TTS outage must not suppress extra actions"
    assert all(domain != "media_player" for domain, _, _ in calls[before:]), "do not alter volumes when TTS is unavailable"
    assert not early_restores, f"volume restored before playback finished: {early_restores}"
    await hass.async_stop()
    print("PASS: delayed queued wheel/colour feedback, mixed light capabilities, reversed bounds, stale motion, profile takeover, activation/cleanup races and late speaker startup")


if __name__ == "__main__":
    asyncio.run(main())

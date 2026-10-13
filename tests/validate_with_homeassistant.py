from __future__ import annotations

import asyncio
import re
import traceback
from pathlib import Path

from homeassistant.components.blueprint.models import Blueprint, BlueprintInputs
from homeassistant.components.automation.config import async_validate_config_item
from ha_test_support import create_hass
from homeassistant.components.blueprint.schemas import BLUEPRINT_SCHEMA
from homeassistant.util import yaml as yaml_util

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT_MARKER_RE = re.compile(r"(?m)^blueprint:\s*(?:#.*)?$")
EXCLUDED_DIRS = {".git", ".github", ".venv", "venv", "ha-config", "__pycache__"}


def blueprint_files() -> list[Path]:
    files: list[Path] = []

    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".yaml", ".yml"}:
            continue
        if any(part in EXCLUDED_DIRS for part in path.relative_to(ROOT).parts):
            continue

        raw = path.read_text(encoding="utf-8")
        if BLUEPRINT_MARKER_RE.search(raw):
            files.append(path)

    return sorted(files)


def fixture_inputs(blueprint: Blueprint) -> dict:
    """Valid example entities for required inputs; retain defaults elsewhere."""
    domains = {
        "doorbell_sensors": ["binary_sensor.doorbell"],
        "tts_entity": "tts.test",
        "media_players": ["media_player.test"],
        "motion_sensor": ["binary_sensor.motion"],
        "presence_sensor": ["binary_sensor.presence"],
        "illuminance_sensor": ["sensor.lux"],
        "target_lights": ["light.test"],
    }
    return {key: domains[key] for key, value in blueprint.inputs.items()
            if "default" not in value}


async def main() -> None:
    files = blueprint_files()
    if not files:
        raise SystemExit("No Home Assistant blueprint YAML files were found")

    failures: list[str] = []
    hass = await create_hass()

    for path in files:
        relative = path.relative_to(ROOT)
        try:
            data = yaml_util.load_yaml_dict(path)
            blueprint = Blueprint(
                data,
                path=str(relative),
                expected_domain=None,
                schema=BLUEPRINT_SCHEMA,
            )
            inputs = BlueprintInputs(blueprint, {
                "use_blueprint": {"path": str(relative), "input": fixture_inputs(blueprint)}
            })
            inputs.validate()
            automation = inputs.async_substitute()
            # Validate action blocks, conditions and platform-specific triggers,
            # not just the outer blueprint metadata and selectors.
            validated = await async_validate_config_item(hass, "automation", automation)
            if validated is None:
                raise ValueError("expanded automation failed Home Assistant validation")
        except Exception as err:  # Home Assistant wraps schema/load errors by type.
            traceback.print_exc()
            failures.append(f"{relative}: {err}")
            continue

        print(f"OK: {relative} ({blueprint.domain})")

    await hass.async_stop()

    if failures:
        print("\nHome Assistant blueprint validation failed:")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())

from __future__ import annotations

import re
from pathlib import Path

from homeassistant.components.blueprint.models import Blueprint
from homeassistant.components.blueprint.schemas import BLUEPRINT_SCHEMA
from homeassistant.components.frontend import THEME_SCHEMA
from homeassistant.components.lovelace import CONFIG_SCHEMA as LOVELACE_CONFIG_SCHEMA
from homeassistant.util import yaml as yaml_util

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT_MARKER_RE = re.compile(r"(?m)^blueprint:\s*(?:#.*)?$")
EXCLUDED_DIRS = {".git", ".github", ".venv", "venv", "ha-config", "__pycache__"}
THEME_PATH = ROOT / "themes" / "clean-home" / "clean-home.yaml"
DASHBOARD_PATH = ROOT / "themes" / "clean-home" / "example-dashboard.yaml"


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


def main() -> None:
    files = blueprint_files()
    if not files:
        raise SystemExit("No Home Assistant blueprint YAML files were found")

    failures: list[str] = []

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
        except Exception as err:  # Home Assistant wraps schema/load errors by type.
            failures.append(f"{relative}: {err}")
            continue

        print(f"OK: {relative} ({blueprint.domain})")

    try:
        themes = yaml_util.load_yaml_dict(THEME_PATH)
        for theme_name, theme in themes.items():
            THEME_SCHEMA(theme)
            print(f"OK: {THEME_PATH.relative_to(ROOT)} ({theme_name})")
    except Exception as err:
        failures.append(f"{THEME_PATH.relative_to(ROOT)}: {err}")

    try:
        yaml_util.load_yaml_dict(DASHBOARD_PATH)
        LOVELACE_CONFIG_SCHEMA(
            {
                "lovelace": {
                    "dashboards": {
                        "clean-home": {
                            "mode": "yaml",
                            "filename": DASHBOARD_PATH.name,
                            "title": "Clean Home",
                        }
                    }
                }
            }
        )
        print(f"OK: {DASHBOARD_PATH.relative_to(ROOT)} (YAML dashboard)")
    except Exception as err:
        failures.append(f"{DASHBOARD_PATH.relative_to(ROOT)}: {err}")

    if failures:
        print("\nHome Assistant blueprint validation failed:")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()

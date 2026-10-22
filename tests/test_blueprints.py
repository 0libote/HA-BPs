from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
INPUT_REF_RE = re.compile(r"!input\s+([A-Za-z0-9_]+)")
EXPAND_SELF_COMPARISON_RE = re.compile(
    r"expand\((?P<var>[A-Za-z0-9_]+)\)\s*\|\s*count\s*(?P<op>==|!=)\s*(?P=var)\s*\|"
)
BLUEPRINT_MARKER_RE = re.compile(r"(?m)^blueprint:\s*(?:#.*)?$")
EXCLUDED_DIRS = {".git", ".github", ".venv", "venv", "ha-config", "__pycache__"}
SOURCE_URL_BASE = "https://github.com/0libote/HA-BPs/blob/main/"


class BlueprintLoader(yaml.SafeLoader):
    """YAML loader that keeps Home Assistant !input tags parseable."""


def _input_constructor(loader: BlueprintLoader, node: yaml.Node) -> str:
    return loader.construct_scalar(node)


BlueprintLoader.add_constructor("!input", _input_constructor)


def blueprint_files() -> list[Path]:
    """Find blueprint YAML files anywhere in the repository.

    Files are identified by a top-level ``blueprint:`` marker rather than by
    filename or directory, so the repository can contain other YAML files too.
    """
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


def load_blueprint(path: Path) -> dict:
    data = yaml.load(path.read_text(encoding="utf-8"), Loader=BlueprintLoader)
    assert isinstance(data, dict), f"{path.relative_to(ROOT)}: root must be a mapping"
    return data


def flatten_inputs(input_tree: dict) -> dict[str, dict]:
    """Flatten normal inputs and Home Assistant input sections."""
    flattened: dict[str, dict] = {}

    for key, value in input_tree.items():
        if isinstance(value, dict) and isinstance(value.get("input"), dict):
            for nested_key, nested_value in value["input"].items():
                assert nested_key not in flattened, (
                    f"Duplicate blueprint input {nested_key!r} across input sections"
                )
                flattened[nested_key] = nested_value
        else:
            assert key not in flattened, f"Duplicate blueprint input {key!r}"
            flattened[key] = value

    return flattened


def blueprint_id(path: Path) -> str:
    return str(path.relative_to(ROOT))


def test_repository_contains_blueprints() -> None:
    assert blueprint_files(), "No Home Assistant blueprint YAML files were found"


@pytest.mark.parametrize("path", blueprint_files(), ids=blueprint_id)
def test_blueprint_yaml_and_required_metadata(path: Path) -> None:
    data = load_blueprint(path)
    metadata = data.get("blueprint")

    assert isinstance(metadata, dict), f"{blueprint_id(path)}: missing blueprint metadata"
    assert metadata.get("name"), f"{blueprint_id(path)}: blueprint.name is required"
    assert metadata.get("domain"), f"{blueprint_id(path)}: blueprint.domain is required"
    assert isinstance(metadata.get("input", {}), dict), (
        f"{blueprint_id(path)}: blueprint.input must be a mapping"
    )


@pytest.mark.parametrize("path", blueprint_files(), ids=blueprint_id)
def test_source_url_matches_repository_path(path: Path) -> None:
    data = load_blueprint(path)
    expected = SOURCE_URL_BASE + path.relative_to(ROOT).as_posix()

    assert data["blueprint"].get("source_url") == expected, (
        f"{blueprint_id(path)}: source_url must be {expected}"
    )


@pytest.mark.parametrize("path", blueprint_files(), ids=blueprint_id)
def test_all_input_references_exist(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")
    data = load_blueprint(path)
    inputs = flatten_inputs(data["blueprint"].get("input", {}))
    references = set(INPUT_REF_RE.findall(raw))

    missing = sorted(references - set(inputs))
    assert not missing, f"{blueprint_id(path)}: undefined !input references: {missing}"


@pytest.mark.parametrize("path", blueprint_files(), ids=blueprint_id)
def test_every_declared_input_is_used(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")
    data = load_blueprint(path)
    inputs = flatten_inputs(data["blueprint"].get("input", {}))
    references = set(INPUT_REF_RE.findall(raw))

    unused = sorted(set(inputs) - references)
    assert not unused, f"{blueprint_id(path)}: declared but unused inputs: {unused}"


def test_myggspray_supports_separate_sensor_groups() -> None:
    data = load_blueprint(ROOT / "blueprints/myggspray-auto-lights.yaml")
    inputs = flatten_inputs(data["blueprint"]["input"])

    assert inputs["motion_sensor"]["selector"]["entity"]["multiple"] is True
    assert inputs["illuminance_sensor"]["selector"]["entity"]["multiple"] is True


def test_myggspray_health_checks_allow_group_targets() -> None:
    """Health checks must tolerate group inputs.

    expand() resolves a group to its members, so the resolved count can exceed
    the input count. Exact-count equality silently disables the automation for
    group targets (e.g. a light group), so the comparison must be >= while
    still rejecting unknown/unavailable states.
    """
    data = load_blueprint(ROOT / "blueprints/myggspray-auto-lights.yaml")
    actions = data["actions"]
    assert isinstance(actions, list)
    templates = {}
    for step in actions:
        variables = step.get("variables") if isinstance(step, dict) else None
        if not isinstance(variables, dict):
            continue
        for name in ("sensors_healthy", "lights_healthy", "override_clear"):
            if name in variables:
                templates[name] = variables[name]
    assert set(templates) == {"sensors_healthy", "lights_healthy", "override_clear"}

    for name, template in templates.items():
        flat = " ".join(str(template).split())
        assert "expand(" in flat
        assert "| count >= " in flat, (
            f"{name}: must use >= so group targets stay healthy"
        )
        assert "rejectattr" in flat


def test_expand_count_checks_allow_group_targets() -> None:
    """No blueprint may compare expand() counts for (in)equality with inputs.

    expand() resolves a group to its members, so `expand(x) | count == x`
    is false for group targets and `!=` is always true for them. Compare
    against the input count with >= / <, or compare filtered counts with 0.
    """
    offenders = []
    for path in blueprint_files():
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), 1
        ):
            if EXPAND_SELF_COMPARISON_RE.search(line):
                offenders.append(f"{blueprint_id(path)}:{lineno}")
    assert not offenders, (
        "expand()/input count (in)equality breaks group targets: "
        + ", ".join(offenders)
    )


def test_doorbell_supports_multiple_triggers_and_speakers() -> None:
    data = load_blueprint(ROOT / "blueprints/doorbell-announcement.yaml")
    inputs = flatten_inputs(data["blueprint"]["input"])

    assert inputs["doorbell_sensors"]["selector"]["entity"]["multiple"] is True
    assert inputs["media_players"]["selector"]["entity"]["multiple"] is True
    assert inputs["tts_entity"]["selector"]["entity"]["filter"] == [
        {"domain": "tts"}
    ]


def test_showcase_catalogue_matches_current_blueprints() -> None:
    catalogue = json.loads((ROOT / "website/src/data/blueprints.json").read_text())
    entries = {entry["file"]: entry for entry in catalogue["blueprints"]}
    paths = blueprint_files()
    assert set(entries) == {path.name for path in paths}
    for path in paths:
        assert entries[path.name]["rawYaml"] == path.read_text(), (
            f"{path.name}: regenerate the website catalogue after changing a blueprint"
        )

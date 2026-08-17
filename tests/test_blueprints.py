from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT_GLOBS = ("*.yaml", "*.yml", "*.YAML", "*.YML")
INPUT_REF_RE = re.compile(r"!input\s+([A-Za-z0-9_]+)")


class BlueprintLoader(yaml.SafeLoader):
    """YAML loader that keeps Home Assistant !input tags parseable."""


def _input_constructor(loader: BlueprintLoader, node: yaml.Node) -> str:
    return loader.construct_scalar(node)


BlueprintLoader.add_constructor("!input", _input_constructor)


def blueprint_files() -> list[Path]:
    files: set[Path] = set()
    for pattern in BLUEPRINT_GLOBS:
        files.update(ROOT.glob(pattern))
    return sorted(path for path in files if path.is_file())


def load_blueprint(path: Path) -> dict:
    data = yaml.load(path.read_text(encoding="utf-8"), Loader=BlueprintLoader)
    assert isinstance(data, dict), f"{path.name}: root must be a mapping"
    return data


def flatten_inputs(input_tree: dict) -> dict[str, dict]:
    """Flatten normal inputs and HA input sections into one input mapping."""
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


@pytest.mark.parametrize("path", blueprint_files(), ids=lambda p: p.name)
def test_blueprint_yaml_and_required_metadata(path: Path) -> None:
    data = load_blueprint(path)
    metadata = data.get("blueprint")
    assert isinstance(metadata, dict), f"{path.name}: missing blueprint metadata"
    assert metadata.get("name"), f"{path.name}: blueprint.name is required"
    assert metadata.get("domain") == "automation", (
        f"{path.name}: expected an automation blueprint"
    )
    assert isinstance(metadata.get("input", {}), dict), (
        f"{path.name}: blueprint.input must be a mapping"
    )


@pytest.mark.parametrize("path", blueprint_files(), ids=lambda p: p.name)
def test_all_input_references_exist(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")
    data = load_blueprint(path)
    inputs = flatten_inputs(data["blueprint"].get("input", {}))
    references = set(INPUT_REF_RE.findall(raw))

    missing = sorted(references - set(inputs))
    assert not missing, f"{path.name}: undefined !input references: {missing}"


@pytest.mark.parametrize("path", blueprint_files(), ids=lambda p: p.name)
def test_every_declared_input_is_used(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")
    data = load_blueprint(path)
    inputs = flatten_inputs(data["blueprint"].get("input", {}))
    references = set(INPUT_REF_RE.findall(raw))

    unused = sorted(set(inputs) - references)
    assert not unused, f"{path.name}: declared but unused inputs: {unused}"


def test_bilresa_has_one_section_per_preset() -> None:
    path = ROOT / "BILRESA scroll wheel.YAML"
    if not path.exists():
        pytest.skip("BILRESA blueprint is not present")

    data = load_blueprint(path)
    input_tree = data["blueprint"]["input"]

    assert list(input_tree) == ["preset_1", "preset_2", "preset_3"]
    for preset in (1, 2, 3):
        section = input_tree[f"preset_{preset}"]
        assert isinstance(section.get("input"), dict)


def test_bilresa_colour_lists_are_ordered_rgb_objects() -> None:
    path = ROOT / "BILRESA scroll wheel.YAML"
    if not path.exists():
        pytest.skip("BILRESA blueprint is not present")

    data = load_blueprint(path)

    for preset in (1, 2, 3):
        section_inputs = data["blueprint"]["input"][f"preset_{preset}"]["input"]
        colour_input = section_inputs[f"preset_{preset}_colour_presets"]
        selector = colour_input["selector"]["object"]

        assert selector.get("multiple") is True
        assert selector.get("label_field") == "name"
        fields = selector.get("fields", {})
        assert "text" in fields["name"]["selector"]
        assert "color_rgb" in fields["colour"]["selector"]

        defaults = colour_input.get("default", [])
        assert defaults, f"Preset {preset} should ship with colour defaults"
        for item in defaults:
            assert set(item) == {"name", "colour"}
            rgb = item["colour"]
            assert isinstance(rgb, list) and len(rgb) == 3
            assert all(isinstance(value, int) and 0 <= value <= 255 for value in rgb)

from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
INPUT_REF_RE = re.compile(r"!input\s+([A-Za-z0-9_]+)")
BLUEPRINT_MARKER_RE = re.compile(r"(?m)^blueprint:\s*(?:#.*)?$")
EXCLUDED_DIRS = {".git", ".github", ".venv", "venv", "ha-config", "__pycache__"}


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

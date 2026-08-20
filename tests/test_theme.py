from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
THEME_PATH = ROOT / "themes" / "clean-home" / "clean-home.yaml"
DASHBOARD_PATH = ROOT / "themes" / "clean-home" / "example-dashboard.yaml"
MARKDOWN_LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


def load_yaml(path: Path) -> dict:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert isinstance(data, dict), f"{path.relative_to(ROOT)} must be a mapping"
    return data


def relative_luminance(hex_colour: str) -> float:
    channels = [int(hex_colour[index : index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [
        channel / 12.92
        if channel <= 0.04045
        else ((channel + 0.055) / 1.055) ** 2.4
        for channel in channels
    ]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast_ratio(foreground: str, background: str) -> float:
    lighter, darker = sorted(
        (relative_luminance(foreground), relative_luminance(background)),
        reverse=True,
    )
    return (lighter + 0.05) / (darker + 0.05)


def nested_types(value: object) -> list[str]:
    if isinstance(value, dict):
        types = [value["type"]] if isinstance(value.get("type"), str) else []
        return types + [item for child in value.values() for item in nested_types(child)]
    if isinstance(value, list):
        return [item for child in value for item in nested_types(child)]
    return []


def test_clean_home_has_light_and_dark_modes() -> None:
    themes = load_yaml(THEME_PATH)
    assert set(themes) == {"Clean Home"}

    theme = themes["Clean Home"]
    assert isinstance(theme, dict)
    assert set(theme.get("modes", {})) == {"light", "dark"}


@pytest.mark.parametrize("mode", ["light", "dark"])
@pytest.mark.parametrize("text_key", ["primary-text-color", "secondary-text-color"])
def test_theme_text_contrast(mode: str, text_key: str) -> None:
    theme = load_yaml(THEME_PATH)["Clean Home"]
    colours = theme["modes"][mode]
    ratio = contrast_ratio(colours[text_key], colours["card-background-color"])

    assert ratio >= 4.5, f"{mode} {text_key} contrast is only {ratio:.2f}:1"


def test_example_dashboard_uses_native_cards() -> None:
    dashboard = load_yaml(DASHBOARD_PATH)
    assert dashboard.get("title") == "Clean Home Demo"
    assert isinstance(dashboard.get("views"), list) and dashboard["views"]
    assert "Clean Home" in str(dashboard)

    custom_types = sorted(
        card_type for card_type in nested_types(dashboard) if card_type.startswith("custom:")
    )
    assert not custom_types, f"Example dashboard requires custom cards: {custom_types}"


def test_relative_markdown_links_resolve() -> None:
    failures: list[str] = []

    for markdown in ROOT.rglob("*.md"):
        for target in MARKDOWN_LINK_RE.findall(markdown.read_text(encoding="utf-8")):
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue

            destination = (markdown.parent / target.split("#", 1)[0]).resolve()
            if not destination.exists():
                failures.append(f"{markdown.relative_to(ROOT)} -> {target}")

    assert not failures, "Missing relative Markdown links:\n" + "\n".join(failures)

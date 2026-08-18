# Clean Home

A clean Home Assistant theme aimed at being easy to read and easy to use without making Home Assistant feel like a completely different app.

It is based on the light/dark dashboard mock-up: bright white cards in light mode, deep navy cards in dark mode, blue controls, semantic green/orange/red states, large labels and heavily rounded surfaces.

## What it changes

- One theme with native **light and dark modes**.
- **22 px rounded cards**.
- Rounded Tile-card controls/features.
- Larger Tile labels and headings.
- High-contrast text intended to remain readable at a glance.
- Softer dark mode rather than pure black.
- Blue for normal interaction, yellow for active lights, green for safe/locked states and red for warnings/unlocked states.
- No HACS dependency for the main theme.

## Files

- `clean-home.yaml` - the actual Home Assistant theme.
- `example-dashboard.yaml` - a native Sections/Tile dashboard showing the intended layout.
- `optional-card-mod.yaml` - optional fallback for custom cards that ignore Home Assistant's native card radius.

## Install the theme

Copy `clean-home.yaml` into:

```text
/config/themes/clean-home.yaml
```

Make sure your `configuration.yaml` loads the themes directory:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

If you already have a `frontend:` section, merge the `themes:` line into it rather than creating a second `frontend:` block.

Reload themes from **Developer tools > YAML > Reload themes**, or restart Home Assistant.

Then open your Home Assistant profile and set:

- **Theme:** `Clean Home`
- **Color mode:** `Auto`

With Auto selected, the same theme follows the device/system light and dark preference.

## Example dashboard

`example-dashboard.yaml` uses Home Assistant's native **Sections** view and mostly **Tile** cards so the dashboard stays responsive and easy to edit from the normal UI.

The entity IDs in the example are placeholders. Replace entries such as:

```text
sensor.living_room_temperature
light.living_room
climate.living_room
lock.front_door
camera.front_door
```

with your own entities.

The layout is deliberately simple: status first, then lights, heating, security, camera and calendar. The idea is that a person should be able to understand the main screen without knowing Home Assistant.

## Rounded style

The main rounded appearance is native. Current Home Assistant frontend cards expose `ha-card-border-radius`, and card features expose their own inherited feature radius, so standard Tile/Area controls should follow the theme without Card Mod.

If a third-party or older custom card ignores the radius, see `optional-card-mod.yaml`. It is intentionally optional so the core theme remains robust across Home Assistant updates.

## Design target

The priorities are:

1. Readable before clever.
2. Large tap targets.
3. Text labels as well as icons.
4. Consistent card locations.
5. Minimal information on the main page.
6. Obvious semantic colours for important states.
7. Rounded, soft UI without turning every control into visual clutter.

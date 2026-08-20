# Clean Home

Clean Home is a high-readability Home Assistant theme with automatic light and
dark modes, strong contrast, larger labels and heavily rounded surfaces. It
stays close to native Home Assistant cards and controls, so the main theme does
not require HACS or Card Mod.

> [!IMPORTANT]
> The files are syntax-checked in CI but have not yet completed a live Home
> Assistant smoke test. Install the theme per-user first and keep access to
> `/config` while evaluating it.

## What it changes

- One theme with native light and dark modes.
- 22 px rounded cards and rounded Tile-card features.
- Larger Tile labels, headings and tap targets.
- High-contrast text for at-a-glance readability.
- Softer navy dark mode instead of pure black.
- Blue interaction states, yellow active lights, green safe/locked states and
  red warning/unlocked states.

## Files

- [`clean-home.yaml`](clean-home.yaml) — the theme.
- [`example-dashboard.yaml`](example-dashboard.yaml) — an optional native
  Sections/Tile dashboard showing the intended layout.

Only copy `clean-home.yaml` into the themes directory. The example dashboard is
installed separately.

## Before you start

- Make a backup of `configuration.yaml`.
- Keep another way to edit `/config`, such as File editor, Studio Code Server,
  Samba or SSH.
- If you already have a `frontend:` or `lovelace:` block, add to it rather than
  creating a duplicate top-level block.

## Install the theme

1. Download [`clean-home.yaml`](clean-home.yaml).
2. Create `/config/themes` if it does not exist.
3. Save the file as:

   ```text
   /config/themes/clean-home.yaml
   ```

4. Make sure `configuration.yaml` loads that directory:

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```

5. Validate the Home Assistant configuration before restarting.
6. Reload themes from **Developer tools > YAML > Reload themes**, or run the
   `frontend.reload_themes` action. Restart Home Assistant if this is the first
   time the themes directory has been added.
7. Select your user initials at the bottom of the sidebar and set:

   - **Theme:** `Clean Home`
   - **Color mode:** `Auto`

With Auto selected, the same theme follows the device or system light/dark
preference. Start with a single user rather than changing the system-wide
default.

Home Assistant's [frontend theme documentation](https://www.home-assistant.io/integrations/frontend/)
explains the same directory include, reload action and per-user selection flow.

## Check the installation

- Open one dashboard on desktop and mobile.
- Switch Color mode between Light and Dark before returning it to Auto.
- Check Tile, thermostat, lock, alarm and dialog controls that you use.
- Confirm important active/warning states remain obvious in both modes.

If anything becomes unreadable, switch your user back to the default theme
before editing the YAML.

## Install the example dashboard

The example uses native Sections, Heading, Tile, Thermostat, Picture Entity and
Calendar cards. No custom dashboard cards are required.

### Option A: UI-managed dashboard

1. Create a new empty dashboard in Home Assistant.
2. Open it, enter dashboard edit mode and open the **Raw configuration editor**.
3. Paste the contents of [`example-dashboard.yaml`](example-dashboard.yaml).
4. Replace every placeholder entity with one from your installation.
5. Save, then edit individual cards normally in the UI.

### Option B: YAML dashboard

1. Copy `example-dashboard.yaml` to:

   ```text
   /config/clean-home-dashboard.yaml
   ```

2. Add this to `configuration.yaml`, merging it into any existing `lovelace:`
   block:

   ```yaml
   lovelace:
     dashboards:
       clean-home:
         mode: yaml
         filename: clean-home-dashboard.yaml
         title: Clean Home
         icon: mdi:home-outline
         show_in_sidebar: true
   ```

3. Validate the configuration, reload dashboards or restart Home Assistant,
   then replace the placeholder entity IDs in the copied file.

The dashboard key must contain a hyphen. See Home Assistant's
[YAML dashboard guide](https://www.home-assistant.io/dashboards/dashboards/)
for the complete configuration format.

### Placeholder entities

The example deliberately uses readable placeholder IDs, including:

```text
sensor.living_room_temperature
sensor.home_humidity
sensor.air_quality
sensor.outdoor_temperature
light.living_room
light.kitchen
light.bedroom
climate.living_room
lock.front_door
binary_sensor.home_motion
alarm_control_panel.home
camera.front_door
calendar.home
```

Replace or remove every card whose entity does not exist in your installation.

## Optional Card Mod fallback

The native theme variables should round standard Home Assistant cards. If a
third-party or older card ignores them and you already use Card Mod, add these
two keys inside the existing `Clean Home:` mapping in `clean-home.yaml`:

```yaml
Clean Home:
  # Keep the existing Clean Home settings here.

  card-mod-theme: Clean Home
  card-mod-card: |
    ha-card {
      border-radius: var(--ha-card-border-radius) !important;
    }
```

Do not create a separate YAML file containing only those two keys. Card Mod is
an optional compatibility fallback, not a requirement for the main theme.

## Update

1. Back up your current `/config/themes/clean-home.yaml`.
2. Replace it with the latest [`clean-home.yaml`](clean-home.yaml).
3. Reload themes with `frontend.reload_themes`.
4. Refresh the browser or fully close and reopen the companion app.
5. Re-check light and dark modes on the controls you use most.

## Remove

1. Change every user using Clean Home back to the default theme.
2. If Clean Home was set system-wide, change the system default first.
3. Delete `/config/themes/clean-home.yaml`.
4. Reload themes or restart Home Assistant.
5. Remove the `frontend:` themes include only if no other installed theme needs
   it.

## Troubleshooting

### Clean Home is missing from the theme selector

- Confirm the file is exactly `/config/themes/clean-home.yaml`.
- Check the indentation of `themes:` beneath `frontend:`.
- Search `configuration.yaml` for a second `frontend:` block and merge them.
- Restart Home Assistant if the themes directory was added for the first time.

### Changes do not appear

- Run `frontend.reload_themes` again.
- Hard-refresh the browser or restart the companion app.
- Confirm you edited the same file loaded by `configuration.yaml`.

### A custom card is still square

The card may not consume Home Assistant's native radius variable. Use that
card's documented styling option or the optional Card Mod fallback above.

### A future Home Assistant update changes the appearance

Home Assistant officially supports theme structure, primary/accent colours and
state colour patterns, but many component-level CSS variables can change
between frontend releases. Report the affected card and Home Assistant version
in a [repository issue](https://github.com/0libote/HA-BPs/issues/new).

## Design priorities

1. Readable before clever.
2. Large tap targets.
3. Text labels as well as icons.
4. Consistent card locations.
5. Minimal information on the main page.
6. Obvious semantic colours for important states.
7. Rounded, soft UI without visual clutter.

# Blueprint setup guide

All blueprints in this repository require Home Assistant 2025.7 or newer.
The import buttons use My Home Assistant to open the blueprint preview on your
own instance; the manual URL below each button works if that redirect is not
configured.

## Doorbell Multi-Speaker TTS Announcement

[![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fdoorbell-announcement.yaml)

Manual import URL:

```text
https://github.com/0libote/HA-BPs/blob/main/blueprints/doorbell-announcement.yaml
```

This blueprint announces a press from any selected doorbell binary sensor on
one or more media players. The TTS entity, message, announcement volume, cleanup
delay and volume afterwards are configurable. Optional conditions can suppress
announcements, and optional extra actions can add notifications or light effects.

### Configure

1. Import the blueprint and select **Create automation**.
2. Select the doorbell binary sensor or sensors.
3. Select a `tts` entity and the media players that should announce the press.
4. Set the message, volumes and cleanup delay.
5. Optionally add conditions or extra actions, then save and test.

The blueprint calls each speaker separately so an error from one speaker does
not prevent the remaining speakers from being attempted. It ignores additional
doorbell presses until the current cleanup delay has finished.

### Troubleshooting

- No announcement: confirm the doorbell entity changes to `on`, and test the
  selected `tts` entity with the speaker in **Developer tools > Actions**.
- Message is cut off: increase **Delay Before Cleanup** or disable **Stop
  Playback After Announcement**.
- Wrong volume afterwards: change **Volume After Announcement**. This mirrors
  the original automation's fixed post-announcement volume rather than trying
  to resume each speaker's earlier media session.

[View the YAML](doorbell-announcement.yaml)

## IKEA BILRESA Scroll Wheel

[![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fbilresa-scroll-wheel.yaml)

Manual import URL:

```text
https://github.com/0libote/HA-BPs/blob/main/blueprints/bilresa-scroll-wheel.yaml
```

This blueprint turns the three physical BILRESA presets into light profiles
with one shared wheel feel. Each preset keeps its own lights and ordered colour
list, or duplicates another preset. Brightness step, range, transitions and the
centre-button layout are shared so there is far less to tune.

Presets 2 and 3 duplicate Preset 1 by default, so a single room works after
configuring Preset 1 only.

### Before you start

- Pair the BILRESA with Home Assistant through Matter.
- On the device page, identify the three `event` entities for each preset:
  right/brighter, left/dimmer and centre push.
- Confirm that turning or pressing the control updates those event entities.

### Configure

1. Import the blueprint and select **Create automation**.
2. In **Remote buttons**, select the 9 event entities, three per preset.
3. In **Lights and presets**, select Preset 1 lights. Keep Presets 2 and 3
   duplicating Preset 1, or switch them to custom lights or disabled.
4. In **Wheel and centre button**, set the shared brightness step, limits,
   transition and tap/hold layout.
5. In **Colours**, order Preset 1 colours. Add custom lists for Presets 2 and
   3 only when they use custom profiles.
6. Save the automation and test tap, hold and both wheel directions.

Scrolling right while a preset's lights are off turns them on at the minimum
brightness. Colour while off turns them on with the first colour.

Fast wheel movement uses Matter's `totalNumberOfPressesCounted` value. If the
device itself aborts an over-limit multi-press and publishes no completed event,
Home Assistant has no movement for the blueprint to recover.

Updating from an older version resets per-preset tuning to the new shared
Wheel and Colour settings. Re-check those once after updating.

### Troubleshooting

- No response: watch the selected event entity in **Developer tools > States**
  and confirm it updates when the control is used.
- Wrong direction or button: re-check the three event entities selected for that
  preset.
- Centre button does nothing: check the shared centre-button layout. Tap and
  hold are matched permissively across Matter tap/hold event names.
- Unexpected brightness: check the shared minimum, maximum and per-detent
  step before changing the automation logic.

[View the YAML](bilresa-scroll-wheel.yaml)

## IKEA MYGGSPRAY Smart Motion Lights

[![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fmyggspray-auto-lights.yaml)

Manual import URL:

```text
https://github.com/0libote/HA-BPs/blob/main/blueprints/myggspray-auto-lights.yaml
```

This blueprint starts a motion-lighting session when any selected motion
detector reports activity, at least one selected illuminance sensor says the
room is dark enough, and every selected light is off and available. Motion-only
detectors are supported because the illuminance entities are selected
separately. It can remember the latest normal light profile, restore it before
switch-off and clean up after manual changes, unavailable entities or an
overlong session.

### Before you start

- Pair the MYGGSPRAY with Home Assistant through Matter-over-Thread.
- Identify the occupancy or motion entities covering the area and at least one
  illuminance entity. They do not have to belong to the same devices.
- Make sure the target lights can be controlled normally from Home Assistant.

### Configure

1. Import the blueprint and select **Create automation**.
2. Select one or more motion/occupancy sensors, one or more illuminance sensors,
   and the target lights.
3. Choose the lux threshold, automation brightness and optional colour.
4. Set the clear delay and maximum session runtime.
5. Optionally add activation conditions, then save and test in a non-critical
   room first.

The remembered profiles use temporary dynamic scenes. A Home Assistant restart
or scene reload clears them; the blueprint learns them again the next time the
lights are used normally.

### Troubleshooting

- Motion does not start a session: check the current lux value and confirm every
  target light is both off and available.
- Lights turn off while part of the area is occupied: confirm every selected
  motion detector reports `on` while it detects activity. The clear delay starts
  only after all selected detectors report `off`.
- A previous profile is not restored: use the light normally while the motion
  session is idle so a fresh profile can be learned.
- A bulb briefly flashes an old colour: some bulbs recall their hardware state
  before applying Home Assistant's combined brightness and colour command. A
  generic blueprint cannot pre-stage a physically powered-off bulb.

[View the YAML](myggspray-auto-lights.yaml)

## Forgot to Turn Off

[![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fforgot-to-turn-off.yaml)

Manual import URL:

```text
https://github.com/0libote/HA-BPs/blob/main/blueprints/forgot-to-turn-off.yaml
```

This is a passive safety net for lights controlled manually or by other
automations. It never turns a light on or changes brightness, colour, scenes or
another automation.

### Configure

1. Import the blueprint and select **Create automation**.
2. Select one or more motion, occupancy or presence sensors for the area.
3. Select the lights that may be switched off.
4. Choose how long every sensor must remain clear, then save and test.

The countdown restarts safely after Home Assistant starts or a selected light
is turned on while the area is already clear. Unknown or unavailable sensors
are treated as occupied so a sensor fault cannot cause an automatic switch-off.

### Troubleshooting

- Lights remain on: confirm every selected sensor is `off`; unknown or
  unavailable sensors intentionally block switch-off.
- Lights turn off later than expected: activity on any selected sensor cancels
  that countdown, and the full delay starts again once every sensor is clear.
- Test with a short timeout first, then restore the intended safety duration.

[View the YAML](forgot-to-turn-off.yaml)

## Manual installation

If URL import is unavailable, download the required YAML file and place it in:

```text
/config/blueprints/automation/0libote/
```

Reload automations or restart Home Assistant, then create an automation from the
installed blueprint. Keep the same filename when replacing it with an update.

## Updating

Open **Settings > Automations & scenes > Blueprints**, use the three-dot menu
beside the blueprint and select **Re-import blueprint**. Existing automations
continue to use the imported blueprint after automations are reloaded.

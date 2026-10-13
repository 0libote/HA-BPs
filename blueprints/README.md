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
one or more media players. Binary doorbell sensors and doorbell event entities
are supported. The TTS entity, message, announcement volume, bounded playback
wait and fallback volume are configurable. Optional conditions can suppress
announcements, and optional extra actions can add notifications or light effects.

### Configure

1. Import the blueprint and select **Create automation**.
2. Select doorbell binary sensors, doorbell event entities, or both.
3. Select a `tts` entity and the media players that should announce the press.
4. Set the message, announcement volume and maximum playback wait. Previous
   speaker volumes are restored by default; the fallback is used if unavailable.
5. Optionally add conditions or extra actions, then save and test.

The blueprint calls each speaker separately so an error from one speaker does
not prevent the remaining speakers from being attempted. It waits for every
speaker to report new playback, including a fast speaker that has already
finished. If startup is not acknowledged within **Speaker Startup Wait**, it
keeps announcement volume for the full cleanup delay. A volume-only state
update does not count as playback starting. It ignores additional
doorbell presses until the current run, including extra actions, finishes. An available TTS
engine reporting `unknown` before first use is supported. If the engine is
missing or unavailable, speaker volumes are left alone and **Extra Actions**
still run, so notification fallbacks can remain useful. A zero cleanup delay
means almost immediate cleanup; it does not create an unlimited playback wait.

### Troubleshooting

- No announcement: confirm the doorbell entity changes to `on`, and test the
  selected `tts` entity with the speaker in **Developer tools > Actions**.
- Message is cut off: increase **Delay Before Cleanup** and leave **Stop
  Playback After Announcement** disabled. Playback state reporting depends on
  the speaker integration; configure **Speaker Startup Wait** for slow players.
- Wrong volume afterwards: check **Restore Previous Volume** and the fallback
  **Volume After Announcement**. A deliberate volume change during playback is
  left alone. Restoring volume does not generically resume an earlier media session.
- Repeated rings during a run are ignored. A restart/reload interrupts cleanup;
  Home Assistant cannot guarantee volume restoration across that interruption.

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
2. In **Remote buttons**, select the event entities, three per used preset.
   Leave unused slots empty; each slot can accept matching entities from
   multiple remotes. Existing single-entity selections remain supported.
3. In **Lights and presets**, select Preset 1 lights. Keep Presets 2 and 3
   duplicating Preset 1, or switch them to custom lights or disabled.
4. In **Wheel and centre button**, set the shared brightness step, limits,
   transition and tap/hold layout.
5. In **Colours**, order Preset 1 colours. Add custom lists for Presets 2 and
   3 only when they use custom profiles.
6. Save the automation and test tap, hold and both wheel directions.
   **Device Response Wait** bounds acknowledgement between queued gestures;
   increase it if your lights report state slowly.

Scrolling right while a preset's lights are off turns them on at the lower
brightness bound. On/off-only lights are switched on without dimming fields.
Colour while off turns RGB-capable lights on with the first colour; white-only
lights are left alone. Power still controls every available preset light.

Fast wheel movement uses Matter's `totalNumberOfPressesCounted` value, with
the completed `multi_press_N` event type as a fallback when the count attribute
is absent. If the
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
  hold use completed gestures: `multi_press_N` and `long_release` for Matter.
  Initial presses, long-press starts and intermediate multi-press events are ignored.
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
switch-off and release control after manual changes, unavailable entities or an
overlong session. Faults leave remaining lights on. The default maximum-runtime
policy also leaves lights on; forced OFF is an explicit option.

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
4. Set the clear delay, maximum session runtime and the runtime-limit policy.
5. Optionally add activation conditions, then save and test in a non-critical
   room first.

The remembered profiles use temporary dynamic scenes. A Home Assistant restart
or scene reload clears them; the blueprint learns them again the next time the
lights are used normally. Restoring an ON profile immediately before OFF may
produce a visible flash on some bulbs; disable profile restoration if that matters.

Active sessions are checked every ten seconds, so switch-off can occur up to ten
seconds after the clear delay. There are no long-lived parallel session timers.
After restart or automation reload the blueprint leaves lights alone and waits
for fresh motion; it does not guess whether an existing ON light was manual.
Activation waits up to five seconds for ON feedback. If it is interrupted or
incomplete, control is released while remaining lights are left alone. A queued
motion event is ignored if the room is already clear when it reaches the queue.

When **Respect Manual Changes** is enabled, a user-context change releases control
immediately. Relevant brightness/colour/effect changes without user context release
control after a ten-second settling period. Physical changes during that period
cannot reliably be distinguished from the bulb applying its automation command.
Use the shared override helper below for deterministic remote priority. A
manual takeover also learns the changed light's new profile from the event,
so restoration does not return it to an older manual setting.

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

The single countdown restarts safely after Home Assistant starts, automations
reload, or a selected light
is turned on while the area is already clear. Unknown or unavailable sensors
are treated as occupied so a sensor fault cannot cause an automatic switch-off.

### Troubleshooting

- Lights remain on: confirm every selected sensor is `off`; unknown or
  unavailable sensors intentionally block switch-off.
- Lights turn off later than expected: activity on any selected sensor cancels
  that countdown, and the full delay starts again once every sensor is clear.
- Test with a short timeout first, then restore the intended safety duration.

[View the YAML](forgot-to-turn-off.yaml)

## Using the blueprints together

Use one motion-lighting automation per set of lights. BILRESA is the manual
control, MYGGSPRAY owns only sessions it starts while all lights are off, and
Forgot to Turn Off is the final passive safety net. Choose a safety timeout
longer than the normal motion clear delay (for example, two minutes for motion
and one hour for the safety net). Select the same presence sensors covering the
room, and include any additional presence sensors needed for seated occupants.

For reliable manual priority, create an **Input boolean / Toggle** helper such
as `input_boolean.living_room_manual_lighting`. Select it in **Manual Override
Helpers** in both BILRESA and MYGGSPRAY. A valid remote action sets it ON before
changing lights, which releases motion ownership and blocks new motion sessions.
Turn the helper OFF from a dashboard or your own room-reset automation to allow
motion lighting again. Helpers that are missing or unavailable block motion activation. The remote
also waits for its helpers to report ON before changing lights; failed helper
acknowledgement blocks that gesture.
The passive safety net still switches lights off after its full clear timeout;
it does not reset the helper or change colours.

Use doorbell **Extra Conditions** for quiet hours and **Extra Actions** for
notifications or room effects. Route effects through your own script and choose
whether they should set the room override helper. A long-running extra action
keeps the doorbell automation busy and repeated rings are ignored until it ends.

Every blueprint retains twenty traces for diagnosis. Individual device actions
continue on error where cleanup or another device must still be attempted;
errors remain visible in logs. No generic blueprint can guarantee device delivery,
recover a Matter event the remote never sent, persist dynamic scenes across a
restart, or restore arbitrary media sessions. See the
[engineering review](../docs/automation-review.md) for decisions and verification.

## Updating existing automations

Existing input names are preserved. After re-importing, check the new defaults:
previous speaker volumes are restored, forced media stop is disabled, and motion
maximum runtime releases ownership rather than forcing lights OFF. Existing
explicit values still apply. Motion clear cleanup has up to ten seconds of
reconciliation latency. Remote holds now act once on release. Set the optional
shared manual override in both blueprints if you want deterministic priority.
Remote commands now wait for device feedback, and RGB gestures skip white-only
bulbs. Manual **Run actions** on a remote or motion automation safely does
nothing without a device trigger; test those blueprints with their actual devices.

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

# Blueprint engineering review

Scope: all four automation blueprints, their setup documentation, generated
website catalogue, validation script and CI. There are no standalone Home
Assistant script blueprints in this repository.

## Design contract

BILRESA supplies manual intent. MYGGSPRAY owns only lighting sessions it starts.
Forgot to Turn Off supplies a longer passive timeout. Doorbell announcements
supply optional room effects through user actions. No blueprint disables another
automation. A shared optional input boolean provides explicit manual priority;
all existing entity input names are retained.

## Findings and changes

### MYGGSPRAY

The previous parallel implementation kept a maximum-runtime run plus separate
clear countdowns and light-change runs. Repeated occupancy changes could consume
its run limit. A countdown from one session could see the shared ownership scene
from a later session, and the manual-change setting did not implement its promise.
Fault cleanup restored profiles and switched the room off even if occupied.

The replacement uses queued, short actions with reconciliation every ten seconds.
The dynamic ownership scene's creation time bounds the current session. Continuous
clear time comes from every sensor's actual `last_changed`, checked alongside
current availability. Missing, unknown and unavailable sensors cannot be treated
as clear. Startup/reload releases ownership without guessing which ON lights
were automatic. Faults and manual takeover leave lights alone. Maximum runtime
releases ownership by default; forced OFF remains an explicit policy.

An optional shared override blocks activation even while lights are OFF. Manual
OFF always releases ownership. Relevant user-context changes release ownership;
brightness/colour changes without user context release it after a ten-second
settling period. This conservative approach can release on delayed bulb updates,
but avoids overwriting manual lighting. An explicit helper is more reliable than
trying to infer the origin of every physical light change.

Turn-on commands are per light, with colour support checks, Kelvin clamping and
an on/off-only fallback. Errors from one device do not prevent remaining devices
from being attempted. Existing learned-profile scenes remain optional. Restoring
an ON scene just before OFF may flash a bulb, so disable restoration if necessary.
Temporary scenes are not restart-persistent; profile learning resumes on normal use.
Manual takeover now records the new event profile when releasing ownership.
Profile scenes use the trigger's captured attributes, avoiding a snapshot of
attributes that changed while the run waited in the queue. Fresh activation
requires live motion and checks override/availability before each bulb; it waits
for ON feedback and releases incomplete sessions without forcing lights off.

### BILRESA

Substring matching treated initial presses, long-press starts, releases and
multi-press events as independent actions. A hold could toggle twice, or a tap
could execute before it was known to be a hold. Using `last_changed` as event age
also accepted a recently restored state containing an old event timestamp.

The replacement acts on completed Matter gestures, uses the event state's actual
timestamp, rejects restored/stale events and suppresses short releases when the
entity also advertises completed multi-press events. Holds act on release. Queued
execution preserves gesture order; unavailable lights are omitted and individual
action errors do not abort the rest of a per-light sequence. The optional room
override is set before a valid remote action changes lights.

Each light command now has a bounded acknowledgement wait before the next
gesture reads its brightness or colour. Power uses separate per-device calls.
RGB gestures filter out white-only bulbs, dimming skips on/off-only bulbs, and
reversed limits wake at the normalized lower bound. The remote confirms shared
manual helpers are ON before changing lights.

A bounded queue still cannot guarantee delivery of an arbitrarily fast burst.
If a device never acknowledges within the configured response wait, later
brightness arithmetic can still depend on stale state. Remote firmware
can discard an excessive multi-press before Home Assistant sees any event; no
blueprint can reconstruct that movement.

### Forgot to Turn Off

Parallel long countdowns accumulated and silently reached the run limit. Missing
entities were dropped by `expand`, potentially allowing switch-off with incomplete
sensor coverage. Automation reload had no countdown recovery trigger.

The replacement uses one restartable countdown. Every actual sensor state change
cancels the old run, including occupied/unknown/unavailable transitions. Clear
state signatures are rechecked after the delay. Selected sensor counts must match
resolved entities. Startup, reload and lights turning ON start a fresh full delay
only if all sensors are clear. Per-light OFF calls isolate device errors.
Occupancy and the original clear signature are checked again before every OFF
call, so presence returning mid-cleanup protects remaining lights.

The safety net intentionally does not respect indefinite manual lighting: it
still acts after its longer clear timeout and does not reset manual-override
helpers. Choose the timeout and sensor coverage accordingly.

### Doorbell

The original implementation changed every speaker to one fixed volume after a
fixed delay and stopped playback by default. It supported only binary sensors,
regenerated identical TTS without caching, and grouped volume/stop calls could
fail before attempting all speakers.

The replacement supports binary sensors and timestamp event entities, caches
TTS, skips unavailable speakers, saves each speaker's volume and restores it
individually. Deliberate volume changes during playback are preserved. Playback
waiting checks every speaker's state-change timestamp and media identifier,
rather than treating the first player to start as acknowledgement for all.
Volume-only changes do not satisfy that check. If startup is unconfirmed, the
full bounded cleanup delay is retained before volume restoration. Playback
waiting has a configurable startup bound and configurable completion bound. Forced media stop
is disabled by default. Quiet-hour conditions and extra actions remain available.

An available TTS engine may report `unknown` until its first request; it is
not rejected as offline. If the engine is missing or unavailable, the speaker
branch is skipped and optional extra actions still run.

Generic playback states cannot prove a specific announcement has finished on
every integration. Speakers may resume prior music themselves, report playback
late, or not support announcement mixing. Volume restoration does not restore a
media queue. A restart/reload during playback interrupts cleanup; persistent
restoration needs integration-specific state storage and a separate recovery
workflow. Multiple doorbell automations targeting the same speakers can race;
use one automation per speaker set.

## Modern Home Assistant features

The suite uses `triggers`, `conditions`, `actions`, `trigger` and `action` syntax,
sectioned selectors, TTS entities, RGB/Kelvin controls, queued/restart execution,
bounded waits, per-action error continuation and twenty stored traces. It retains
HA 2025.7 compatibility. Newer `event.received` triggers are useful for installations
requiring a newer HA version; timestamp state triggers keep this suite usable at
its documented minimum without relying on a newer trigger API. Empty remote
slots use real empty selections rather than made-up entity IDs; existing scalar
entity selections still work.

## Verification and deployment

Repository tests check metadata, inputs and ecosystem defaults. Container checks
validate expanded automations including actions and platform-specific triggers.
Regression scenarios use Home Assistant's actual script/template engine and scene
integration with fake device services to exercise ownership, clear time, faults,
missing entities, manual overrides/takeover, runtime policy, remote gesture
filtering, stale timestamps, passive shutdown and speaker-volume restoration.
CI runs the minimum supported series and rolling stable. The final expanded
validation and both runtime suites passed locally on Home Assistant 2025.7.4
and 2026.10.1. All twenty repository checks, five website export regressions,
YAML lint and the eleven-page website build also passed.

The delayed-response suite reuses Script instances with the actual queue/restart
modes. It covers wheel/colour accumulation, mixed light capabilities, override
failures, stale motion, profile takeover, interleaved activation/shutdown,
countdown cancellation, late speaker startup, TTS first use/outages and zero
cleanup durations. Wait timeouts have a positive minimum so a configured zero
cannot accidentally disable their deadline. Duration mappings, numeric seconds
and legacy duration strings are supported. Expected simulated device failures
verify that one failed light or TTS call does not block the others.

The website exporter previously forced `mode: single` on every generated
instance, overriding the remote queue and passive restart countdown. It now
inherits the blueprint mode and uses a YAML serializer, so names with punctuation
and nested custom action data round-trip correctly. Export regressions and the
website build are checked in CI.

The generated website catalogue must be rebuilt after YAML or setup-guide changes.
Hardware acceptance still needs real automation traces: test a tap and hold,
fast wheel movement, overlapping motion, a sensor disconnect, a manual change,
restart/reload during a session and TTS on each speaker. Verify that physical
state acknowledgements and playback states match the integration's behavior.

## Sources

- [Automation modes](https://www.home-assistant.io/docs/automation/modes/)
- [Trigger timing and restart limits](https://www.home-assistant.io/docs/automation/trigger/)
- [Script waits and error handling](https://www.home-assistant.io/docs/scripts/)
- [Event entity timestamps and types](https://www.home-assistant.io/integrations/event/)
- [Matter event mappings](https://github.com/home-assistant/core/blob/dev/homeassistant/components/matter/event.py)
- [TTS entities and playback requirements](https://www.home-assistant.io/integrations/tts/)

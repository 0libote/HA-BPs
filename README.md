# 0libote Home Assistant

Practical Home Assistant blueprints for IKEA Matter devices.

[![Blueprint tests](https://github.com/0libote/HA-BPs/actions/workflows/test-blueprints.yml/badge.svg)](https://github.com/0libote/HA-BPs/actions/workflows/test-blueprints.yml)
[![Home Assistant 2025.7+](https://img.shields.io/badge/Home%20Assistant-2025.7%2B-41BDF5?logo=homeassistant&logoColor=white)](https://www.home-assistant.io/)
[![MIT licence](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

## Blueprints

| Blueprint | What it does | Requirements | Install |
| --- | --- | --- | --- |
| [Doorbell Multi-Speaker TTS Announcement](blueprints/README.md#doorbell-multi-speaker-tts-announcement) | Announces a doorbell press on multiple speakers with configurable TTS, message and volume cleanup. | Doorbell binary sensor, TTS entity and media players; HA 2025.7+ | [![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fdoorbell-announcement.yaml) |
| [IKEA BILRESA Scroll Wheel](blueprints/README.md#ikea-bilresa-scroll-wheel) | Three configurable light presets with wheel dimming, colour cycling and tap/hold actions. | BILRESA connected through Matter; HA 2025.7+ | [![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fbilresa-scroll-wheel.yaml) |
| [IKEA MYGGSPRAY Smart Motion Lights](blueprints/README.md#ikea-myggspray-smart-motion-lights) | Multi-sensor motion lighting with separate lux control, previous-profile memory and safe cleanup. | Motion/occupancy and illuminance entities; HA 2025.7+ | [![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fmyggspray-auto-lights.yaml) |
| [Forgot to Turn Off](blueprints/README.md#forgot-to-turn-off) | A passive safety net that switches lights off after every selected presence sensor stays clear. | Motion, occupancy or presence sensors; HA 2025.7+ | [![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2F0libote%2FHA-BPs%2Fblob%2Fmain%2Fblueprints%2Fforgot-to-turn-off.yaml) |

Importing adds the reusable blueprint to Home Assistant. Afterwards, open
**Settings > Automations & scenes > Blueprints**, select **Create automation**
and choose the entities for your home. See the [blueprint setup guide](blueprints/README.md)
for prerequisites, manual installation and troubleshooting.

See [how the blueprints work together](blueprints/README.md#using-the-blueprints-together)
and the [engineering review](docs/automation-review.md) for reliability decisions,
upgrade notes and remaining device-dependent limits.

## Updating

- **Blueprints:** open **Settings > Automations & scenes > Blueprints**, use the
  three-dot menu beside a blueprint and select **Re-import blueprint**.

## Website

Interactive landing page, docs and a 1:1 showcase of every blueprint config
lives in [`website/`](website/) (Astro + Bun + React islands, HA-dark UI).
`bun run data:build` regenerates the showcase from `blueprints/*.yaml`, and
`bun run build` outputs static `dist/` for Cloudflare Pages.

## Support

[Open an issue](https://github.com/0libote/HA-BPs/issues/new) with the affected
blueprint, your Home Assistant version, how the device is connected,
and any relevant automation trace or log message. Remove secrets, addresses and
personal entity names before posting.

## Licence

Released under the [MIT Licence](LICENSE).

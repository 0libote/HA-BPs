"""Bootstrap the HA internals required by container validation/regressions."""
from __future__ import annotations

import tempfile

from homeassistant import loader
from homeassistant.config_entries import ConfigEntries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry, device_registry, entity_registry
from homeassistant.helpers import trigger as trigger_helper
from homeassistant.setup import async_setup_component


async def create_hass() -> HomeAssistant:
    hass = HomeAssistant(tempfile.mkdtemp(prefix="ha-blueprint-test-"))
    hass.config_entries = ConfigEntries(hass, {})
    loader.async_setup(hass)
    # Device registry setup became explicit after the 2025.7 baseline.
    if hasattr(device_registry, "async_setup"):
        device_registry.async_setup(hass)
    await device_registry.async_load(hass)
    await area_registry.async_load(hass)
    await entity_registry.async_load(hass)
    await async_setup_component(hass, "homeassistant", {})
    # Current HA maintains a registry for integration-owned trigger platforms.
    if hasattr(trigger_helper, "async_setup"):
        await trigger_helper.async_setup(hass)
    return hass

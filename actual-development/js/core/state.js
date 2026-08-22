export let autoCalcEnabled = true;

// Tracks fields that the user has manually edited (overriding auto-calc).
// Auto-calc functions will not overwrite these fields.
// Cleared when the user re-enables auto-calc via the toggle.
export const manualOverrides = new Set();

export function setAutoCalcEnabled(val) {
    autoCalcEnabled = val;
    if (val) manualOverrides.clear(); // re-enabling auto-calc clears manual overrides
}

export function addManualOverride(field) {
    manualOverrides.add(field);
}
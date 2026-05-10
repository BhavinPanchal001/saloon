/**
 * Unit Conversion Utility
 * Centralized helpers for converting between primary and secondary units.
 * Used across Inventory, POS, Purchase Orders, and Service modules.
 */

/**
 * Convert a quantity to the base (primary) unit.
 * @param {number} qty       – The quantity in the given unit
 * @param {number} ratio     – Conversion ratio (1 primary = `ratio` secondary)
 * @param {"primary"|"secondary"} fromUnit – Which unit the quantity is expressed in
 * @returns {number}         – Quantity in primary (base) unit
 */
export const convertToBase = (qty, ratio, fromUnit) => {
  const n = Number(qty) || 0;
  if (fromUnit === "secondary" && ratio > 0) {
    return n / ratio;
  }
  return n; // already primary
};

/**
 * Convert a quantity from the base (primary) unit to a target unit.
 * @param {number} baseQty   – Quantity in primary (base) unit
 * @param {number} ratio     – Conversion ratio (1 primary = `ratio` secondary)
 * @param {"primary"|"secondary"} toUnit – Target unit role
 * @returns {number}         – Quantity in the target unit
 */
export const convertFromBase = (baseQty, ratio, toUnit) => {
  const n = Number(baseQty) || 0;
  if (toUnit === "secondary" && ratio > 0) {
    return n * ratio;
  }
  return n; // already primary
};

/**
 * Convert between units directly (e.g. 1000 ML → 1 L or 1 L → 1000 ML).
 * @param {number} qty       – Input quantity
 * @param {number} ratio     – Conversion ratio
 * @param {"primary"|"secondary"} fromUnit
 * @param {"primary"|"secondary"} toUnit
 * @returns {number}
 */
export const convertBetweenUnits = (qty, ratio, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return Number(qty) || 0;
  const base = convertToBase(qty, ratio, fromUnit);
  return convertFromBase(base, ratio, toUnit);
};

/**
 * Format a quantity with its unit abbreviation for display.
 * @param {number} qty          – Quantity value
 * @param {object} unitMaster   – The unit master object
 * @param {"primary"|"secondary"} unitRole – Which unit to display
 * @returns {string}            – e.g. "25.00 L" or "500 ML"
 */
export const formatUnitDisplay = (qty, unitMaster, unitRole) => {
  if (!unitMaster) return String(qty);
  const abbr =
    unitRole === "secondary"
      ? unitMaster.secondaryAbbr
      : unitMaster.primaryAbbr;
  // Use up to 4 decimal places, but strip trailing zeros
  const formatted = Number(qty).toFixed(4).replace(/\.?0+$/, "");
  return `${formatted} ${abbr}`;
};

/**
 * Get a human-readable label for a unit role.
 * @param {object} unitMaster   – The unit master object
 * @param {"primary"|"secondary"} unitRole
 * @returns {string}            – e.g. "Liter (L)" or "Milliliter (ML)"
 */
export const getUnitLabel = (unitMaster, unitRole) => {
  if (!unitMaster) return "";
  if (unitRole === "secondary") {
    return `${unitMaster.secondaryUnit} (${unitMaster.secondaryAbbr})`;
  }
  return `${unitMaster.primaryUnit} (${unitMaster.primaryAbbr})`;
};

/**
 * Get both unit options for a unit master (for dropdown rendering).
 * @param {object} unitMaster – The unit master object
 * @returns {Array<{value: string, label: string}>}
 */
export const getAvailableUnits = (unitMaster) => {
  if (!unitMaster) return [];
  const options = [
    {
      value: "primary",
      label: `${unitMaster.primaryUnit} (${unitMaster.primaryAbbr})`,
    },
  ];
  // Only add secondary if it's different from primary (i.e. not a 1:1 identity unit)
  if (
    unitMaster.secondaryUnit !== unitMaster.primaryUnit ||
    unitMaster.secondaryAbbr !== unitMaster.primaryAbbr
  ) {
    options.push({
      value: "secondary",
      label: `${unitMaster.secondaryUnit} (${unitMaster.secondaryAbbr})`,
    });
  }
  return options;
};

/**
 * Get the abbreviation for a unit role.
 * @param {object} unitMaster
 * @param {"primary"|"secondary"} unitRole
 * @returns {string}
 */
export const getUnitAbbr = (unitMaster, unitRole) => {
  if (!unitMaster) return "";
  return unitRole === "secondary"
    ? unitMaster.secondaryAbbr
    : unitMaster.primaryAbbr;
};

/**
 * Smart display of a quantity: shows the value in the given unit plus
 * the equivalent in base unit when they differ.
 * @param {number} qty
 * @param {object} unitMaster
 * @param {"primary"|"secondary"} unitRole
 * @returns {string} – e.g. "10 ML (= 0.01 L)"
 */
export const formatWithConversion = (qty, unitMaster, unitRole) => {
  if (!unitMaster) return String(qty);
  const display = formatUnitDisplay(qty, unitMaster, unitRole);
  if (unitRole === "primary") return display;
  const baseQty = convertToBase(qty, unitMaster.conversionRatio, unitRole);
  const baseDisplay = formatUnitDisplay(baseQty, unitMaster, "primary");
  return `${display} (= ${baseDisplay})`;
};

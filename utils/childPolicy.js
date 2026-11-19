/**
 * Luxury Hotel Child Age, Bedding & Occupancy Policy (Backend)
 * Pure room & bedding policy (no separate meal plans):
 *  - Infants (Under 1 – 2 yrs): Free ($0), excluded from bed capacity, Complimentary Baby Cot
 *  - Young Children (3 – 5 yrs): Free ($0), shares existing bedding with parents
 *  - Older Children (6 – 11 yrs): Extra Rollaway Bed Supplement ($25/night Non-Resident, $15/night Resident)
 */

const EXTRA_BED_RATE_NON_RESIDENT = 25;
const EXTRA_BED_RATE_RESIDENT = 15;

/**
 * Parses a raw child age label ("Under 1", "0", "4", 9) into an integer age between 0 and 11.
 *
 * @param {string|number} rawAge
 * @returns {number}
 */
function parseChildAge(rawAge) {
  if (rawAge === 'Under 1' || rawAge === 'under 1') return 0;
  const num = Number(String(rawAge ?? '').replace(/[^0-9]/g, ''));
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(11, Math.floor(num)));
}

/**
 * Formats a parsed age integer for UI display ("Under 1" or "N yrs").
 *
 * @param {string|number} rawAge
 * @returns {string}
 */
function formatChildAgeLabel(rawAge) {
  const age = parseChildAge(rawAge);
  return age === 0 ? 'Under 1' : `${age} yr${age === 1 ? '' : 's'}`;
}

/**
 * Normalizes an incoming child_ages array (JSON string or array) cleanly.
 *
 * @param {any} rawAges
 * @returns {string[]}
 */
function normalizeChildAges(rawAges) {
  let list = [];
  if (Array.isArray(rawAges)) {
    list = rawAges;
  } else if (typeof rawAges === 'string' && rawAges.trim()) {
    try {
      const parsed = JSON.parse(rawAges);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = rawAges.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return list
    .filter((v) => v !== '' && v !== null && v !== undefined)
    .map((v) => (parseChildAge(v) === 0 ? 'Under 1' : String(parseChildAge(v))));
}

/**
 * Evaluates child age brackets, extra rollaway bed supplement, and housekeeping notes.
 *
 * @param {object} params
 * @param {Array<string|number>} [params.childAges=[]]
 * @param {number} [params.nights=1]
 * @param {string} [params.residency='Non-Resident']
 * @returns {{
 *   normalizedAges: string[],
 *   infantCount: number,
 *   youngChildCount: number,
 *   olderChildCount: number,
 *   ratePerExtraBedNight: number,
 *   childSupplementTotal: number,
 *   housekeepingSummary: string
 * }}
 */
function evaluateChildPolicy({
  childAges = [],
  nights = 1,
  residency = 'Non-Resident',
  childExtraBedPrice = null,
  residentChildExtraBedPrice = null,
}) {
  const normalizedAges = normalizeChildAges(childAges);
  const safeNights = Math.max(1, Number(nights) || 1);
  const isResident = residency === 'Resident';

  const hasCustomIntl =
    childExtraBedPrice !== null &&
    childExtraBedPrice !== undefined &&
    childExtraBedPrice !== '' &&
    Number.isFinite(Number(childExtraBedPrice)) &&
    Number(childExtraBedPrice) >= 0;
  const hasCustomResident =
    residentChildExtraBedPrice !== null &&
    residentChildExtraBedPrice !== undefined &&
    residentChildExtraBedPrice !== '' &&
    Number.isFinite(Number(residentChildExtraBedPrice)) &&
    Number(residentChildExtraBedPrice) >= 0;

  const ratePerExtraBedNight = isResident
    ? hasCustomResident
      ? Number(residentChildExtraBedPrice)
      : EXTRA_BED_RATE_RESIDENT
    : hasCustomIntl
    ? Number(childExtraBedPrice)
    : EXTRA_BED_RATE_NON_RESIDENT;

  let infantCount = 0;
  let youngChildCount = 0;
  let olderChildCount = 0;

  normalizedAges.forEach((raw) => {
    const age = parseChildAge(raw);
    if (age <= 2) infantCount += 1;
    else if (age <= 5) youngChildCount += 1;
    else olderChildCount += 1;
  });

  const childSupplementTotal = Math.round(olderChildCount * ratePerExtraBedNight * safeNights * 100) / 100;

  const notes = [];
  if (infantCount > 0) {
    notes.push(`${infantCount} Baby Cot${infantCount > 1 ? 's' : ''} (Free)`);
  }
  if (youngChildCount > 0) {
    notes.push(`${youngChildCount} Child${youngChildCount > 1 ? 'ren' : ''} Sharing Bedding (Free)`);
  }
  if (olderChildCount > 0) {
    notes.push(`${olderChildCount} Extra Rollaway Bed${olderChildCount > 1 ? 's' : ''}`);
  }

  return {
    normalizedAges,
    infantCount,
    youngChildCount,
    olderChildCount,
    ratePerExtraBedNight,
    childSupplementTotal,
    housekeepingSummary: notes.join(' · '),
  };
}

module.exports = {
  EXTRA_BED_RATE_NON_RESIDENT,
  EXTRA_BED_RATE_RESIDENT,
  parseChildAge,
  formatChildAgeLabel,
  normalizeChildAges,
  evaluateChildPolicy,
};

/**
 * Parses numbers from mixed locale formats.
 * Handles values like: "39,30 $", "$1,234.56", "1.234,56", "-23.20", "(23,20)".
 */
export const parseLocalizedNumber = (rawValue: string | undefined): { value: number, error?: string } => {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return { value: 0, error: 'Invalid numeric value' };
  }

  const sanitizedValue = rawValue
    .trim()
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, '')
    .replace(/[^\d,.\-+]/g, '');

  if (!sanitizedValue || !/\d/.test(sanitizedValue)) {
    return { value: 0, error: 'Invalid numeric value' };
  }

  const usThousandsPattern = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;
  const euThousandsPattern = /^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/;
  const commaDecimalPattern = /^[+-]?\d+,\d+$/;
  const dotDecimalPattern = /^[+-]?\d+(\.\d+)?$/;

  let normalizedValue = sanitizedValue;

  if (usThousandsPattern.test(sanitizedValue)) {
    normalizedValue = sanitizedValue.replace(/,/g, '');
  } else if (euThousandsPattern.test(sanitizedValue)) {
    normalizedValue = sanitizedValue.replace(/\./g, '').replace(',', '.');
  } else if (commaDecimalPattern.test(sanitizedValue)) {
    normalizedValue = sanitizedValue.replace(',', '.');
  } else if (dotDecimalPattern.test(sanitizedValue)) {
    normalizedValue = sanitizedValue;
  } else {
    const lastCommaIndex = sanitizedValue.lastIndexOf(',');
    const lastPeriodIndex = sanitizedValue.lastIndexOf('.');
    const decimalSeparator = lastCommaIndex > lastPeriodIndex ? ',' : '.';
    const decimalIndex = decimalSeparator === ',' ? lastCommaIndex : lastPeriodIndex;

    if (decimalIndex > -1) {
      const integerPart = sanitizedValue.slice(0, decimalIndex).replace(/[.,]/g, '');
      const decimalPart = sanitizedValue.slice(decimalIndex + 1).replace(/[.,]/g, '');
      normalizedValue = `${integerPart}.${decimalPart}`;
    } else {
      normalizedValue = sanitizedValue;
    }
  }

  const numericValue = Number.parseFloat(normalizedValue);

  if (Number.isNaN(numericValue)) {
    return { value: 0, error: 'Unable to parse numeric value' };
  }

  return { value: numericValue };
};

export const formatCurrencyValue = (pnl: string | undefined): { pnl: number, error?: string } => {
  if (typeof pnl !== 'string' || pnl.trim() === '') {
    return { pnl: 0, error: 'Invalid PNL value' };
  }

  const formattedPnl = pnl.trim();
  const isNegativeParentheses = formattedPnl.startsWith('(') && formattedPnl.endsWith(')');
  const { value: numericValue, error } = parseLocalizedNumber(formattedPnl.replace(/[()]/g, ''));

  if (error) {
    return { pnl: 0, error: 'Unable to parse PNL value' };
  }

  return { pnl: isNegativeParentheses ? -Math.abs(numericValue) : numericValue };
};

export const formatPriceValue = (price: string | undefined): { price: number, error?: string } => {
  const { value: numericValue, error } = parseLocalizedNumber(price);

  if (error) {
    return { price: 0, error: 'Unable to parse price value' };
  }

  return { price: numericValue };
};

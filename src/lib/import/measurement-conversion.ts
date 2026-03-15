interface ConvertedIngredientMeasurement {
  amount: string;
  unit: string;
}

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅛": "1/8",
};

const INGREDIENT_UNIT_MAP: Array<{
  unitPatterns: RegExp[];
  metricUnit: string;
  factor: number;
}> = [
  {
    unitPatterns: [/^teaspoons?$/i, /^tsp\.?$/i, /^tsps\.?$/i],
    metricUnit: "ml",
    factor: 4.92892,
  },
  {
    unitPatterns: [/^tablespoons?$/i, /^tbsp\.?$/i, /^tbsps\.?$/i],
    metricUnit: "ml",
    factor: 14.7868,
  },
  {
    unitPatterns: [/^cups?$/i],
    metricUnit: "ml",
    factor: 236.588,
  },
  {
    unitPatterns: [/^fluid ounces?$/i, /^fl\.?\s?oz\.?$/i],
    metricUnit: "ml",
    factor: 29.5735,
  },
  {
    unitPatterns: [/^pints?$/i, /^pt\.?$/i],
    metricUnit: "ml",
    factor: 473.176,
  },
  {
    unitPatterns: [/^quarts?$/i, /^qt\.?$/i],
    metricUnit: "ml",
    factor: 946.353,
  },
  {
    unitPatterns: [/^gallons?$/i, /^gal\.?$/i],
    metricUnit: "l",
    factor: 3.78541,
  },
  {
    unitPatterns: [/^ounces?$/i, /^oz\.?$/i],
    metricUnit: "g",
    factor: 28.3495,
  },
  {
    unitPatterns: [/^pounds?$/i, /^lbs?\.?$/i],
    metricUnit: "g",
    factor: 453.592,
  },
];

function normalizeNumericText(value: string): string {
  return value.replace(/[½¼¾⅓⅔⅛]/g, (match) => UNICODE_FRACTIONS[match] ?? match);
}

function formatMetricValue(value: number, metricUnit: string): string {
  if (metricUnit === "g" || metricUnit === "ml") {
    return String(Math.round(value));
  }

  if (metricUnit === "cm") {
    return value >= 10 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");
  }

  if (metricUnit === "l") {
    return value.toFixed(value < 10 ? 2 : 1).replace(/\.?0+$/, "");
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function parseFraction(part: string): number | null {
  const [numerator, denominator] = part.split("/");
  const num = Number.parseFloat(numerator);
  const den = Number.parseFloat(denominator);

  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }

  return num / den;
}

function parseAmount(amount: string): number | null {
  const normalized = normalizeNumericText(amount)
    .replace(/,/g, ".")
    .trim();

  if (!normalized || normalized.includes("-")) {
    return null;
  }

  const parts = normalized.split(/\s+/);
  let total = 0;

  for (const part of parts) {
    if (!part) continue;

    if (part.includes("/")) {
      const fraction = parseFraction(part);
      if (fraction === null) return null;
      total += fraction;
      continue;
    }

    const value = Number.parseFloat(part);
    if (!Number.isFinite(value)) {
      return null;
    }
    total += value;
  }

  return total > 0 ? total : null;
}

function findIngredientUnitDefinition(unit: string) {
  const normalizedUnit = unit.trim();
  return INGREDIENT_UNIT_MAP.find((entry) =>
    entry.unitPatterns.some((pattern) => pattern.test(normalizedUnit)),
  );
}

export function convertIngredientMeasurementToMetric(
  amount: string,
  unit: string,
): ConvertedIngredientMeasurement {
  if (!amount || !unit || amount.includes("(") || unit.includes("(")) {
    return { amount, unit };
  }

  const parsedAmount = parseAmount(amount);
  const unitDefinition = findIngredientUnitDefinition(unit);

  if (!parsedAmount || !unitDefinition) {
    return { amount, unit };
  }

  const convertedValue = parsedAmount * unitDefinition.factor;
  const metricAmount = formatMetricValue(convertedValue, unitDefinition.metricUnit);
  const originalReference = `${amount} ${unit}`.trim();

  return {
    amount: metricAmount,
    unit: `${unitDefinition.metricUnit} (${originalReference})`,
  };
}

function convertTemperatureText(text: string): string {
  return text.replace(/\b(\d+(?:\.\d+)?)\s*°?\s*F\b/gi, (match, value, offset, source) => {
    if (offset > 0 && source[offset - 1] === "(") {
      return match;
    }

    const fahrenheit = Number.parseFloat(value);
    if (!Number.isFinite(fahrenheit)) {
      return match;
    }

    const celsius = (fahrenheit - 32) * 5 / 9;
    return `${Math.round(celsius)}°C (${match})`;
  });
}

function convertLengthText(text: string): string {
  return text.replace(/\b(\d+(?:\.\d+)?)\s*(?:-| )?(inches|inch|in)\b/gi, (match, value, _unit, offset, source) => {
    if (offset > 0 && source[offset - 1] === "(") {
      return match;
    }

    const inches = Number.parseFloat(value);
    if (!Number.isFinite(inches)) {
      return match;
    }

    const centimeters = inches * 2.54;
    return `${formatMetricValue(centimeters, "cm")} cm (${match})`;
  });
}

function convertInlineUnitText(text: string): string {
  return text.replace(
    /\b(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s+(cups?|tablespoons?|tbsp\.?|tbsps\.?|teaspoons?|tsp\.?|tsps\.?|fluid ounces?|fl\.?\s?oz\.?|ounces?|oz\.?|pounds?|lbs?\.?)\b/gi,
    (match, amount, unit, offset, source) => {
      if (offset > 0 && source[offset - 1] === "(") {
        return match;
      }

      const converted = convertIngredientMeasurementToMetric(amount, unit);
      if (converted.amount === amount && converted.unit === unit) {
        return match;
      }

      return `${converted.amount} ${converted.unit}`;
    },
  );
}

export function convertTextMeasurementsToMetric(text: string): string {
  if (!text || text.includes("°C (") || /\b(?:g|kg|ml|l|cm)\s*\([^)]*\)/i.test(text)) {
    return text;
  }

  return convertLengthText(convertInlineUnitText(convertTemperatureText(text)));
}

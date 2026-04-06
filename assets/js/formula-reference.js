function readFormulaNumber(cardNode, key) {
  const input = cardNode.querySelector(`[data-formula-input="${key}"]`);
  return input ? Number.parseFloat(input.value) : Number.NaN;
}

function updateFormulaResult(cardNode, label, value, explanation) {
  const resultNode = cardNode.querySelector("[data-formula-result]");
  if (!resultNode) {
    return;
  }

  const labelNode = resultNode.querySelector(".result__label");
  const valueNode = resultNode.querySelector("[data-result-value]");
  const explanationNode = resultNode.querySelector("[data-result-explanation]");

  labelNode.textContent = label;
  valueNode.textContent = value;
  explanationNode.textContent = explanation;
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setupClampCard(cardNode) {
  const run = () => {
    const value = readFormulaNumber(cardNode, "value");
    const min = readFormulaNumber(cardNode, "min");
    const max = readFormulaNumber(cardNode, "max");

    if ([value, min, max].some((item) => Number.isNaN(item))) {
      updateFormulaResult(cardNode, "Clamp result", "Invalid input", "Enter numbers for value, min, and max.");
      return;
    }

    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    const result = clampValue(value, safeMin, safeMax);
    const explanation =
      value < safeMin
        ? `Value ${formatNumber(value, 3)} is below min ${formatNumber(safeMin, 3)}, so the result is raised to ${formatNumber(result, 3)}.`
        : value > safeMax
          ? `Value ${formatNumber(value, 3)} is above max ${formatNumber(safeMax, 3)}, so the result is clamped down to ${formatNumber(result, 3)}.`
          : `Value ${formatNumber(value, 3)} is already inside the range ${formatNumber(safeMin, 3)} to ${formatNumber(safeMax, 3)}, so it stays ${formatNumber(result, 3)}.`;

    updateFormulaResult(cardNode, "Clamp result", formatNumber(result, 3), explanation);
  };

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupLerpCard(cardNode) {
  const run = () => {
    const a = readFormulaNumber(cardNode, "a");
    const b = readFormulaNumber(cardNode, "b");
    const t = readFormulaNumber(cardNode, "t");

    if ([a, b, t].some((item) => Number.isNaN(item))) {
      updateFormulaResult(cardNode, "Lerp result", "Invalid input", "Enter numbers for A, B, and T.");
      return;
    }

    const result = a + (b - a) * t;
    const explanation = `T = ${formatNumber(t, 3)} means the result sits ${formatNumber(t * 100, 1)}% of the way from ${formatNumber(a, 3)} to ${formatNumber(b, 3)}.`;
    updateFormulaResult(cardNode, "Lerp result", formatNumber(result, 3), explanation);
  };

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupRemapCard(cardNode) {
  const run = () => {
    const value = readFormulaNumber(cardNode, "value");
    const inMin = readFormulaNumber(cardNode, "in-min");
    const inMax = readFormulaNumber(cardNode, "in-max");
    const outMin = readFormulaNumber(cardNode, "out-min");
    const outMax = readFormulaNumber(cardNode, "out-max");

    if ([value, inMin, inMax, outMin, outMax].some((item) => Number.isNaN(item))) {
      updateFormulaResult(cardNode, "Remap result", "Invalid input", "Enter numbers for the input and output ranges.");
      return;
    }

    const inputSpan = inMax - inMin;
    if (inputSpan === 0) {
      updateFormulaResult(cardNode, "Remap result", "Invalid range", "Input min and input max cannot be the same value.");
      return;
    }

    const normalized = (value - inMin) / inputSpan;
    const result = outMin + normalized * (outMax - outMin);
    const explanation = `${formatNumber(value, 3)} is ${formatNumber(normalized * 100, 1)}% of the way through the input range, so it maps to ${formatNumber(result, 3)} in the output range.`;
    updateFormulaResult(cardNode, "Remap result", formatNumber(result, 3), explanation);
  };

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupFormulaReference() {
  const clampCard = document.querySelector('[data-formula-card="clamp"]');
  const lerpCard = document.querySelector('[data-formula-card="lerp"]');
  const remapCard = document.querySelector('[data-formula-card="remap"]');

  if (clampCard) {
    setupClampCard(clampCard);
  }

  if (lerpCard) {
    setupLerpCard(lerpCard);
  }

  if (remapCard) {
    setupRemapCard(remapCard);
  }
}

setupFormulaReference();

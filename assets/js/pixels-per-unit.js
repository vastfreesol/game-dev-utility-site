attachCalculator("calculator-form", (form, resultNode) => {
  const pixels = Number(form.elements.pixels.value);
  const units = Number(form.elements.units.value);

  if (pixels <= 0 || units <= 0) {
    setResult(resultNode, "Pixels per unit", "Invalid input", "Enter positive values for both fields.");
    return;
  }

  const result = pixels / units;
  setResult(
    resultNode,
    "Pixels per unit",
    formatNumber(result, 2),
    `${formatNumber(pixels, 0)} pixels spread across ${formatNumber(units, 2)} world units.`
  );
});

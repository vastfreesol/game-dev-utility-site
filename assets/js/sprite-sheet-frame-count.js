attachCalculator("calculator-form", (form, resultNode) => {
  const sheetWidth = Number(form.elements.sheetWidth.value);
  const sheetHeight = Number(form.elements.sheetHeight.value);
  const frameWidth = Number(form.elements.frameWidth.value);
  const frameHeight = Number(form.elements.frameHeight.value);

  if (sheetWidth <= 0 || sheetHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) {
    setResult(resultNode, "Total frames", "Invalid input", "All values must be greater than zero.");
    return;
  }

  const columns = Math.floor(sheetWidth / frameWidth);
  const rows = Math.floor(sheetHeight / frameHeight);
  const total = columns * rows;

  setResult(
    resultNode,
    "Total frames",
    formatNumber(total, 0),
    `${formatNumber(columns, 0)} columns by ${formatNumber(rows, 0)} rows fit within the current sheet dimensions.`
  );
});

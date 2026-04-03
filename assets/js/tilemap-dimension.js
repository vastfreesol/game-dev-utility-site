attachCalculator("calculator-form", (form, resultNode) => {
  const tileWidth = Number(form.elements.tileWidth.value);
  const tileHeight = Number(form.elements.tileHeight.value);
  const columns = Number(form.elements.columns.value);
  const rows = Number(form.elements.rows.value);

  if (tileWidth <= 0 || tileHeight <= 0 || columns <= 0 || rows <= 0) {
    setResult(resultNode, "Tilemap dimensions", "Invalid input", "All values must be greater than zero.");
    return;
  }

  const totalWidth = tileWidth * columns;
  const totalHeight = tileHeight * rows;

  setResult(
    resultNode,
    "Tilemap dimensions",
    `${formatNumber(totalWidth, 0)} x ${formatNumber(totalHeight, 0)} px`,
    `${formatNumber(columns, 0)} columns and ${formatNumber(rows, 0)} rows at ${formatNumber(tileWidth, 0)} x ${formatNumber(tileHeight, 0)} pixels per tile.`
  );
});

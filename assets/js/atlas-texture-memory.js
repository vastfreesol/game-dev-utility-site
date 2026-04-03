attachCalculator("calculator-form", (form, resultNode) => {
  const width = Number(form.elements.width.value);
  const height = Number(form.elements.height.value);
  const bytesPerPixel = Number(form.elements.bytesPerPixel.value);

  if (width <= 0 || height <= 0 || bytesPerPixel <= 0) {
    setResult(resultNode, "Approximate memory usage", "Invalid input", "All values must be greater than zero.");
    return;
  }

  const totalBytes = width * height * bytesPerPixel;
  const totalMegabytes = totalBytes / (1024 * 1024);

  setResult(
    resultNode,
    "Approximate memory usage",
    `${formatNumber(totalMegabytes, 2)} MB`,
    `This assumes an uncompressed texture atlas at ${formatNumber(bytesPerPixel, 2)} bytes per pixel.`
  );
});

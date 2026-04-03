attachCalculator("calculator-form", (form, resultNode) => {
  const fps = Number(form.elements.fps.value);

  if (fps <= 0) {
    setResult(resultNode, "Milliseconds per frame", "Invalid input", "Enter an FPS value greater than zero.");
    return;
  }

  const frameTime = 1000 / fps;
  setResult(
    resultNode,
    "Milliseconds per frame",
    `${formatNumber(frameTime, 2)} ms`,
    `A ${formatNumber(fps, 0)} FPS target gives you ${formatNumber(frameTime, 2)} milliseconds to render each frame.`
  );
});

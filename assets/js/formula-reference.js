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

  if (labelNode) {
    labelNode.textContent = label;
  }

  if (valueNode) {
    valueNode.textContent = value;
  }

  if (explanationNode) {
    explanationNode.textContent = explanation;
  }
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

function setupPointPlotCard(cardNode, options) {
  const pointA = cardNode.querySelector("[data-point-a]");
  const pointB = cardNode.querySelector("[data-point-b]");
  const mainLine = cardNode.querySelector("[data-plot-line]");
  const dxLine = cardNode.querySelector("[data-plot-dx]");
  const dyLine = cardNode.querySelector("[data-plot-dy]");
  const plotSvg = cardNode.querySelector(".formula-plot__svg");

  if (!plotSvg || !pointA || !pointB) {
    return;
  }

  const viewBox = plotSvg.viewBox.baseVal;
  const plotWidth = viewBox && viewBox.width ? viewBox.width : 320;
  const plotHeight = viewBox && viewBox.height ? viewBox.height : 320;
  const centerX = plotWidth / 2;
  const centerY = plotHeight / 2;
  const maxUnits = 12;
  const pixelsPerUnit = Math.min(centerX, centerY) / maxUnits;
  const toPlotX = (value) => centerX + value * pixelsPerUnit;
  const toPlotY = (value) => centerY - value * pixelsPerUnit;
  const toWorldX = (value) => (value - centerX) / pixelsPerUnit;
  const toWorldY = (value) => (centerY - value) / pixelsPerUnit;
  let dragHandle = null;

  const setInputValue = (key, value) => {
    const input = cardNode.querySelector(`[data-formula-input="${key}"]`);
    if (input) {
      input.value = String(Math.round(value * 10) / 10);
    }
  };

  const run = () => {
    const x1 = readFormulaNumber(cardNode, "x1");
    const y1 = readFormulaNumber(cardNode, "y1");
    const x2 = readFormulaNumber(cardNode, "x2");
    const y2 = readFormulaNumber(cardNode, "y2");

    if ([x1, y1, x2, y2].some((item) => Number.isNaN(item))) {
      updateFormulaResult(
        cardNode,
        options.invalidLabel || "Invalid input",
        "Invalid input",
        options.invalidExplanation || "Enter numbers for both 2D points."
      );
      return;
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const ax = toPlotX(x1);
    const ay = toPlotY(y1);
    const bx = toPlotX(x2);
    const by = toPlotY(y2);

    pointA.setAttribute("cx", String(ax));
    pointA.setAttribute("cy", String(ay));
    pointB.setAttribute("cx", String(bx));
    pointB.setAttribute("cy", String(by));

    if (mainLine) {
      mainLine.setAttribute("x1", String(ax));
      mainLine.setAttribute("y1", String(ay));
      mainLine.setAttribute("x2", String(bx));
      mainLine.setAttribute("y2", String(by));
    }

    if (dxLine) {
      dxLine.setAttribute("x1", String(ax));
      dxLine.setAttribute("y1", String(ay));
      dxLine.setAttribute("x2", String(bx));
      dxLine.setAttribute("y2", String(ay));
    }

    if (dyLine) {
      dyLine.setAttribute("x1", String(bx));
      dyLine.setAttribute("y1", String(ay));
      dyLine.setAttribute("x2", String(bx));
      dyLine.setAttribute("y2", String(by));
    }

    options.onUpdate({
      x1,
      y1,
      x2,
      y2,
      dx,
      dy,
      distance,
      ax,
      ay,
      bx,
      by,
      toPlotX,
      toPlotY,
      plotWidth,
      plotHeight,
    });
  };

  const updateDraggedPoint = (event) => {
    if (!dragHandle) {
      return;
    }

    const bounds = plotSvg.getBoundingClientRect();
    const scaleX = plotWidth / bounds.width;
    const scaleY = plotHeight / bounds.height;
    const svgX = clampValue((event.clientX - bounds.left) * scaleX, 0, plotWidth);
    const svgY = clampValue((event.clientY - bounds.top) * scaleY, 0, plotHeight);
    const worldX = clampValue(toWorldX(svgX), -maxUnits, maxUnits);
    const worldY = clampValue(toWorldY(svgY), -maxUnits, maxUnits);

    if (dragHandle === "a") {
      setInputValue("x1", worldX);
      setInputValue("y1", worldY);
    } else {
      setInputValue("x2", worldX);
      setInputValue("y2", worldY);
    }

    run();
  };

  const stopDrag = () => {
    dragHandle = null;
    document.body.classList.remove("is-dragging-formula-point");
  };

  cardNode.querySelectorAll("[data-point-handle]").forEach((handleNode) => {
    handleNode.addEventListener("pointerdown", (event) => {
      dragHandle = handleNode.getAttribute("data-point-handle");
      document.body.classList.add("is-dragging-formula-point");
      handleNode.setPointerCapture?.(event.pointerId);
      updateDraggedPoint(event);
    });
  });

  plotSvg.addEventListener("pointermove", (event) => {
    if (dragHandle) {
      updateDraggedPoint(event);
    }
  });
  plotSvg.addEventListener("pointerup", stopDrag);
  plotSvg.addEventListener("pointerleave", stopDrag);
  plotSvg.addEventListener("pointercancel", stopDrag);
  window.addEventListener("pointerup", stopDrag);

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupDistance2dCard(cardNode) {
  const pointA = cardNode.querySelector("[data-distance-point-a]");
  const pointB = cardNode.querySelector("[data-distance-point-b]");
  const distanceLine = cardNode.querySelector("[data-distance-line]");
  const dxLine = cardNode.querySelector("[data-distance-dx]");
  const dyLine = cardNode.querySelector("[data-distance-dy]");
  const dxValue = cardNode.querySelector("[data-distance-dx-value]");
  const dyValue = cardNode.querySelector("[data-distance-dy-value]");
  const lengthValue = cardNode.querySelector("[data-distance-length-value]");
  const plotSvg = cardNode.querySelector(".formula-plot__svg");
  const plotSize = 320;
  const center = plotSize / 2;
  const maxUnits = 12;
  const pixelsPerUnit = center / maxUnits;

  const toPlotX = (value) => center + value * pixelsPerUnit;
  const toPlotY = (value) => center - value * pixelsPerUnit;
  const toWorldX = (value) => (value - center) / pixelsPerUnit;
  const toWorldY = (value) => (center - value) / pixelsPerUnit;
  let dragHandle = null;

  const run = () => {
    const x1 = readFormulaNumber(cardNode, "x1");
    const y1 = readFormulaNumber(cardNode, "y1");
    const x2 = readFormulaNumber(cardNode, "x2");
    const y2 = readFormulaNumber(cardNode, "y2");

    if ([x1, y1, x2, y2].some((item) => Number.isNaN(item))) {
      updateFormulaResult(cardNode, "Distance result", "Invalid input", "Enter numbers for both 2D points.");
      return;
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);

    const ax = toPlotX(x1);
    const ay = toPlotY(y1);
    const bx = toPlotX(x2);
    const by = toPlotY(y2);

    if (pointA) {
      pointA.setAttribute("cx", String(ax));
      pointA.setAttribute("cy", String(ay));
    }

    if (pointB) {
      pointB.setAttribute("cx", String(bx));
      pointB.setAttribute("cy", String(by));
    }

    if (distanceLine) {
      distanceLine.setAttribute("x1", String(ax));
      distanceLine.setAttribute("y1", String(ay));
      distanceLine.setAttribute("x2", String(bx));
      distanceLine.setAttribute("y2", String(by));
    }

    if (dxLine) {
      dxLine.setAttribute("x1", String(ax));
      dxLine.setAttribute("y1", String(ay));
      dxLine.setAttribute("x2", String(bx));
      dxLine.setAttribute("y2", String(ay));
    }

    if (dyLine) {
      dyLine.setAttribute("x1", String(bx));
      dyLine.setAttribute("y1", String(ay));
      dyLine.setAttribute("x2", String(bx));
      dyLine.setAttribute("y2", String(by));
    }

    if (dxValue) {
      dxValue.textContent = formatNumber(dx, 2);
    }

    if (dyValue) {
      dyValue.textContent = formatNumber(dy, 2);
    }

    if (lengthValue) {
      lengthValue.textContent = formatNumber(distance, 3);
    }

    updateFormulaResult(
      cardNode,
      "Distance result",
      formatNumber(distance, 3),
      `Point A (${formatNumber(x1, 2)}, ${formatNumber(y1, 2)}) to Point B (${formatNumber(x2, 2)}, ${formatNumber(y2, 2)}) gives dx ${formatNumber(dx, 2)}, dy ${formatNumber(dy, 2)}, and a straight-line distance of ${formatNumber(distance, 3)}.`
    );
  };

  const setInputValue = (key, value) => {
    const input = cardNode.querySelector(`[data-formula-input="${key}"]`);
    if (!input) {
      return;
    }

    input.value = String(Math.round(value * 10) / 10);
  };

  const updateDraggedPoint = (event) => {
    if (!dragHandle || !plotSvg) {
      return;
    }

    const bounds = plotSvg.getBoundingClientRect();
    const scaleX = plotSize / bounds.width;
    const scaleY = plotSize / bounds.height;
    const svgX = clampValue((event.clientX - bounds.left) * scaleX, 0, plotSize);
    const svgY = clampValue((event.clientY - bounds.top) * scaleY, 0, plotSize);
    const worldX = clampValue(toWorldX(svgX), -maxUnits, maxUnits);
    const worldY = clampValue(toWorldY(svgY), -maxUnits, maxUnits);

    if (dragHandle === "a") {
      setInputValue("x1", worldX);
      setInputValue("y1", worldY);
    } else {
      setInputValue("x2", worldX);
      setInputValue("y2", worldY);
    }

    run();
  };

  const stopDrag = () => {
    dragHandle = null;
    document.body.classList.remove("is-dragging-formula-point");
  };

  cardNode.querySelectorAll("[data-distance-handle]").forEach((handleNode) => {
    handleNode.addEventListener("pointerdown", (event) => {
      dragHandle = handleNode.getAttribute("data-distance-handle");
      document.body.classList.add("is-dragging-formula-point");
      handleNode.setPointerCapture?.(event.pointerId);
      updateDraggedPoint(event);
    });
  });

  if (plotSvg) {
    plotSvg.addEventListener("pointermove", (event) => {
      if (!dragHandle) {
        return;
      }

      updateDraggedPoint(event);
    });

    plotSvg.addEventListener("pointerup", stopDrag);
    plotSvg.addEventListener("pointerleave", stopDrag);
    plotSvg.addEventListener("pointercancel", stopDrag);
  }

  window.addEventListener("pointerup", stopDrag);

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupDirection2dCard(cardNode) {
  const rawValue = cardNode.querySelector("[data-direction-raw-value]");
  const unitValue = cardNode.querySelector("[data-direction-unit-value]");
  const lengthValue = cardNode.querySelector("[data-direction-length-value]");
  const unitLine = cardNode.querySelector("[data-direction-unit-line]");

  setupPointPlotCard(cardNode, {
    invalidLabel: "Direction result",
    invalidExplanation: "Enter numbers for both 2D points.",
    onUpdate: ({ x1, y1, x2, y2, dx, dy, distance, toPlotX, toPlotY }) => {
      const ux = distance === 0 ? 0 : dx / distance;
      const uy = distance === 0 ? 0 : dy / distance;

      if (rawValue) {
        rawValue.textContent = `${formatNumber(dx, 2)}, ${formatNumber(dy, 2)}`;
      }

      if (unitValue) {
        unitValue.textContent = `${formatNumber(ux, 3)}, ${formatNumber(uy, 3)}`;
      }

      if (lengthValue) {
        lengthValue.textContent = formatNumber(distance, 3);
      }

      if (unitLine) {
        const previewLength = 3;
        unitLine.setAttribute("x1", String(toPlotX(x1)));
        unitLine.setAttribute("y1", String(toPlotY(y1)));
        unitLine.setAttribute("x2", String(toPlotX(x1 + ux * previewLength)));
        unitLine.setAttribute("y2", String(toPlotY(y1 + uy * previewLength)));
      }

      const resultValue =
        distance === 0 ? "No direction" : `(${formatNumber(ux, 3)}, ${formatNumber(uy, 3)})`;
      const explanation =
        distance === 0
          ? `Point A (${formatNumber(x1, 2)}, ${formatNumber(y1, 2)}) and Point B (${formatNumber(x2, 2)}, ${formatNumber(y2, 2)}) are the same point, so there is no usable movement direction yet.`
          : `The raw vector from A to B is (${formatNumber(dx, 2)}, ${formatNumber(dy, 2)}). Once normalized, it becomes (${formatNumber(ux, 3)}, ${formatNumber(uy, 3)}), which gives you a clean heading with magnitude 1.`;

      updateFormulaResult(cardNode, "Direction result", resultValue, explanation);
    },
  });
}

function setupAngle2dCard(cardNode) {
  const degreesValue = cardNode.querySelector("[data-angle-deg-value]");
  const radiansValue = cardNode.querySelector("[data-angle-rad-value]");
  const distanceValue = cardNode.querySelector("[data-angle-distance-value]");
  const referenceLine = cardNode.querySelector("[data-angle-reference]");
  const arcPath = cardNode.querySelector("[data-angle-arc]");

  setupPointPlotCard(cardNode, {
    invalidLabel: "Angle result",
    invalidExplanation: "Enter numbers for both 2D points.",
    onUpdate: ({ x1, y1, x2, y2, dx, dy, distance, ax, ay, bx, by }) => {
      const angleRadians = Math.atan2(dy, dx);
      const angleDegrees = ((angleRadians * 180) / Math.PI + 360) % 360;

      if (degreesValue) {
        degreesValue.textContent = `${formatNumber(angleDegrees, 2)}deg`;
      }

      if (radiansValue) {
        radiansValue.textContent = formatNumber(angleRadians, 3);
      }

      if (distanceValue) {
        distanceValue.textContent = formatNumber(distance, 3);
      }

      if (referenceLine) {
        referenceLine.setAttribute("x1", String(ax));
        referenceLine.setAttribute("y1", String(ay));
        referenceLine.setAttribute("x2", String(ax + 48));
        referenceLine.setAttribute("y2", String(ay));
      }

      if (arcPath) {
        if (distance === 0) {
          arcPath.setAttribute("d", "");
        } else {
          const radius = 34;
          const endX = ax + radius * Math.cos(angleRadians);
          const endY = ay - radius * Math.sin(angleRadians);
          const largeArcFlag = Math.abs(angleRadians) > Math.PI ? 1 : 0;
          const sweepFlag = angleRadians < 0 ? 1 : 0;
          arcPath.setAttribute(
            "d",
            `M ${ax + radius} ${ay} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`
          );
        }
      }

      const explanation =
        distance === 0
          ? `Both points are currently the same, so there is no meaningful facing angle yet.`
          : `Point A (${formatNumber(x1, 2)}, ${formatNumber(y1, 2)}) toward Point B (${formatNumber(x2, 2)}, ${formatNumber(y2, 2)}) produces an angle of ${formatNumber(angleDegrees, 2)}deg, or ${formatNumber(angleRadians, 3)} radians, measured from the positive X axis.`;

      updateFormulaResult(cardNode, "Angle result", `${formatNumber(angleDegrees, 2)}deg`, explanation);
    },
  });
}

function setupPixelsPerUnit2dCard(cardNode) {
  const pixelsValue = cardNode.querySelector("[data-ppu-pixels-value]");
  const worldValue = cardNode.querySelector("[data-ppu-world-value]");
  const ppuValue = cardNode.querySelector("[data-ppu-value]");
  const uppValue = cardNode.querySelector("[data-ppu-units-per-pixel]");
  const sampleHeightValue = cardNode.querySelector("[data-ppu-sample-height]");

  const run = () => {
    const spritePixels = readFormulaNumber(cardNode, "sprite-pixels");
    const worldUnits = readFormulaNumber(cardNode, "world-units");

    if ([spritePixels, worldUnits].some((item) => Number.isNaN(item) || item <= 0)) {
      updateFormulaResult(cardNode, "Pixels per unit", "Invalid input", "Enter positive values for sprite size and desired world size.");
      return;
    }

    const ppu = spritePixels / worldUnits;
    const unitsPerPixel = worldUnits / spritePixels;
    const sampleHeight = 100 / ppu;

    if (pixelsValue) {
      pixelsValue.textContent = `${formatNumber(spritePixels, 2)} px`;
    }
    if (worldValue) {
      worldValue.textContent = `${formatNumber(worldUnits, 2)} units`;
    }
    if (ppuValue) {
      ppuValue.textContent = formatNumber(ppu, 3);
    }
    if (uppValue) {
      uppValue.textContent = formatNumber(unitsPerPixel, 4);
    }
    if (sampleHeightValue) {
      sampleHeightValue.textContent = `${formatNumber(sampleHeight, 3)} units`;
    }

    updateFormulaResult(
      cardNode,
      "Pixels per unit",
      formatNumber(ppu, 3),
      `${formatNumber(spritePixels, 2)} pixels spread across ${formatNumber(worldUnits, 2)} world units means the import scale should be ${formatNumber(ppu, 3)} pixels per unit. One pixel would then represent ${formatNumber(unitsPerPixel, 4)} units of world space.`
    );
  };

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupTilemapWorldSizeCard(cardNode) {
  const rect = cardNode.querySelector("[data-tilemap-rect]");
  const dimensionsLabel = cardNode.querySelector("[data-tilemap-dimensions]");
  const unitsLabel = cardNode.querySelector("[data-tilemap-units]");
  const pixelSizeValue = cardNode.querySelector("[data-tilemap-pixel-size]");
  const totalTilesValue = cardNode.querySelector("[data-tilemap-total-tiles]");
  const worldSizeValue = cardNode.querySelector("[data-tilemap-world-size]");

  const run = () => {
    const tileWidth = readFormulaNumber(cardNode, "tile-width");
    const tileHeight = readFormulaNumber(cardNode, "tile-height");
    const columns = readFormulaNumber(cardNode, "columns");
    const rows = readFormulaNumber(cardNode, "rows");
    const ppu = readFormulaNumber(cardNode, "ppu");

    if ([tileWidth, tileHeight, columns, rows, ppu].some((item) => Number.isNaN(item) || item <= 0)) {
      updateFormulaResult(cardNode, "Tilemap size result", "Invalid input", "Enter positive values for tile size, grid count, and pixels per unit.");
      return;
    }

    const pixelWidth = tileWidth * columns;
    const pixelHeight = tileHeight * rows;
    const totalTiles = columns * rows;
    const worldWidth = pixelWidth / ppu;
    const worldHeight = pixelHeight / ppu;

    const previewWidth = 260;
    const previewHeight = 150;
    const scale = Math.min(previewWidth / pixelWidth, previewHeight / pixelHeight);
    const rectWidth = pixelWidth * scale;
    const rectHeight = pixelHeight * scale;
    const rectX = (320 - rectWidth) / 2;
    const rectY = (200 - rectHeight) / 2;

    if (rect) {
      rect.setAttribute("x", String(rectX));
      rect.setAttribute("y", String(rectY));
      rect.setAttribute("width", String(rectWidth));
      rect.setAttribute("height", String(rectHeight));
    }
    if (dimensionsLabel) {
      dimensionsLabel.textContent = `${formatNumber(pixelWidth, 0)} x ${formatNumber(pixelHeight, 0)} px`;
    }
    if (unitsLabel) {
      unitsLabel.textContent = `${formatNumber(worldWidth, 2)} x ${formatNumber(worldHeight, 2)} units`;
    }
    if (pixelSizeValue) {
      pixelSizeValue.textContent = `${formatNumber(pixelWidth, 0)} x ${formatNumber(pixelHeight, 0)}`;
    }
    if (totalTilesValue) {
      totalTilesValue.textContent = formatNumber(totalTiles, 0);
    }
    if (worldSizeValue) {
      worldSizeValue.textContent = `${formatNumber(worldWidth, 2)} x ${formatNumber(worldHeight, 2)}`;
    }

    updateFormulaResult(
      cardNode,
      "Tilemap size result",
      `${formatNumber(pixelWidth, 0)} x ${formatNumber(pixelHeight, 0)} px`,
      `A ${formatNumber(columns, 0)} by ${formatNumber(rows, 0)} tilemap with ${formatNumber(tileWidth, 0)} x ${formatNumber(tileHeight, 0)} pixel tiles produces a map footprint of ${formatNumber(pixelWidth, 0)} x ${formatNumber(pixelHeight, 0)} pixels, or ${formatNumber(worldWidth, 2)} x ${formatNumber(worldHeight, 2)} world units at ${formatNumber(ppu, 2)} pixels per unit.`
    );
  };

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupSpriteSheetFrameCount2dCard(cardNode) {
  const gridGroup = cardNode.querySelector("[data-sheet-grid]");
  const summary = cardNode.querySelector("[data-sheet-summary]");
  const columnsValue = cardNode.querySelector("[data-sheet-columns]");
  const rowsValue = cardNode.querySelector("[data-sheet-rows]");
  const framesValue = cardNode.querySelector("[data-sheet-frames]");

  const run = () => {
    const sheetWidth = readFormulaNumber(cardNode, "sheet-width");
    const sheetHeight = readFormulaNumber(cardNode, "sheet-height");
    const frameWidth = readFormulaNumber(cardNode, "frame-width");
    const frameHeight = readFormulaNumber(cardNode, "frame-height");

    if ([sheetWidth, sheetHeight, frameWidth, frameHeight].some((item) => Number.isNaN(item) || item <= 0)) {
      updateFormulaResult(cardNode, "Frame count result", "Invalid input", "Enter positive values for sheet and frame dimensions.");
      return;
    }

    const columns = Math.floor(sheetWidth / frameWidth);
    const rows = Math.floor(sheetHeight / frameHeight);
    const frames = columns * rows;
    const unusedX = sheetWidth - columns * frameWidth;
    const unusedY = sheetHeight - rows * frameHeight;

    const previewWidth = 260;
    const previewHeight = 170;
    const scale = Math.min(previewWidth / sheetWidth, previewHeight / sheetHeight);
    const outerWidth = sheetWidth * scale;
    const outerHeight = sheetHeight * scale;
    const originX = (320 - outerWidth) / 2;
    const originY = 16 + (170 - outerHeight) / 2;

    if (gridGroup) {
      const lines = [];
      lines.push(`<rect x="${originX}" y="${originY}" width="${outerWidth}" height="${outerHeight}" rx="12" class="formula-plot__rect"></rect>`);

      const visibleColumns = Math.min(columns, 24);
      const visibleRows = Math.min(rows, 24);

      for (let column = 1; column < visibleColumns; column += 1) {
        const x = originX + ((outerWidth / columns) * column);
        lines.push(`<line x1="${x}" y1="${originY}" x2="${x}" y2="${originY + outerHeight}" class="formula-plot__reference"></line>`);
      }

      for (let row = 1; row < visibleRows; row += 1) {
        const y = originY + ((outerHeight / rows) * row);
        lines.push(`<line x1="${originX}" y1="${y}" x2="${originX + outerWidth}" y2="${y}" class="formula-plot__reference"></line>`);
      }

      gridGroup.innerHTML = lines.join("");
    }

    if (summary) {
      summary.textContent = `${formatNumber(columns, 0)} cols x ${formatNumber(rows, 0)} rows`;
    }
    if (columnsValue) {
      columnsValue.textContent = formatNumber(columns, 0);
    }
    if (rowsValue) {
      rowsValue.textContent = formatNumber(rows, 0);
    }
    if (framesValue) {
      framesValue.textContent = formatNumber(frames, 0);
    }

    updateFormulaResult(
      cardNode,
      "Frame count result",
      formatNumber(frames, 0),
      `${formatNumber(columns, 0)} columns and ${formatNumber(rows, 0)} rows fit cleanly into the sheet, for a total of ${formatNumber(frames, 0)} frames. Unused edge space: ${formatNumber(unusedX, 0)} px horizontally and ${formatNumber(unusedY, 0)} px vertically.`
    );
  };

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupNormalizeVectorCard(cardNode, dimension) {
  const magnitudeNode = cardNode.querySelector(`[data-normalize-${dimension}d-magnitude]`);
  const vectorNode = cardNode.querySelector(`[data-normalize-${dimension}d-vector]`);

  const run = () => {
    const x = readFormulaNumber(cardNode, "x");
    const y = readFormulaNumber(cardNode, "y");
    const z = dimension === 3 ? readFormulaNumber(cardNode, "z") : 0;
    const values = dimension === 3 ? [x, y, z] : [x, y];

    if (values.some((item) => Number.isNaN(item))) {
      updateFormulaResult(
        cardNode,
        `${dimension}D normalized vector`,
        "Invalid input",
        `Enter valid numeric ${dimension}D vector components.`
      );
      return;
    }

    const magnitude = Math.hypot(...values);
    const normalized =
      magnitude === 0
        ? values.map(() => 0)
        : values.map((value) => value / magnitude);

    if (magnitudeNode) {
      magnitudeNode.textContent = formatNumber(magnitude, 3);
    }

    if (vectorNode) {
      vectorNode.textContent = normalized.map((value) => formatNumber(value, 3)).join(", ");
    }

    const vectorLabel = `(${values.map((value) => formatNumber(value, 2)).join(", ")})`;
    const normalizedLabel = `(${normalized.map((value) => formatNumber(value, 3)).join(", ")})`;
    const explanation =
      magnitude === 0
        ? `${dimension}D vector ${vectorLabel} has zero magnitude, so there is no direction to preserve. Return a zero vector or guard against normalization in code.`
        : `${dimension}D vector ${vectorLabel} has magnitude ${formatNumber(magnitude, 3)}. Dividing each component by that magnitude gives ${normalizedLabel}, which keeps the same direction but now has a magnitude of 1.`;

    updateFormulaResult(
      cardNode,
      `${dimension}D normalized vector`,
      normalizedLabel,
      explanation
    );
  };

  cardNode.querySelectorAll("[data-formula-input]").forEach((input) => {
    input.addEventListener("input", run);
  });

  run();
}

function setupFormulaSearch() {
  document.querySelectorAll("[data-formula-search-root]").forEach((root) => {
    const input = root.querySelector("[data-formula-search-input]");
    const cards = Array.from(root.querySelectorAll("[data-formula-card-item]"));
    const status = root.querySelector("[data-formula-search-status]");
    const categoryFilter = root.querySelector("[data-formula-category-filter]");

    if (!input || cards.length === 0) {
      return;
    }

    const run = () => {
      const query = input.value.trim().toLowerCase();
      const selectedCategory = categoryFilter ? categoryFilter.value : "";
      const hasLookup = query.length > 0 || selectedCategory !== "";
      let visibleCount = 0;

      cards.forEach((card) => {
        const haystack = card.getAttribute("data-formula-search") || "";
        const cardCategory = card.getAttribute("data-formula-category") || "";
        const matchesCategory = selectedCategory === "" || cardCategory === selectedCategory;
        const matchesQuery = query.length === 0 || haystack.includes(query);
        const isVisible = hasLookup && matchesCategory && matchesQuery;
        card.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
        }
      });

      if (!status) {
        return;
      }

      status.textContent =
        !hasLookup
            ? "Start typing to search the formula wall."
          : visibleCount === 0
            ? `No formulas match "${query}" yet. Try another problem or keyword.`
            : `Showing ${visibleCount} formula${visibleCount === 1 ? "" : "s"} for "${query}".`;
    };

    input.addEventListener("input", run);
    if (categoryFilter) {
      categoryFilter.addEventListener("change", run);
    }
    run();
  });
}

function setupClickableFormulaCards() {
  document.querySelectorAll("[data-card-link]").forEach((card) => {
    const href = card.getAttribute("data-card-link");
    if (!href) {
      return;
    }

    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, textarea, label")) {
        return;
      }

      window.location.href = href;
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      if (event.target.closest("a, button, input, select, textarea")) {
        return;
      }

      event.preventDefault();
      window.location.href = href;
    });
  });
}

function setupFormulaReference() {
  const clampCard = document.querySelector('[data-formula-card="clamp"]');
  const lerpCard = document.querySelector('[data-formula-card="lerp"]');
  const remapCard = document.querySelector('[data-formula-card="remap"]');
  const distance2dCard = document.querySelector('[data-formula-card="distance-2d"]');
  const direction2dCard = document.querySelector('[data-formula-card="direction-2d"]');
  const angle2dCard = document.querySelector('[data-formula-card="angle-2d"]');
  const ppu2dCard = document.querySelector('[data-formula-card="ppu-2d"]');
  const tilemapWorldSizeCard = document.querySelector('[data-formula-card="tilemap-world-size"]');
  const spriteSheetFrameCount2dCard = document.querySelector('[data-formula-card="sprite-sheet-frame-count-2d"]');
  const normalizeVector2dCard = document.querySelector('[data-formula-card="normalize-vector-2d"]');
  const normalizeVector3dCard = document.querySelector('[data-formula-card="normalize-vector-3d"]');

  if (clampCard) {
    setupClampCard(clampCard);
  }

  if (lerpCard) {
    setupLerpCard(lerpCard);
  }

  if (remapCard) {
    setupRemapCard(remapCard);
  }

  if (distance2dCard) {
    setupDistance2dCard(distance2dCard);
  }

  if (direction2dCard) {
    setupDirection2dCard(direction2dCard);
  }

  if (angle2dCard) {
    setupAngle2dCard(angle2dCard);
  }

  if (ppu2dCard) {
    setupPixelsPerUnit2dCard(ppu2dCard);
  }

  if (tilemapWorldSizeCard) {
    setupTilemapWorldSizeCard(tilemapWorldSizeCard);
  }

  if (spriteSheetFrameCount2dCard) {
    setupSpriteSheetFrameCount2dCard(spriteSheetFrameCount2dCard);
  }

  if (normalizeVector2dCard) {
    setupNormalizeVectorCard(normalizeVector2dCard, 2);
  }

  if (normalizeVector3dCard) {
    setupNormalizeVectorCard(normalizeVector3dCard, 3);
  }

  setupFormulaSearch();
  setupClickableFormulaCards();
}

setupFormulaReference();

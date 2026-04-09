function getPageEditorPath() {
  const canonicalNode = document.querySelector('link[rel="canonical"]');

  if (canonicalNode && canonicalNode.href) {
    try {
      return new URL(canonicalNode.href).pathname;
    } catch (error) {
      // Fall back to the current path if the canonical URL is malformed.
    }
  }

  return window.location.pathname;
}

function isPageEditorLocalHost() {
  return (
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.__GDU_EDITOR_APP__ === true
  );
}

function getPageEditorSourceOverrides() {
  const source = window.__GDU_PAGE_EDITOR_OVERRIDES__;
  return source && typeof source === "object" ? source : {};
}

function getPageEditorDraftKey(pagePath) {
  const draftVersion = pagePath === "/distance-between-two-2d-points.html" ? "v7" : "v4";
  return `gdu-page-editor-draft:${draftVersion}:${pagePath}`;
}

function readPageEditorDraft(pagePath) {
  try {
    const raw = window.localStorage.getItem(getPageEditorDraftKey(pagePath));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writePageEditorDraft(pagePath, value) {
  window.localStorage.setItem(getPageEditorDraftKey(pagePath), JSON.stringify(value));
}

function clearPageEditorDraft(pagePath) {
  window.localStorage.removeItem(getPageEditorDraftKey(pagePath));
}

function getPageEditorCriticalFailures() {
  if (!Array.isArray(window.__GDU_PAGE_EDITOR_CRITICAL_FAILURES__)) {
    window.__GDU_PAGE_EDITOR_CRITICAL_FAILURES__ = [];
  }

  return window.__GDU_PAGE_EDITOR_CRITICAL_FAILURES__;
}

function recordPageEditorCriticalFailure(message) {
  const text = String(message || "").trim();
  if (!text) {
    return;
  }

  const failures = getPageEditorCriticalFailures();
  if (failures[failures.length - 1] !== text) {
    failures.push(text);
  }

  window.__GDU_PAGE_EDITOR_LAST_ERROR__ = text;
}

function mergePageEditorMaps(sourceMap, draftMap) {
  const merged = {
    ...(sourceMap || {}),
  };

  Object.entries(draftMap || {}).forEach(([nodeKey, draftOverride]) => {
    const sourceOverride = merged[nodeKey];
    if (!sourceOverride || typeof sourceOverride !== "object" || typeof draftOverride !== "object") {
      merged[nodeKey] = draftOverride;
      return;
    }

    merged[nodeKey] = {
      ...sourceOverride,
      ...draftOverride,
      styles: {
        ...(sourceOverride.styles || {}),
        ...(draftOverride.styles || {}),
      },
      placement:
        sourceOverride.placement || draftOverride.placement
          ? {
              ...(sourceOverride.placement || {}),
              ...(draftOverride.placement || {}),
            }
          : undefined,
      components:
        sourceOverride.components || draftOverride.components
          ? {
              ...(sourceOverride.components || {}),
              ...(draftOverride.components || {}),
            }
          : undefined,
    };

    if (!merged[nodeKey].styles || !Object.keys(merged[nodeKey].styles).length) {
      delete merged[nodeKey].styles;
    }
    if (!merged[nodeKey].placement || !Object.keys(merged[nodeKey].placement).length) {
      delete merged[nodeKey].placement;
    }
    if (!merged[nodeKey].components || !Object.keys(merged[nodeKey].components).length) {
      delete merged[nodeKey].components;
    }
  });

  return merged;
}

function escapePageEditorHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isDomElement(node) {
  return !!node && node.nodeType === 1;
}

function getPageEditorRoot() {
  return document.querySelector(".page-main");
}

function getPageEditorFlowContainer() {
  return document.querySelector(".page-main");
}

function getPageEditorEligibleNodes(rootNode) {
  const selector = [
    "section",
    "article",
    "div.hero__layout",
    "div.hero__content",
    "div.section-heading",
    "div.button-row",
    "div.formula-lab--visual",
    "div.formula-visual",
    "div.formula-visual__stats",
    "div.formula-preview-stack",
    "div.formula-search-panel__header",
    "div.formula-search-panel__controls",
    "div.surface",
    "div.result",
    "div.field",
    "div.formula-plot",
    "div.formula-preview-card",
    "div.formula-stat",
    "div.formula-point-group",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "label",
    "a",
    "button",
    "input",
    "textarea",
    "select",
  ].join(",");

  return [...rootNode.querySelectorAll(selector)].filter((node) => {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    if (node.closest(".layout-editor")) {
      return false;
    }

    if (
      node.matches(
        ".page-editor-table-asset__row, .page-editor-table-asset__cell, .page-editor-table-asset__divider, .page-editor-table-asset__row-add, .page-editor-table-asset__subrow, .page-editor-table-asset__subcell, .page-editor-table-asset__subcell-divider, .page-editor-table-asset__subdivider, .page-editor-table-asset__subrow-add, .page-editor-table-asset__subrow-remove"
      )
    ) {
      return false;
    }

    return true;
  });
}

function findBestEditableNode(targetNode, rootNode) {
  let currentNode =
    targetNode instanceof Element
      ? targetNode instanceof HTMLElement
        ? targetNode
        : targetNode.parentElement
      : null;

  while (currentNode && currentNode !== rootNode) {
    if (currentNode.dataset.pageEditorKey) {
      return currentNode;
    }

    currentNode = currentNode.parentElement;
  }

  return null;
}

function isPreferredDirectEditableNode(node) {
  return (
    isTextEditableNode(node) ||
    node.matches("a, button, input, textarea, select")
  );
}

function getPageEditorNodeArea(node) {
  const rect = node.getBoundingClientRect();
  return Math.max(1, rect.width * rect.height);
}

function findBestEditableNodeFromPoint(x, y, rootNode) {
  const seenKeys = new Set();
  const nodesAtPoint = document.elementsFromPoint(x, y)
    .map((node) => {
      if (!(node instanceof Element) || !rootNode.contains(node)) {
        return null;
      }

      if (node instanceof HTMLElement && node.dataset.pageEditorKey) {
        return node;
      }

      return findBestEditableNode(node, rootNode);
    })
    .filter((node) => {
      if (!(node instanceof HTMLElement) || !node.dataset.pageEditorKey) {
        return false;
      }

      if (seenKeys.has(node.dataset.pageEditorKey)) {
        return false;
      }

      seenKeys.add(node.dataset.pageEditorKey);
      return true;
    });

  const directMatches = nodesAtPoint.filter((node) => isPreferredDirectEditableNode(node));
  if (directMatches.length) {
    return directMatches.sort(
      (leftNode, rightNode) => getPageEditorNodeArea(leftNode) - getPageEditorNodeArea(rightNode)
    )[0];
  }

  return (
    nodesAtPoint.sort(
      (leftNode, rightNode) => getPageEditorNodeArea(leftNode) - getPageEditorNodeArea(rightNode)
    )[0] || null
  );
}

function getPageEditorNodeKey(node) {
  const rootNode = getPageEditorRoot();
  if (node === rootNode) {
    return "root";
  }
  const parts = [];
  let currentNode = node;

  while (currentNode && currentNode !== rootNode) {
    const parent = currentNode.parentElement;
    if (!parent) {
      break;
    }

    const siblings = [...parent.children].filter(
      (sibling) => sibling.tagName === currentNode.tagName
    );
    const siblingIndex = siblings.indexOf(currentNode) + 1;
    parts.unshift(`${currentNode.tagName.toLowerCase()}:${siblingIndex}`);
    currentNode = parent;
  }

  return parts.join("/");
}

function describePageEditorNode(node) {
  const tag = node.tagName.toLowerCase();
  const className = [...node.classList].find((name) => !name.startsWith("layout-editor"));
  return className ? `${tag}.${className}` : tag;
}

function isPageEditorContainerNode(node) {
  return (
    node instanceof HTMLElement &&
    node.matches("section, article, div") &&
    !node.matches(".formula-stat, .formula-preview-card, .field")
  );
}

function isPageBorderAsset(node) {
  return node instanceof HTMLElement && node.matches(".page-editor-border-asset");
}

function isPageLevelPlacementContainer(node, rootNode) {
  const flowNode = getPageEditorFlowContainer();
  return (
    node instanceof HTMLElement &&
    (node === flowNode || (!flowNode && node === rootNode))
  );
}

function findContainerTargetNode(targetNode, rootNode, selectedNode) {
  let currentNode =
    targetNode instanceof Element
      ? targetNode instanceof HTMLElement
        ? targetNode
        : targetNode.parentElement
      : null;

  while (currentNode && currentNode !== rootNode) {
    if (
      (currentNode.dataset.pageEditorDockable === "true" || currentNode.dataset.pageEditorDockKey) &&
      currentNode !== selectedNode &&
      !selectedNode?.contains(currentNode) &&
      (!isPageBorderAsset(selectedNode) || isPageLevelPlacementContainer(currentNode, rootNode))
    ) {
      return currentNode;
    }

    currentNode = currentNode.parentElement;
  }

  return null;
}

function getPageEditorNodeKind(node) {
  if (node.matches("input, textarea, select, button, a")) {
    return "widget";
  }

  if (node.matches("h1, h2, h3, h4, h5, h6, p, label, span")) {
    return "text";
  }

  if (
    node.matches(
      ".formula-plot, .formula-visual__stats, .formula-preview-stack, .formula-search-panel__controls, .button-row"
    )
  ) {
    return "layout";
  }

  if (isPageEditorContainerNode(node)) {
    return "panel";
  }

  return "widget";
}

function getAnchorPresetFromStyles(styles) {
  const justify = styles?.justifySelf || "";
  const align = styles?.alignSelf || "";

  if (justify === "stretch" && align === "stretch") {
    return "fill";
  }

  const horizontal = justify || "start";
  const vertical = align || "start";
  return `${vertical === "start" ? "top" : vertical === "center" ? "center" : vertical === "end" ? "bottom" : "top"}-${
    horizontal === "start" ? "left" : horizontal === "center" ? "center" : horizontal === "end" ? "right" : "left"
  }`.replace("center-center", "center");
}

function getStylesFromAnchorPreset(preset) {
  switch (preset) {
    case "fill":
      return { justifySelf: "stretch", alignSelf: "stretch" };
    case "top-left":
      return { justifySelf: "start", alignSelf: "start" };
    case "top-center":
      return { justifySelf: "center", alignSelf: "start" };
    case "top-right":
      return { justifySelf: "end", alignSelf: "start" };
    case "center-left":
      return { justifySelf: "start", alignSelf: "center" };
    case "center":
      return { justifySelf: "center", alignSelf: "center" };
    case "center-right":
      return { justifySelf: "end", alignSelf: "center" };
    case "bottom-left":
      return { justifySelf: "start", alignSelf: "end" };
    case "bottom-center":
      return { justifySelf: "center", alignSelf: "end" };
    case "bottom-right":
      return { justifySelf: "end", alignSelf: "end" };
    default:
      return {};
  }
}

function getSiblingRowGroups(parentNode) {
  const children = [...parentNode.children].filter((child) => child instanceof HTMLElement);
  const rows = [];
  const threshold = 18;

  children.forEach((child, index) => {
    const rect = child.getBoundingClientRect();
    const record = { node: child, index, top: rect.top, left: rect.left };
    const existingRow = rows.find((row) => Math.abs(row.top - rect.top) <= threshold);

    if (existingRow) {
      existingRow.items.push(record);
      existingRow.top = Math.min(existingRow.top, rect.top);
    } else {
      rows.push({
        top: rect.top,
        items: [record],
      });
    }
  });

  rows.sort((leftRow, rightRow) => leftRow.top - rightRow.top);
  rows.forEach((row) => row.items.sort((leftItem, rightItem) => leftItem.left - rightItem.left));
  return rows;
}

function setGridRowForNodeDraft(draftPageOverrides, node, rowNumber) {
  if (!(node instanceof HTMLElement) || !node.dataset.pageEditorKey) {
    return;
  }

  const nodeKey = node.dataset.pageEditorKey;
  const existingOverride = draftPageOverrides[nodeKey] || {};
  const nextStyles = {
    ...(existingOverride.styles || {}),
    gridRow: String(rowNumber),
  };

  draftPageOverrides[nodeKey] = {
    ...existingOverride,
    styles: nextStyles,
  };
}

function rewriteParentPlacementDraft(draftPageOverrides, parentNode, rows, options = {}) {
  if (!(parentNode instanceof HTMLElement) || !parentNode.dataset.pageEditorKey) {
    return;
  }

  const useGrid = options.useGrid === true;
  let linearIndex = 0;

  rows.forEach((rowNodes, rowIndex) => {
    rowNodes.forEach((childNode, columnIndex) => {
      if (!(childNode instanceof HTMLElement) || !childNode.dataset.pageEditorKey) {
        return;
      }

      const childKey = childNode.dataset.pageEditorKey;
      const existingOverride = draftPageOverrides[childKey] || {};
      const nextStyles = {
        ...(existingOverride.styles || {}),
      };

      ["gridColumn", "gridRow", "order", "justifySelf", "alignSelf"].forEach((styleKey) => {
        delete nextStyles[styleKey];
      });

      if (useGrid) {
        nextStyles.gridRow = String(rowIndex + 1);
        nextStyles.gridColumn = String(columnIndex + 1);
      }

      const nextOverride = {
        ...existingOverride,
        placement: {
          parentKey: parentNode.dataset.pageEditorKey,
          index: linearIndex,
        },
      };

      if (Object.keys(nextStyles).length) {
        nextOverride.styles = nextStyles;
      } else {
        delete nextOverride.styles;
      }

      draftPageOverrides[childKey] = nextOverride;
      linearIndex += 1;
    });
  });
}

function getEditableText(node) {
  if (node.matches("input, textarea, select")) {
    return node.value || "";
  }

  return node.textContent?.trim() || "";
}

function setTextControlValue(node, value) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  const nextValue = typeof value === "string" ? value : "";

  if (!node.matches("input, textarea, select")) {
    node.textContent = nextValue;
    return;
  }

  node.value = nextValue;

  if (node instanceof HTMLTextAreaElement) {
    node.defaultValue = nextValue;
    node.textContent = nextValue;
    return;
  }

  if (node.hasAttribute("value")) {
    node.setAttribute("value", nextValue);
  }
}

function upgradeLegacyTextboxAssets(rootNode) {
  if (!(rootNode instanceof HTMLElement)) {
    return;
  }

  const legacyNodes = [
    ...rootNode.querySelectorAll("textarea[data-page-editor-debug-display-component='textbox']"),
  ].filter((node) => node instanceof HTMLTextAreaElement);

  legacyNodes.forEach((legacyNode) => {
    const replacementNode = document.createElement("div");
    replacementNode.className = legacyNode.className;
    [...legacyNode.attributes].forEach((attribute) => {
      if (attribute.name === "value" || attribute.name === "placeholder") {
        return;
      }
      replacementNode.setAttribute(attribute.name, attribute.value);
    });
    replacementNode.setAttribute("role", "textbox");
    replacementNode.style.cssText = legacyNode.style.cssText;
    setTextControlValue(replacementNode, legacyNode.value || legacyNode.textContent || "");
    legacyNode.replaceWith(replacementNode);
  });
}

function isTextEditableNode(node) {
  return node.matches("h1, h2, h3, h4, h5, h6, p, label, a, button, span");
}

function normalizePageEditorDimension(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}px`;
  }

  return trimmed;
}

function parseGridPlacement(value) {
  if (typeof value !== "string") {
    return { start: "", span: "" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { start: "", span: "" };
  }

  const spanMatch = trimmed.match(/^(\d+)\s*\/\s*span\s*(\d+)$/i);
  if (spanMatch) {
    return { start: spanMatch[1], span: spanMatch[2] };
  }

  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) {
    return { start: singleMatch[1], span: "" };
  }

  return { start: trimmed, span: "" };
}

function buildGridPlacement(start, span) {
  const safeStart = String(start || "").trim();
  const safeSpan = String(span || "").trim();

  if (!safeStart) {
    return "";
  }

  if (safeSpan) {
    return `${safeStart} / span ${safeSpan}`;
  }

  return safeStart;
}

function getComputedStyleValue(node, styleName) {
  if (!node) {
    return "";
  }

  const computed = window.getComputedStyle(node);
  const value = computed[styleName];
  return value && value !== "auto" && value !== "normal" ? value : "";
}

function getExplicitStyleValue(node, styleName) {
  if (!(node instanceof HTMLElement)) {
    return "";
  }

  const inlineValue = node.style?.[styleName];
  if (inlineValue && inlineValue !== "auto" && inlineValue !== "normal") {
    return inlineValue;
  }

  const attributeValue = node.style?.getPropertyValue?.(
    styleName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
  );
  return attributeValue && attributeValue !== "auto" && attributeValue !== "normal"
    ? attributeValue
    : "";
}

function getCurrentGridPlacement(node, axis) {
  if (!node) {
    return { start: "", span: "" };
  }

  const computed = window.getComputedStyle(node);
  const startValue = computed[`${axis}Start`];
  const endValue = computed[`${axis}End`];
  const safeStart = startValue && /^\d+$/.test(startValue) ? startValue : "";
  const safeEnd = endValue && /^\d+$/.test(endValue) ? endValue : "";

  if (!safeStart) {
    return { start: "", span: "" };
  }

  if (safeEnd) {
    const span = Number.parseInt(safeEnd, 10) - Number.parseInt(safeStart, 10);
    return {
      start: safeStart,
      span: span > 1 ? String(span) : "",
    };
  }

  return { start: safeStart, span: "" };
}

function getGridPlacementBounds(node) {
  const column = getCurrentGridPlacement(node, "gridColumn");
  const row = getCurrentGridPlacement(node, "gridRow");
  const columnStart = Number.parseInt(column.start || "0", 10) || 1;
  const columnSpan = Number.parseInt(column.span || "1", 10) || 1;
  const rowStart = Number.parseInt(row.start || "0", 10) || 1;
  const rowSpan = Number.parseInt(row.span || "1", 10) || 1;

  return {
    columnStart,
    columnEnd: columnStart + columnSpan - 1,
    rowStart,
    rowEnd: rowStart + rowSpan - 1,
  };
}

function doGridBoundsOverlap(leftBounds, rightBounds) {
  return !(
    leftBounds.columnEnd < rightBounds.columnStart ||
    rightBounds.columnEnd < leftBounds.columnStart ||
    leftBounds.rowEnd < rightBounds.rowStart ||
    rightBounds.rowEnd < leftBounds.rowStart
  );
}

function doRectsOverlap(leftRect, rightRect) {
  return !(
    leftRect.right <= rightRect.left ||
    rightRect.right <= leftRect.left ||
    leftRect.bottom <= rightRect.top ||
    rightRect.bottom <= leftRect.top
  );
}

function getGridTrackMetrics(parentNode, selectedNode) {
  if (!(parentNode instanceof HTMLElement) || !(selectedNode instanceof HTMLElement)) {
    return {
      columnCount: 1,
      columnGap: 0,
      rowGap: 0,
      baseColumnWidth: Math.max(1, selectedNode?.getBoundingClientRect?.().width || 1),
      baseRowHeight: Math.max(1, selectedNode?.getBoundingClientRect?.().height || 1),
    };
  }

  const parentStyle = window.getComputedStyle(parentNode);
  const selectedBounds = getGridPlacementBounds(selectedNode);
  const selectedRect = selectedNode.getBoundingClientRect();
  const columnGap = Number.parseFloat(parentStyle.columnGap || "0") || 0;
  const rowGap = Number.parseFloat(parentStyle.rowGap || "0") || 0;
  const explicitColumns = (parentStyle.gridTemplateColumns || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const siblingBounds = [...parentNode.children]
    .filter((child) => child instanceof HTMLElement && !!child.dataset.pageEditorKey)
    .map((child) => getGridPlacementBounds(child));
  const inferredColumns = Math.max(1, ...siblingBounds.map((bounds) => bounds.columnEnd));
  const columnCount = Math.max(1, explicitColumns || inferredColumns);
  const selectedColumnSpan = Math.max(1, selectedBounds.columnEnd - selectedBounds.columnStart + 1);
  const selectedRowSpan = Math.max(1, selectedBounds.rowEnd - selectedBounds.rowStart + 1);
  const baseColumnWidth = Math.max(
    1,
    (selectedRect.width - columnGap * Math.max(0, selectedColumnSpan - 1)) / selectedColumnSpan
  );
  const baseRowHeight = Math.max(
    1,
    (selectedRect.height - rowGap * Math.max(0, selectedRowSpan - 1)) / selectedRowSpan
  );

  return {
    columnCount,
    columnGap,
    rowGap,
    baseColumnWidth,
    baseRowHeight,
  };
}

function getPageEditorLayoutContext(node) {
  const parent = node.parentElement;
  if (!parent) {
    return {
      display: "block",
      supportsGridPlacement: false,
      supportsOrder: false,
      supportsSelfAlignment: false,
    };
  }

  const display = window.getComputedStyle(parent).display;
  const isGrid = display.includes("grid");
  const isFlex = display.includes("flex");

  return {
    display,
    supportsGridPlacement: isGrid,
    supportsOrder: isGrid || isFlex,
    supportsSelfAlignment: isGrid || isFlex,
  };
}

function getContainerLayoutContext(containerNode) {
  if (!(containerNode instanceof HTMLElement)) {
    return {
      display: "block",
      supportsGridPlacement: false,
      supportsOrder: false,
      supportsSelfAlignment: false,
    };
  }

  const display = window.getComputedStyle(containerNode).display;
  const isGrid = display.includes("grid");
  const isFlex = display.includes("flex");

  return {
    display,
    supportsGridPlacement: isGrid,
    supportsOrder: isGrid || isFlex,
    supportsSelfAlignment: isGrid || isFlex,
  };
}

function isStructuredGridContainer(node) {
  return (
    node instanceof HTMLElement &&
    node.matches(
      ".formula-lab--visual, .formula-visual, .formula-visual__stats, .formula-point-groups, .formula-point-group__row, .formula-preview-stack, .button-row, .formula-search-panel__controls"
    )
  );
}

function shouldUseManagedGridPlacement(containerNode) {
  const layout = getContainerLayoutContext(containerNode);
  return layout.supportsGridPlacement && !isStructuredGridContainer(containerNode);
}

function isInsideTableAsset(node) {
  return node instanceof HTMLElement && !!node.closest(".page-editor-table-asset");
}

function isFreeMoveEligible(node) {
  return (
    node instanceof HTMLElement &&
    !isInsideTableAsset(node) &&
      !node.matches(".page-editor-border-asset, .page-editor-table-asset__row, .page-editor-table-asset__cell, .page-editor-table-asset__divider, .page-editor-table-asset__row-resize, .page-editor-table-asset__subrow, .page-editor-table-asset__subcell, .page-editor-table-asset__subcell-divider, .page-editor-table-asset__subdivider")
  );
}

function isFreePositionContainer(node) {
  return node instanceof HTMLElement && node.matches(".page-editor-border-asset");
}

function ensurePositionedParent(parentNode) {
  if (!(parentNode instanceof HTMLElement)) {
    return;
  }

  if (window.getComputedStyle(parentNode).position === "static") {
    parentNode.style.position = "relative";
  }
}

function getNodeRectRelativeToParent(node, parentNode) {
  if (!(node instanceof HTMLElement) || !(parentNode instanceof HTMLElement)) {
    return { left: 0, top: 0 };
  }

  const nodeRect = node.getBoundingClientRect();
  const parentRect = parentNode.getBoundingClientRect();
  return {
    left: Math.round(nodeRect.left - parentRect.left + parentNode.scrollLeft),
    top: Math.round(nodeRect.top - parentRect.top + parentNode.scrollTop),
  };
}

function getFreePositionPreset(parentNode, node, axis, preset) {
  if (!(parentNode instanceof HTMLElement) || !(node instanceof HTMLElement) || !preset) {
    return "";
  }

  const parentRect = parentNode.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const available =
    axis === "x"
      ? Math.max(0, parentRect.width - nodeRect.width)
      : Math.max(0, parentRect.height - nodeRect.height);

  if (preset === "start") {
    return "0px";
  }

  if (preset === "center") {
    return `${Math.round(available / 2)}px`;
  }

  if (preset === "end") {
    return `${Math.round(available)}px`;
  }

  return "";
}

function clearPlacementStylesForNodeOverride(draftPageOverrides, nodeKey) {
  if (!nodeKey) {
    return;
  }

  const existingOverride = draftPageOverrides[nodeKey];
  if (!existingOverride?.styles) {
    return;
  }

  const nextStyles = {
    ...existingOverride.styles,
  };

  ["gridColumn", "gridRow", "order", "justifySelf", "alignSelf"].forEach((styleKey) => {
    delete nextStyles[styleKey];
  });

  if (Object.keys(nextStyles).length) {
    draftPageOverrides[nodeKey] = {
      ...existingOverride,
      styles: nextStyles,
    };
    return;
  }

  const nextOverride = {
    ...existingOverride,
  };
  delete nextOverride.styles;

  if (Object.keys(nextOverride).length) {
    draftPageOverrides[nodeKey] = nextOverride;
  } else {
    delete draftPageOverrides[nodeKey];
  }
}

function clearStructuredContainerPlacementOverrides(draftPageOverrides, containerNode) {
  if (!(containerNode instanceof HTMLElement)) {
    return;
  }

  [...containerNode.children].forEach((childNode) => {
    if (childNode instanceof HTMLElement && childNode.dataset.pageEditorKey) {
      clearPlacementStylesForNodeOverride(draftPageOverrides, childNode.dataset.pageEditorKey);
    }
  });
}

function parseGridRowSchema(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\s,]+/)
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((count) => Number.isFinite(count) && count > 0);
}

function formatGridRowSchema(rowCounts) {
  return Array.isArray(rowCounts) && rowCounts.length ? rowCounts.join(",") : "";
}

function applyGridStructureOverrides(editableNodes, mergedPageOverrides) {
  editableNodes.forEach((containerNode) => {
    const containerKey = containerNode.dataset.pageEditorKey;
    const override = mergedPageOverrides[containerKey];
    const rowSchema = parseGridRowSchema(override?.gridRows || "");

    if (!rowSchema.length || !(containerNode instanceof HTMLElement)) {
      return;
    }

    const children = [...containerNode.children].filter((child) => {
      return child instanceof HTMLElement && !!child.dataset.pageEditorKey && window.getComputedStyle(child).display !== "none";
    });

    if (!children.length) {
      return;
    }

    const maxColumns = Math.max(...rowSchema);
    containerNode.style.gridTemplateColumns = `repeat(${maxColumns}, minmax(0, 1fr))`;

    let childIndex = 0;
    rowSchema.forEach((columnCount, rowIndex) => {
      if (childIndex >= children.length) {
        return;
      }

      const safeColumnCount = Math.max(1, columnCount);
      let columnStart = 1;
      for (let itemIndex = 0; itemIndex < safeColumnCount && childIndex < children.length; itemIndex += 1) {
        const childNode = children[childIndex];
        const remainingColumns = maxColumns - columnStart + 1;
        const remainingItems = safeColumnCount - itemIndex;
        const span = Math.max(1, Math.floor(remainingColumns / remainingItems));

        childNode.style.gridRow = String(rowIndex + 1);
        childNode.style.gridColumn =
          span > 1 ? `${columnStart} / span ${span}` : String(columnStart);

        columnStart += span;
        childIndex += 1;
      }
    });
  });
}

function assignEditableNodeMetadata(node, key) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  node.dataset.pageEditorKey = key;
  node.dataset.pageEditorKind = getPageEditorNodeKind(node);
  node.dataset.pageEditorLabel = `${getPageEditorNodeKind(node)}: ${describePageEditorNode(node)}`;
  if (isPageEditorContainerNode(node)) {
    node.dataset.pageEditorDockable = "true";
  }
}

function getPageEditorPlacementKey(node) {
  if (!(node instanceof HTMLElement)) {
    return "";
  }

  return node.dataset.pageEditorKey || node.dataset.pageEditorDockKey || "";
}

function isDockTargetNode(node) {
  return (
    node instanceof HTMLElement &&
    !!node.dataset.pageEditorDockKey &&
    node.dataset.pageEditorDockable === "true"
  );
}

function isDockedNode(node) {
  return node instanceof HTMLElement && isDockTargetNode(node.parentElement);
}

function getDockHost(node) {
  return node instanceof HTMLElement && isDockedNode(node) ? node.parentElement : null;
}

function getDockHostRules(dockHost, override) {
  if (!(dockHost instanceof HTMLElement)) {
    return null;
  }

  return {
    horizontal:
      override?.dockHorizontal ||
      dockHost.dataset.pageEditorDockHorizontal ||
      "stretch",
    vertical:
      override?.dockVertical ||
      dockHost.dataset.pageEditorDockVertical ||
      "stretch",
    scaleToFit:
      override?.scaleToFit === true ||
      dockHost.dataset.pageEditorDockScaleToFit === "true",
  };
}

function getDockComponentType(node) {
  if (!(node instanceof HTMLElement)) {
    return "";
  }

  return node.dataset.pageEditorDockComponent || "panel";
}

function getDebugDisplayComponentType(node) {
  if (!(node instanceof HTMLElement)) {
    return "";
  }

  return node.dataset.pageEditorDebugDisplayComponent || "";
}

function getDebugDisplayComponentFields(node) {
  const componentType = getDebugDisplayComponentType(node);
  if (componentType === "textbox") {
    return [
      { key: "text", label: "Text", type: "textarea" },
      { key: "left", label: "Left", type: "text" },
      { key: "top", label: "Top", type: "text" },
      { key: "width", label: "Width", type: "text" },
      { key: "height", label: "Height", type: "text" },
      { key: "themeColor", label: "Theme color", type: "color" },
      {
        key: "dockHorizontal",
        label: "Dock horizontal",
        type: "select",
        options: [
          { value: "stretch", label: "Stretch" },
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ],
      },
      {
        key: "dockVertical",
        label: "Dock vertical",
        type: "select",
        options: [
          { value: "stretch", label: "Stretch" },
          { value: "top", label: "Top" },
          { value: "center", label: "Center" },
          { value: "bottom", label: "Bottom" },
        ],
      },
      { key: "scaleToFit", label: "Scale to fit", type: "checkbox" },
    ];
  }

  return [];
}

function getComponentOverride(override, componentType) {
  if (!override || typeof override !== "object" || !componentType) {
    return {};
  }

  if (!override.components || typeof override.components !== "object") {
    return {};
  }

  const componentOverride = override.components[componentType];
  return componentOverride && typeof componentOverride === "object" ? componentOverride : {};
}

function getTextboxDatasetState(node) {
  if (!(node instanceof HTMLElement) || node.dataset.pageEditorDebugDisplayComponent !== "textbox") {
    return {};
  }

  return {
    text: node.dataset.pageEditorTextboxText || "",
    left: node.dataset.pageEditorTextboxLeft || "",
    top: node.dataset.pageEditorTextboxTop || "",
    width: node.dataset.pageEditorTextboxWidth || "",
    height: node.dataset.pageEditorTextboxHeight || "",
    themeColor: node.dataset.pageEditorTextboxThemeColor || "",
    dockHorizontal: node.dataset.pageEditorTextboxDockHorizontal || "",
    dockVertical: node.dataset.pageEditorTextboxDockVertical || "",
    scaleToFit: node.dataset.pageEditorTextboxScaleToFit === "true",
  };
}

function setTextboxDatasetState(node, state) {
  if (!(node instanceof HTMLElement) || node.dataset.pageEditorDebugDisplayComponent !== "textbox") {
    return;
  }

  const mappings = [
    ["text", "pageEditorTextboxText"],
    ["left", "pageEditorTextboxLeft"],
    ["top", "pageEditorTextboxTop"],
    ["width", "pageEditorTextboxWidth"],
    ["height", "pageEditorTextboxHeight"],
    ["themeColor", "pageEditorTextboxThemeColor"],
    ["dockHorizontal", "pageEditorTextboxDockHorizontal"],
    ["dockVertical", "pageEditorTextboxDockVertical"],
  ];

  mappings.forEach(([key, datasetKey]) => {
    const value = state?.[key];
    if (typeof value === "string" && value) {
      node.dataset[datasetKey] = value;
    } else {
      delete node.dataset[datasetKey];
    }
  });

  if (state?.scaleToFit === true) {
    node.dataset.pageEditorTextboxScaleToFit = "true";
  } else {
    delete node.dataset.pageEditorTextboxScaleToFit;
  }
}

function setComponentOverride(nextOverride, componentType, componentState) {
  if (!nextOverride || typeof nextOverride !== "object" || !componentType) {
    return;
  }

  const nextComponents = {
    ...(nextOverride.components && typeof nextOverride.components === "object"
      ? nextOverride.components
      : {}),
  };

  const sanitizedState = {};
  Object.entries(componentState || {}).forEach(([key, value]) => {
    if (value === true || value === false) {
      sanitizedState[key] = value;
      return;
    }

    if (typeof value === "string" && value) {
      sanitizedState[key] = value;
    }
  });

  if (Object.keys(sanitizedState).length) {
    nextComponents[componentType] = sanitizedState;
    nextOverride.components = nextComponents;
    return;
  }

  delete nextComponents[componentType];
  if (Object.keys(nextComponents).length) {
    nextOverride.components = nextComponents;
  } else {
    delete nextOverride.components;
  }
}

function getTextboxComponentState(node, override) {
  const componentOverride = getComponentOverride(override, "textbox");
  const datasetState = getTextboxDatasetState(node);
  const styles = override?.styles && typeof override.styles === "object" ? override.styles : {};

  return {
    text: componentOverride.text ?? datasetState.text ?? override?.text ?? getEditableText(node),
    left: componentOverride.left ?? datasetState.left ?? styles.left ?? getExplicitStyleValue(node, "left"),
    top: componentOverride.top ?? datasetState.top ?? styles.top ?? getExplicitStyleValue(node, "top"),
    width: componentOverride.width ?? datasetState.width ?? styles.width ?? getExplicitStyleValue(node, "width"),
    height: componentOverride.height ?? datasetState.height ?? styles.height ?? getExplicitStyleValue(node, "height"),
    themeColor: componentOverride.themeColor ?? datasetState.themeColor ?? "",
    dockHorizontal:
      componentOverride.dockHorizontal ??
      datasetState.dockHorizontal ??
      override?.dockHorizontal ??
      node?.parentElement?.dataset.pageEditorDockHorizontal ??
      "stretch",
    dockVertical:
      componentOverride.dockVertical ??
      datasetState.dockVertical ??
      override?.dockVertical ??
      node?.parentElement?.dataset.pageEditorDockVertical ??
      "stretch",
    scaleToFit:
      componentOverride.scaleToFit === true ||
      datasetState.scaleToFit === true ||
      override?.scaleToFit === true ||
      node?.parentElement?.dataset.pageEditorDockScaleToFit === "true",
  };
}

function getDockComponentState(node, override) {
  const dockHost = getDockHost(node);
  if (!(dockHost instanceof HTMLElement)) {
    return null;
  }
  const component = getDockComponentType(node);
  const textboxState =
    component === "textbox" ? getTextboxComponentState(node, override) : null;
  const hostRules = getDockHostRules(dockHost, {
    ...(override || {}),
    ...(textboxState
      ? {
          dockHorizontal: textboxState.dockHorizontal,
          dockVertical: textboxState.dockVertical,
          scaleToFit: textboxState.scaleToFit,
        }
      : {}),
  });

  return {
    dockHost,
    component,
    horizontal: hostRules?.horizontal || "stretch",
    vertical: hostRules?.vertical || "stretch",
    scaleToFit: hostRules?.scaleToFit === true,
  };
}

function applyTextboxDockComponent(node, dockState) {
  if (!(node instanceof HTMLElement) || !dockState) {
    return;
  }

  node.style.gridColumn = "auto";
  node.style.gridRow = "auto";
  node.style.order = "0";
  node.style.width = "100%";
  node.style.height = "100%";
  node.style.maxWidth = "none";
  node.style.maxHeight = "none";
  node.style.minWidth = "0";
  node.style.minHeight = "0";
  node.style.flex = "1 1 auto";
  node.style.boxSizing = "border-box";
  node.style.justifySelf = "stretch";
  node.style.alignSelf = "stretch";
  node.style.textAlign =
    dockState.horizontal === "right"
      ? "right"
      : dockState.horizontal === "center"
        ? "center"
        : "left";
}

function applyTextboxComponentState(node, override) {
  if (!(node instanceof HTMLElement) || node.dataset.pageEditorDebugDisplayComponent !== "textbox") {
    return;
  }

  const componentState = getTextboxComponentState(node, override);
  setTextboxDatasetState(node, componentState);
  const isDocked = isDockedNode(node);
  setTextControlValue(node, componentState.text || "");

  node.style.textAlign =
    componentState.dockHorizontal === "right"
      ? "right"
      : componentState.dockHorizontal === "center"
        ? "center"
        : "left";

  if (!isDocked) {
    const width = normalizePageEditorDimension(componentState.width || "");
    const height = normalizePageEditorDimension(componentState.height || "");
    const left = normalizePageEditorDimension(componentState.left || "");
    const top = normalizePageEditorDimension(componentState.top || "");

    if (width) {
      node.style.width = width;
      node.style.maxWidth = width;
    }
    if (height) {
      node.style.height = height;
    }
    if (left || top) {
      node.style.position = "absolute";
      if (left) {
        node.style.left = left;
      }
      if (top) {
        node.style.top = top;
      }
    }
  }

  if (componentState.themeColor) {
    const themeColor = componentState.themeColor;
    node.style.borderColor = themeColor;
    node.style.boxShadow = `0 0 0 1px ${themeColor}33, 0 18px 44px rgba(0, 0, 0, 0.28)`;
    node.style.background = `linear-gradient(180deg, color-mix(in srgb, ${themeColor} 10%, rgba(16, 29, 52, 0.94)), rgba(16, 29, 52, 0.94))`;
    node.style.caretColor = themeColor;
  } else {
    node.style.removeProperty("border-color");
    node.style.removeProperty("box-shadow");
    node.style.removeProperty("background");
    node.style.removeProperty("caret-color");
  }

  if (componentState.scaleToFit === true) {
    const targetRect = (isDocked ? node.parentElement : node)?.getBoundingClientRect?.();
    const lines = (componentState.text || "").split("\n");
    const longestLine = Math.max(1, ...lines.map((line) => line.length || 1));
    const lineCount = Math.max(1, lines.length);
    const usableWidth = Math.max(80, (targetRect?.width || node.clientWidth || 240) - 24);
    const usableHeight = Math.max(48, (targetRect?.height || node.clientHeight || 120) - 24);
    const widthBasedSize = usableWidth / Math.max(1, longestLine * 0.62);
    const heightBasedSize = usableHeight / Math.max(1, lineCount * 1.25);
    const nextFontSize = Math.max(12, Math.min(72, Math.floor(Math.min(widthBasedSize, heightBasedSize))));
    node.style.fontSize = `${nextFontSize}px`;
    node.style.lineHeight = "1.15";
  } else {
    node.style.removeProperty("font-size");
    node.style.removeProperty("line-height");
  }
}

function applyPanelDockComponent(node, dockState) {
  if (!(node instanceof HTMLElement) || !dockState) {
    return;
  }

  const justifySelfMap = {
    left: "start",
    center: "center",
    right: "end",
    stretch: "stretch",
  };
  const alignSelfMap = {
    top: "start",
    center: "center",
    bottom: "end",
    stretch: "stretch",
  };

  node.style.gridColumn = "auto";
  node.style.gridRow = "auto";
  node.style.order = "0";
  node.style.width = "100%";
  node.style.height = "100%";
  node.style.maxWidth = "none";
  node.style.maxHeight = "none";
  node.style.minWidth = "0";
  node.style.minHeight = "0";
  node.style.flex = "1 1 auto";
  node.style.boxSizing = "border-box";
  node.style.justifySelf = "stretch";
  node.style.alignSelf = "stretch";

  if (node.matches(".formula-plot")) {
    const svgNode = node.querySelector(".formula-plot__svg");
    node.style.display = "flex";
    node.style.alignItems = "stretch";
    node.style.justifyContent = "stretch";
    node.style.padding = "0";
    if (svgNode instanceof SVGElement) {
      svgNode.style.width = "100%";
      svgNode.style.height = "100%";
      svgNode.style.flex = "1 1 auto";
      svgNode.setAttribute("preserveAspectRatio", "none");
    }
  }
}

function applyDockComponent(node, override) {
  const dockState = getDockComponentState(node, override);
  if (!dockState || !(node instanceof HTMLElement)) {
    if (node instanceof HTMLElement) {
      delete node.dataset.pageEditorDocked;
      delete node.dataset.pageEditorScaleToFit;
      node.style.removeProperty("margin");
      node.style.removeProperty("justify-self");
      node.style.removeProperty("align-self");
      node.style.removeProperty("box-sizing");
      if (node.matches("textarea, input")) {
        node.style.removeProperty("text-align");
      }
    }
    return;
  }

  node.dataset.pageEditorDocked = "true";
  if (dockState.scaleToFit) {
    node.dataset.pageEditorScaleToFit = "true";
  } else {
    delete node.dataset.pageEditorScaleToFit;
  }

  node.style.position = "relative";
  node.style.left = "0px";
  node.style.top = "0px";
  node.style.margin = "0";
  node.dataset.pageEditorDockComponentApplied = dockState.component;

  if (dockState.component === "textbox" || node.matches("textarea, input")) {
    applyTextboxDockComponent(node, dockState);
    return;
  }

  applyPanelDockComponent(node, dockState);
}

function createTableAssetNode(assetId, structure = null) {
  const tableNode = document.createElement("div");
  tableNode.className = "page-editor-table-asset";
  tableNode.dataset.tableAsset = "true";
  tableNode.dataset.tableAssetId = assetId;

  const bodyNode = document.createElement("div");
  bodyNode.className = "page-editor-table-asset__body";
  tableNode.appendChild(bodyNode);

  const normalizedStructure = normalizePersistedTableStructure(structure);
  normalizedStructure.rows.forEach((rowStructure, rowIndex) => {
    const rowNode = createTableRowNode(
      Math.max(1, rowStructure?.cells?.length || 1),
      rowIndex + 1,
      rowStructure
    );
    bodyNode.appendChild(rowNode);
  });

  return tableNode;
}

function createBorderAssetNode(assetId) {
  const borderNode = document.createElement("div");
  borderNode.className = "surface page-editor-border-asset";
  borderNode.dataset.borderAsset = "true";
  borderNode.dataset.borderAssetId = assetId;
  borderNode.style.width = "280px";
  borderNode.style.height = "180px";
  return borderNode;
}

function createTextboxAssetNode(assetId) {
  const textboxNode = document.createElement("div");
  textboxNode.className = "page-editor-textbox-asset";
  textboxNode.dataset.textboxAsset = "true";
  textboxNode.dataset.textboxAssetId = assetId;
  textboxNode.dataset.pageEditorDockComponent = "textbox";
  textboxNode.dataset.pageEditorDebugDisplayComponent = "textbox";
  textboxNode.style.width = "280px";
  textboxNode.style.height = "140px";
  textboxNode.setAttribute("role", "textbox");
  setTextControlValue(textboxNode, "");
  setTextboxDatasetState(textboxNode, {
    text: "",
    left: "",
    top: "",
    width: "280px",
    height: "140px",
    dockHorizontal: "stretch",
    dockVertical: "stretch",
    scaleToFit: false,
  });

  return textboxNode;
}

function getPersistedAssetTypeFromNode(node) {
  if (!(node instanceof HTMLElement)) {
    return "";
  }

  if (node.dataset.tableAsset === "true" || node.matches(".page-editor-table-asset")) {
    return "table";
  }

  if (node.dataset.borderAsset === "true" || node.matches(".page-editor-border-asset")) {
    return "border";
  }

  if (
    node.dataset.textboxAsset === "true" ||
    node.matches(".page-editor-textbox-asset") ||
    node.dataset.pageEditorDebugDisplayComponent === "textbox"
  ) {
    return "textbox";
  }

  return "";
}

function inferPersistedAssetType(override) {
  if (override?.assetType) {
    return override.assetType;
  }

  if (override?.components?.textbox || Object.prototype.hasOwnProperty.call(override || {}, "text")) {
    return "textbox";
  }

  return "";
}

function getPersistedTableAssetId(nodeKey, override) {
  if (typeof override?.tableAssetId === "string" && override.tableAssetId.trim()) {
    return override.tableAssetId.trim();
  }

  return nodeKey;
}

function buildDefaultTableStructure() {
  return {
    rows: [
      {
        weight: 1,
        cells: [
          { weight: 1, subrows: [{ weight: 1, subcells: [{ weight: 1 }] }] },
          { weight: 1, subrows: [{ weight: 1, subcells: [{ weight: 1 }] }] },
        ],
      },
      {
        weight: 1,
        cells: [
          { weight: 1, subrows: [{ weight: 1, subcells: [{ weight: 1 }] }] },
          { weight: 1, subrows: [{ weight: 1, subcells: [{ weight: 1 }] }] },
        ],
      },
    ],
  };
}

function normalizePersistedTableStructure(structure) {
  const fallback = buildDefaultTableStructure();
  const sourceRows = Array.isArray(structure?.rows) && structure.rows.length ? structure.rows : fallback.rows;

  return {
    rows: sourceRows.map((row) => {
      const sourceCells = Array.isArray(row?.cells) && row.cells.length ? row.cells : fallback.rows[0].cells;
      return {
        weight: Math.max(0.4, Number.parseFloat(row?.weight || "1") || 1),
        cells: sourceCells.map((cell) => {
          const sourceSubrows = Array.isArray(cell?.subrows) && cell.subrows.length
            ? cell.subrows
            : fallback.rows[0].cells[0].subrows;
          return {
            weight: Math.max(0.4, Number.parseFloat(cell?.weight || "1") || 1),
            subrows: sourceSubrows.map((subrow) => {
              const sourceSubcells = Array.isArray(subrow?.subcells) && subrow.subcells.length
                ? subrow.subcells
                : fallback.rows[0].cells[0].subrows[0].subcells;
              return {
                weight: Math.max(0.4, Number.parseFloat(subrow?.weight || "1") || 1),
                subcells: sourceSubcells.map((subcell) => ({
                  weight: Math.max(0.4, Number.parseFloat(subcell?.weight || "1") || 1),
                })),
              };
            }),
          };
        }),
      };
    }),
  };
}

function serializeTableAssetStructure(tableNode) {
  return {
    rows: getTableBodyRows(tableNode).map((rowNode) => ({
      weight: Math.max(0.4, Number.parseFloat(rowNode.dataset.tableRowWeight || "1") || 1),
      cells: getTableRowCells(rowNode).map((cellNode) => ({
        weight: Math.max(0.4, Number.parseFloat(cellNode.dataset.tableWeight || "1") || 1),
        subrows: getTableCellSubrows(cellNode).map((subrowNode) => ({
          weight: Math.max(0.4, Number.parseFloat(subrowNode.dataset.tableSubrowWeight || "1") || 1),
          subcells: getTableSubrowCells(subrowNode).map((subcellNode) => ({
            weight: Math.max(0.4, Number.parseFloat(subcellNode.dataset.tableSubcellWeight || "1") || 1),
          })),
        })),
      })),
    })),
  };
}

function getTableRowCells(rowNode) {
  return [...rowNode.children].filter(
    (childNode) => childNode instanceof HTMLElement && childNode.matches(".page-editor-table-asset__cell")
  );
}

function getTableRowDividers(rowNode) {
  return [...rowNode.children].filter(
    (childNode) => childNode instanceof HTMLElement && childNode.matches(".page-editor-table-asset__divider")
  );
}

function getTableBodyRows(tableNode) {
  const bodyNode = tableNode?.querySelector(".page-editor-table-asset__body");
  if (!(bodyNode instanceof HTMLElement)) {
    return [];
  }

  return [...bodyNode.querySelectorAll(":scope > .page-editor-table-asset__row")].filter(
    (rowNode) => rowNode instanceof HTMLElement
  );
}

function getTableCellSubrows(cellNode) {
  return [...cellNode.children].filter(
    (childNode) => childNode instanceof HTMLElement && childNode.matches(".page-editor-table-asset__subrow")
  );
}

function getTableSubrowCells(subrowNode) {
  return [...subrowNode.children].filter(
    (childNode) => childNode instanceof HTMLElement && childNode.matches(".page-editor-table-asset__subcell")
  );
}

function getTableSubrowDividers(subrowNode) {
  return [...subrowNode.children].filter(
    (childNode) => childNode instanceof HTMLElement && childNode.matches(".page-editor-table-asset__subcell-divider")
  );
}

function getTableCellSubdividers(cellNode) {
  return [...cellNode.children].filter(
    (childNode) => childNode instanceof HTMLElement && childNode.matches(".page-editor-table-asset__subdivider")
  );
}

function getTableSubcellDockedChildren(subcellNode) {
  return [...subcellNode.children].filter((childNode) => {
    return (
      childNode instanceof HTMLElement &&
      !childNode.matches(".page-editor-table-asset__subrow-add, .page-editor-table-asset__subrow-remove") &&
      !!getPageEditorPlacementKey(childNode)
    );
  });
}

function subrowHasDockedContent(subrowNode) {
  return getTableSubrowCells(subrowNode).some((subcellNode) => getTableSubcellDockedChildren(subcellNode).length > 0);
}

function cellHasDockedContent(cellNode) {
  return getTableCellSubrows(cellNode).some((subrowNode) => subrowHasDockedContent(subrowNode));
}

function createTableSubcellNode(weight = 1) {
  const subcellNode = document.createElement("div");
  subcellNode.className = "page-editor-table-asset__subcell";
  subcellNode.dataset.tableSubcell = "true";
  subcellNode.dataset.tableSubcellWeight = String(weight);
  return subcellNode;
}

function createTableSubrowNode(weight = 1, structure = null) {
  const subrowNode = document.createElement("div");
  subrowNode.className = "page-editor-table-asset__subrow";
  subrowNode.dataset.tableSubrow = "true";
  subrowNode.dataset.tableSubrowWeight = String(weight);
  const subcellStructures = Array.isArray(structure?.subcells) && structure.subcells.length
    ? structure.subcells
    : [{ weight: 1 }];
  subcellStructures.forEach((subcellStructure) => {
    subrowNode.appendChild(
      createTableSubcellNode(
        Math.max(0.4, Number.parseFloat(subcellStructure?.weight || "1") || 1)
      )
    );
  });
  return subrowNode;
}

function normalizeTableSubrowControls(subrowNode, canRemove) {
  if (!(subrowNode instanceof HTMLElement)) {
    return;
  }

  const subcellNodes = getTableSubrowCells(subrowNode);
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "page-editor-table-asset__subrow-add";
  addButton.dataset.tableSubrowAdd = "true";
  addButton.setAttribute("aria-label", "Split this subrow");
  addButton.textContent = "+";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "page-editor-table-asset__subrow-remove";
  removeButton.dataset.tableSubrowRemove = "true";
  removeButton.setAttribute("aria-label", "Remove this subrow");
  removeButton.textContent = "-";

  const canEditStructure = !subrowHasDockedContent(subrowNode);
  addButton.disabled = !canEditStructure;
  removeButton.disabled = !canEditStructure || !canRemove;
  if (!canRemove) {
    removeButton.hidden = true;
  }

  [...subrowNode.children].forEach((childNode) => childNode.remove());
  subcellNodes.forEach((subcellNode, index) => {
    if (!(subcellNode instanceof HTMLElement)) {
      return;
    }

    if (index > 0) {
      const dividerNode = document.createElement("button");
      dividerNode.type = "button";
      dividerNode.className = "page-editor-table-asset__subcell-divider";
      dividerNode.dataset.tableSubcellDivider = "true";
      subrowNode.appendChild(dividerNode);
    }

    subrowNode.appendChild(subcellNode);
  });
  subrowNode.appendChild(addButton);
  subrowNode.appendChild(removeButton);
}

function syncTableSubrowStructure(subrowNode) {
  if (!(subrowNode instanceof HTMLElement)) {
    return;
  }

  const existingSubcells = getTableSubrowCells(subrowNode);
  const looseAssets = [...subrowNode.children].filter((childNode) => {
    return (
      childNode instanceof HTMLElement &&
      !childNode.matches(".page-editor-table-asset__subcell, .page-editor-table-asset__subcell-divider, .page-editor-table-asset__subrow-add, .page-editor-table-asset__subrow-remove") &&
      !!getPageEditorPlacementKey(childNode)
    );
  });

  const subcells = existingSubcells.length ? existingSubcells : [createTableSubcellNode(1)];
  if (looseAssets.length) {
    looseAssets.forEach((assetNode) => subcells[0].appendChild(assetNode));
  }

  normalizeTableSubrowControls(subrowNode, subrowNode.closest(".page-editor-table-asset__cell") ? getTableCellSubrows(subrowNode.closest(".page-editor-table-asset__cell")).length > 1 : false);
}

function syncTableSubrowLayout(subrowNode) {
  if (!(subrowNode instanceof HTMLElement)) {
    return;
  }

  const subcells = getTableSubrowCells(subrowNode);
  subcells.forEach((subcellNode) => {
    const weight = Number.parseFloat(subcellNode.dataset.tableSubcellWeight || "1") || 1;
    subcellNode.style.flex = `${weight} 1 0`;
  });
  getTableSubrowDividers(subrowNode).forEach((dividerNode) => {
    dividerNode.style.height = "100%";
  });
}

function syncTableCellSubrowStructure(cellNode) {
  if (!(cellNode instanceof HTMLElement)) {
    return;
  }

  const existingSubrows = getTableCellSubrows(cellNode);
  const looseAssets = [...cellNode.children].filter((childNode) => {
    return (
      childNode instanceof HTMLElement &&
        !childNode.matches(".page-editor-table-asset__subrow, .page-editor-table-asset__subdivider") &&
        !!getPageEditorPlacementKey(childNode)
    );
  });

  const subrows = existingSubrows.length ? existingSubrows : [createTableSubrowNode(1)];
  if (looseAssets.length) {
    looseAssets.forEach((assetNode) => subrows[0].appendChild(assetNode));
  }

  [...cellNode.children].forEach((childNode) => childNode.remove());
  subrows.forEach((subrowNode, index) => {
    if (!(subrowNode instanceof HTMLElement)) {
      return;
    }

    if (index > 0) {
      const dividerNode = document.createElement("button");
      dividerNode.type = "button";
      dividerNode.className = "page-editor-table-asset__subdivider";
      dividerNode.dataset.tableSubdivider = "true";
      cellNode.appendChild(dividerNode);
    }

    syncTableSubrowStructure(subrowNode);
    cellNode.appendChild(subrowNode);
  });
}

function syncTableCellSubrowLayout(cellNode) {
  if (!(cellNode instanceof HTMLElement)) {
    return;
  }

  const subrows = getTableCellSubrows(cellNode);
  subrows.forEach((subrowNode) => {
    const weight = Number.parseFloat(subrowNode.dataset.tableSubrowWeight || "1") || 1;
    subrowNode.style.flex = `${weight} 1 0`;
    syncTableSubrowLayout(subrowNode);
  });
}

function syncTableRowStructure(rowNode) {
  if (!(rowNode instanceof HTMLElement)) {
    return;
  }

  const cells = getTableRowCells(rowNode);
  const existingChildren = [...rowNode.children];
  existingChildren.forEach((childNode) => childNode.remove());

  cells.forEach((cellNode, index) => {
    if (index > 0) {
      const dividerNode = document.createElement("button");
      dividerNode.type = "button";
      dividerNode.className = "page-editor-table-asset__divider";
      dividerNode.dataset.tableDivider = "true";
      rowNode.appendChild(dividerNode);
    }

    rowNode.appendChild(cellNode);
  });
}

function syncTableRowLayout(rowNode) {
  const cells = getTableRowCells(rowNode);
  cells.forEach((cellNode) => {
    const weight = Number.parseFloat(cellNode.dataset.tableWeight || "1") || 1;
    cellNode.style.flex = `${weight} 1 0`;
  });
}

function syncTableCellDockTargets(tableNode) {
  if (!(tableNode instanceof HTMLElement)) {
    return;
  }

  const assetId = tableNode.dataset.tableAssetId || tableNode.dataset.pageEditorKey || "table";
  const rowNodes = [...tableNode.querySelectorAll(":scope .page-editor-table-asset__row")].filter(
    (rowNode) => rowNode instanceof HTMLElement
  );

  rowNodes.forEach((rowNode, rowIndex) => {
    const cellNodes = getTableRowCells(rowNode);
    cellNodes.forEach((cellNode, cellIndex) => {
      delete cellNode.dataset.pageEditorDockKey;
      delete cellNode.dataset.pageEditorDockable;

      const subrowNodes = getTableCellSubrows(cellNode);
      subrowNodes.forEach((subrowNode, subrowIndex) => {
        delete subrowNode.dataset.pageEditorDockKey;
        delete subrowNode.dataset.pageEditorDockable;
        const subcellNodes = getTableSubrowCells(subrowNode);
        subcellNodes.forEach((subcellNode, subcellIndex) => {
          subcellNode.dataset.pageEditorDockKey =
            subcellIndex === 0
              ? `dock:${assetId}:r${rowIndex + 1}c${cellIndex + 1}s${subrowIndex + 1}`
              : `dock:${assetId}:r${rowIndex + 1}c${cellIndex + 1}s${subrowIndex + 1}x${subcellIndex + 1}`;
          subcellNode.dataset.pageEditorDockable = "true";
          subcellNode.dataset.pageEditorDockHorizontal = "stretch";
          subcellNode.dataset.pageEditorDockVertical = "stretch";
          subcellNode.dataset.pageEditorDockScaleToFit = "false";
        });
      });
    });
  });
}

function syncDockedNodeLayout(rootNode, mergedPageOverrides) {
  const dockTargetNodes = [
    ...document.querySelectorAll("[data-page-editor-dock-key][data-page-editor-dockable='true']"),
  ].filter((node) => node instanceof HTMLElement);

  dockTargetNodes.forEach((dockNode) => {
    [...dockNode.children].forEach((childNode) => {
      if (!(childNode instanceof HTMLElement) || !childNode.dataset.pageEditorKey) {
        return;
      }

      const override = mergedPageOverrides?.[childNode.dataset.pageEditorKey] || {};
      applyDockComponent(childNode, override);
    });
  });
}

function syncTextboxComponentLayout(rootNode, mergedPageOverrides) {
  const textboxNodes = [
    ...document.querySelectorAll("[data-page-editor-debug-display-component='textbox']"),
  ].filter((node) => node instanceof HTMLElement);

  textboxNodes.forEach((textboxNode) => {
    const override = mergedPageOverrides?.[textboxNode.dataset.pageEditorKey] || {};
    applyTextboxComponentState(textboxNode, override);
  });
}

function syncTableAssetHeightLayout(tableNode) {
  if (!(tableNode instanceof HTMLElement)) {
    return;
  }

  const bodyNode = tableNode.querySelector(".page-editor-table-asset__body");
  if (!(bodyNode instanceof HTMLElement)) {
    return;
  }

  const rowNodes = getTableBodyRows(tableNode);
  if (!rowNodes.length) {
    return;
  }

  const explicitHeight = tableNode.dataset.pageEditorExplicitHeight === "true";
  if (!explicitHeight) {
    bodyNode.style.removeProperty("height");
    rowNodes.forEach((rowNode) => {
      rowNode.style.removeProperty("height");
      rowNode.style.removeProperty("flex");
      getTableRowCells(rowNode).forEach((cellNode) => {
        cellNode.style.removeProperty("height");
      });
      getTableRowDividers(rowNode).forEach((dividerNode) => {
        dividerNode.style.removeProperty("height");
      });
    });
    return;
  }

  const tableHeight = tableNode.getBoundingClientRect().height;
  const bodyStyle = window.getComputedStyle(bodyNode);
  const rowGap = Number.parseFloat(bodyStyle.rowGap || bodyStyle.gap || "0") || 0;
  const totalGap = rowGap * Math.max(0, rowNodes.length - 1);
  const availableHeight = Math.max(0, tableHeight - totalGap);
  const rowWeights = rowNodes.map((rowNode) => Math.max(0.4, Number.parseFloat(rowNode.dataset.tableRowWeight || "1") || 1));
  const totalWeight = rowWeights.reduce((sum, weight) => sum + weight, 0) || rowNodes.length;

  bodyNode.style.height = `${Math.max(0, tableHeight)}px`;
  rowNodes.forEach((rowNode, rowIndex) => {
    const rowHeight = Math.max(0, (availableHeight * rowWeights[rowIndex]) / totalWeight);
    rowNode.style.flex = "0 0 auto";
    rowNode.style.height = `${Math.max(0, rowHeight)}px`;
    getTableRowCells(rowNode).forEach((cellNode) => {
      cellNode.style.height = "100%";
    });
    getTableRowDividers(rowNode).forEach((dividerNode) => {
      dividerNode.style.height = "100%";
    });
  });
}

function syncAllTableAssets(rootNode) {
  const tableNodes = [
    ...document.querySelectorAll(".page-editor-table-asset"),
  ];

  tableNodes.forEach((tableNode) => {
    tableNode.querySelectorAll(".page-editor-table-asset__row").forEach((rowNode) => {
      syncTableRowStructure(rowNode);
      syncTableRowLayout(rowNode);
      getTableRowCells(rowNode).forEach((cellNode) => {
        syncTableCellSubrowStructure(cellNode);
        syncTableCellSubrowLayout(cellNode);
      });
    });
    syncTableCellDockTargets(tableNode);
    syncTableAssetHeightLayout(tableNode);
    syncTableRowAddControls(tableNode);
    syncTableRowResizeControls(tableNode);
  });
}

function pruneTableInternalEditorNodes(editableNodes, selectedNode) {
  for (let index = editableNodes.length - 1; index >= 0; index -= 1) {
    const node = editableNodes[index];
    if (
      !(node instanceof HTMLElement) ||
      !node.matches(".page-editor-table-asset__row, .page-editor-table-asset__cell, .page-editor-table-asset__divider, .page-editor-table-asset__row-add, .page-editor-table-asset__row-resize, .page-editor-table-asset__subrow, .page-editor-table-asset__subcell, .page-editor-table-asset__subcell-divider, .page-editor-table-asset__subdivider, .page-editor-table-asset__subrow-add, .page-editor-table-asset__subrow-remove")
    ) {
      continue;
    }

    node.classList.remove("page-editor-selected", "page-editor-merge-candidate", "page-editor-drop-target");
    delete node.dataset.pageEditorKey;
    delete node.dataset.pageEditorKind;
    delete node.dataset.pageEditorLabel;
    editableNodes.splice(index, 1);
  }

  if (
    selectedNode instanceof HTMLElement &&
    selectedNode.matches(".page-editor-table-asset__row, .page-editor-table-asset__cell, .page-editor-table-asset__divider, .page-editor-table-asset__row-add, .page-editor-table-asset__row-resize, .page-editor-table-asset__subrow, .page-editor-table-asset__subcell, .page-editor-table-asset__subcell-divider, .page-editor-table-asset__subdivider, .page-editor-table-asset__subrow-add, .page-editor-table-asset__subrow-remove")
  ) {
    return selectedNode.closest(".page-editor-table-asset");
  }

  return selectedNode;
}

function syncTableRowAddControls(tableNode) {
  if (!(tableNode instanceof HTMLElement)) {
    return;
  }

  const bodyNode = tableNode.querySelector(".page-editor-table-asset__body");
  if (!(bodyNode instanceof HTMLElement)) {
    return;
  }

  bodyNode.querySelectorAll(".page-editor-table-asset__row-add").forEach((node) => node.remove());

  const rows = getTableBodyRows(tableNode);
  if (!rows.length) {
    return;
  }

  const bodyRect = bodyNode.getBoundingClientRect();
  rows.forEach((rowNode, rowIndex) => {
    const rowRect = rowNode.getBoundingClientRect();
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "page-editor-table-asset__row-add";
    addButton.dataset.tableAddRowAfter = String(rowIndex);
    addButton.setAttribute("aria-label", `Add row below row ${rowIndex + 1}`);
    addButton.textContent = "+";
    addButton.style.top = `${Math.round(rowRect.bottom - bodyRect.top + 6)}px`;
    bodyNode.appendChild(addButton);
  });
}

function syncTableRowResizeControls(tableNode) {
  if (!(tableNode instanceof HTMLElement)) {
    return;
  }

  const bodyNode = tableNode.querySelector(".page-editor-table-asset__body");
  if (!(bodyNode instanceof HTMLElement)) {
    return;
  }

  bodyNode.querySelectorAll(".page-editor-table-asset__row-resize").forEach((node) => node.remove());

  const rows = getTableBodyRows(tableNode);
  if (rows.length <= 1) {
    return;
  }

  const bodyRect = bodyNode.getBoundingClientRect();
  rows.slice(0, -1).forEach((rowNode, rowIndex) => {
    const rowRect = rowNode.getBoundingClientRect();
    const resizeHandle = document.createElement("button");
    resizeHandle.type = "button";
    resizeHandle.className = "page-editor-table-asset__row-resize";
    resizeHandle.dataset.tableRowResizeAfter = String(rowIndex);
    resizeHandle.setAttribute("aria-label", `Resize rows ${rowIndex + 1} and ${rowIndex + 2}`);
    resizeHandle.style.top = `${Math.round(rowRect.bottom - bodyRect.top + 5)}px`;
    bodyNode.appendChild(resizeHandle);
  });
}

function syncAutoExpandedContainers(rootNode) {
  const containerNodes = [
    ...(rootNode instanceof HTMLElement ? [rootNode] : []),
    ...document.querySelectorAll(".page-main, .page-shell, .page-editor-border-asset, section, article, div"),
  ].filter((node, index, nodes) => node instanceof HTMLElement && nodes.indexOf(node) === index);

  containerNodes.forEach((containerNode) => {
    if (containerNode.dataset.pageEditorAutoExpanded === "true") {
      containerNode.style.removeProperty("min-height");
      delete containerNode.dataset.pageEditorAutoExpanded;
    }
    containerNode.style.removeProperty("--page-editor-auto-min-height");
  });

  containerNodes.forEach((containerNode) => {
    const absoluteChildren = [...containerNode.children].filter((childNode) => {
      return childNode instanceof HTMLElement && window.getComputedStyle(childNode).position === "absolute";
    });

    if (!absoluteChildren.length) {
      return;
    }

    const explicitMinHeight = Number.parseFloat(getExplicitStyleValue(containerNode, "minHeight") || "0") || 0;
    const requiredBottom = Math.max(
      0,
      ...absoluteChildren.map((childNode) => {
        const top = Number.parseFloat(childNode.style.top || "0") || 0;
        const height = childNode.getBoundingClientRect().height || 0;
        return top + height;
      })
    );

    if (requiredBottom <= 0) {
      return;
    }

    const nextMinHeight = Math.max(explicitMinHeight, Math.ceil(requiredBottom + 24));
    containerNode.style.setProperty("--page-editor-auto-min-height", `${nextMinHeight}px`);
    containerNode.style.minHeight = `max(${explicitMinHeight || 0}px, var(--page-editor-auto-min-height))`;
    containerNode.dataset.pageEditorAutoExpanded = "true";
  });
}

function syncBorderChildFreePositioning(rootNode, mergedPageOverrides = {}) {
  const borderNodes = [
    ...document.querySelectorAll(".page-editor-border-asset"),
  ].filter((node) => node instanceof HTMLElement);

  borderNodes.forEach((borderNode) => {
    ensurePositionedParent(borderNode);

    [...borderNode.children].forEach((childNode) => {
      if (
        !(childNode instanceof HTMLElement) ||
        !childNode.dataset.pageEditorKey ||
        childNode.matches(".page-editor-table-asset__row, .page-editor-table-asset__cell, .page-editor-table-asset__divider")
      ) {
        return;
      }

      const override = mergedPageOverrides?.[childNode.dataset.pageEditorKey] || {};
      const savedStyles = override?.styles || {};
      const relative = getNodeRectRelativeToParent(childNode, borderNode);
      const childRect = childNode.getBoundingClientRect();
      childNode.style.position = "absolute";
      if (!savedStyles.left) {
        childNode.style.left = `${relative.left}px`;
      }
      if (!savedStyles.top) {
        childNode.style.top = `${relative.top}px`;
      }
      if (!savedStyles.width) {
        childNode.style.width = `${Math.round(childRect.width)}px`;
      }
      if (!savedStyles.height) {
        childNode.style.height = `${Math.round(childRect.height)}px`;
      }
      childNode.style.justifySelf = "";
      childNode.style.alignSelf = "";
      childNode.style.gridColumn = "";
      childNode.style.gridRow = "";
      childNode.style.order = "";
    });
  });
}

function getSelectedTableAssetNode(selectedNode) {
  if (!(selectedNode instanceof HTMLElement)) {
    return null;
  }

  if (selectedNode.matches(".page-editor-table-asset")) {
    return selectedNode;
  }

  return selectedNode.closest(".page-editor-table-asset");
}

function getSelectedTableRowNode(selectedNode) {
  if (!(selectedNode instanceof HTMLElement)) {
    return null;
  }

  if (selectedNode.matches(".page-editor-table-asset__row")) {
    return selectedNode;
  }

  return selectedNode.closest(".page-editor-table-asset__row");
}

function createTableCellNode(weight = 1, structure = null) {
  const cellNode = document.createElement("div");
  cellNode.className = "page-editor-table-asset__cell";
  cellNode.dataset.tableCell = "true";
  cellNode.dataset.tableWeight = String(weight);
  const subrowStructures = Array.isArray(structure?.subrows) && structure.subrows.length
    ? structure.subrows
    : [{ weight: 1, subcells: [{ weight: 1 }] }];
  subrowStructures.forEach((subrowStructure) => {
    cellNode.appendChild(
      createTableSubrowNode(
        Math.max(0.4, Number.parseFloat(subrowStructure?.weight || "1") || 1),
        subrowStructure
      )
    );
  });
  return cellNode;
}

function createTableRowNode(columnCount = 2, rowNumber = 1, structure = null) {
  const rowNode = document.createElement("div");
  rowNode.className = "page-editor-table-asset__row";
  rowNode.dataset.tableRow = String(rowNumber);
  rowNode.dataset.tableRowWeight = String(
    Math.max(0.4, Number.parseFloat(structure?.weight || "1") || 1)
  );

  const cellStructures = Array.isArray(structure?.cells) && structure.cells.length
    ? structure.cells
    : new Array(Math.max(1, columnCount)).fill(null).map(() => ({ weight: 1, subrows: [{ weight: 1, subcells: [{ weight: 1 }] }] }));

  for (let columnIndex = 0; columnIndex < Math.max(1, cellStructures.length || columnCount); columnIndex += 1) {
    if (columnIndex > 0) {
      const dividerNode = document.createElement("button");
      dividerNode.type = "button";
      dividerNode.className = "page-editor-table-asset__divider";
      dividerNode.dataset.tableDivider = "true";
      rowNode.appendChild(dividerNode);
    }

    const cellStructure = cellStructures[columnIndex] || { weight: 1, subrows: [{ weight: 1, subcells: [{ weight: 1 }] }] };
    rowNode.appendChild(
      createTableCellNode(
        Math.max(0.4, Number.parseFloat(cellStructure?.weight || "1") || 1),
        cellStructure
      )
    );
  }

  return rowNode;
}

function addTableRowAtIndex(tableNode, insertIndex = null) {
  const bodyNode = tableNode?.querySelector(".page-editor-table-asset__body");
  if (!(tableNode instanceof HTMLElement) || !(bodyNode instanceof HTMLElement)) {
    return null;
  }

  const existingRows = [...bodyNode.querySelectorAll(":scope > .page-editor-table-asset__row")];
  const safeInsertIndex = Math.max(
    0,
    Math.min(
      Number.isFinite(insertIndex) ? insertIndex : existingRows.length,
      existingRows.length
    )
  );
  const templateRow =
    existingRows[Math.max(0, safeInsertIndex - 1)] ||
    existingRows[safeInsertIndex] ||
    existingRows[existingRows.length - 1] ||
    null;
  const columnCount = templateRow ? getTableRowCells(templateRow).length : 2;
  const newRowNode = createTableRowNode(columnCount, safeInsertIndex + 1);
  const beforeNode = existingRows[safeInsertIndex] || null;
  bodyNode.insertBefore(newRowNode, beforeNode);

  [...bodyNode.querySelectorAll(":scope > .page-editor-table-asset__row")].forEach((rowNode, rowIndex) => {
    rowNode.dataset.tableRow = String(rowIndex + 1);
    syncTableRowStructure(rowNode);
    syncTableRowLayout(rowNode);
  });

  return newRowNode;
}

function clearAutoOffsetStylesForChildren(draftPageOverrides, parentNode) {
  if (!(parentNode instanceof HTMLElement)) {
    return;
  }

  [...parentNode.children].forEach((childNode) => {
    if (!(childNode instanceof HTMLElement) || !childNode.dataset.pageEditorKey) {
      return;
    }

    const childKey = childNode.dataset.pageEditorKey;
    const existingOverride = draftPageOverrides[childKey];
    if (!existingOverride?.styles?.marginLeft) {
      return;
    }

    const nextStyles = {
      ...existingOverride.styles,
    };
    delete nextStyles.marginLeft;

    if (Object.keys(nextStyles).length) {
      draftPageOverrides[childKey] = {
        ...existingOverride,
        styles: nextStyles,
      };
      return;
    }

    const nextOverride = {
      ...existingOverride,
    };
    delete nextOverride.styles;

    if (Object.keys(nextOverride).length) {
      draftPageOverrides[childKey] = nextOverride;
    } else {
      delete draftPageOverrides[childKey];
    }
  });
}

function applyPageEditorStyles(node, styles) {
  const width = normalizePageEditorDimension(styles?.width || "");
  const height = normalizePageEditorDimension(styles?.height || "");
  const minHeight = normalizePageEditorDimension(styles?.minHeight || "");
  const left = normalizePageEditorDimension(styles?.left || "");
  const top = normalizePageEditorDimension(styles?.top || "");
  const marginTop = normalizePageEditorDimension(styles?.marginTop || "");
  const marginBottom = normalizePageEditorDimension(styles?.marginBottom || "");
  const position = styles?.position || "";
  const zIndex = styles?.zIndex || "";
  const layoutContext = getPageEditorLayoutContext(node);
  const isDirectEditableNode = isPreferredDirectEditableNode(node);
  const isPlainTextNode = isTextEditableNode(node) && !node.matches("a, button");
  const justifySelf = styles?.justifySelf || "";
  const alignSelf = styles?.alignSelf || "";
  const styleMap = {
    position,
    left,
    top,
    zIndex,
    width,
    inlineSize: width ? width : "",
    minHeight,
    height,
    marginTop,
    marginBottom,
    marginLeft: styles?.marginLeft || "",
    gridColumn: styles?.gridColumn || "",
    gridRow: styles?.gridRow || "",
    gridTemplateColumns: styles?.gridTemplateColumns || "",
    order: styles?.order || "",
    justifySelf,
    alignSelf,
    maxWidth: width ? width : "",
    display:
      width || height || minHeight
        ? isPlainTextNode
          ? "inline-block"
          : isDirectEditableNode
            ? "block"
            : ""
        : "",
    flex: width && layoutContext.display.includes("flex") ? "0 0 auto" : "",
  };

  Object.entries(styleMap).forEach(([styleName, value]) => {
    if (value) {
      node.style[styleName] = value;
    } else {
      node.style.removeProperty(
        styleName.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
      );
    }
  });

  if (position === "absolute" && node.parentElement instanceof HTMLElement) {
    ensurePositionedParent(node.parentElement);
  }

  if (node.matches(".page-editor-table-asset")) {
    if (height) {
      node.dataset.pageEditorExplicitHeight = "true";
    } else {
      delete node.dataset.pageEditorExplicitHeight;
    }
  }

}

function applyPageEditorOverride(node, override) {
  if (!override || typeof override !== "object") {
    return;
  }

  if (override.deleted) {
    node.style.display = "none";
    return;
  }

  if (override.hiddenByMerge) {
    node.style.display = "none";
    return;
  }

  node.style.removeProperty("display");

  if (typeof override.text === "string") {
      if (node.matches("input, textarea, select")) {
        setTextControlValue(
          node,
          node.dataset.pageEditorDebugDisplayComponent === "textbox"
            ? getTextboxComponentState(node, override).text
            : override.text
        );
    } else if (isTextEditableNode(node)) {
      node.textContent = override.text;
    }
  }

  if (typeof override.href === "string" && node.matches("a")) {
    node.setAttribute("href", override.href);
  }

  if (typeof override.placeholder === "string" && node.matches("input, textarea")) {
    node.setAttribute("placeholder", override.placeholder);
  } else if (node instanceof HTMLElement && node.dataset.textboxAsset === "true") {
    node.removeAttribute("placeholder");
  }

  if (typeof override.value === "string" && node.matches("input, textarea, select")) {
    setTextControlValue(
      node,
      node.dataset.pageEditorDebugDisplayComponent === "textbox"
        ? getTextboxComponentState(node, override).text
        : override.value
    );
  }

  if (override.styles && typeof override.styles === "object") {
    applyPageEditorStyles(node, override.styles);
  }

  applyTextboxComponentState(node, override);
}

function setupPageEditor() {
  const rootNode = getPageEditorRoot();
  if (!rootNode) {
    return;
  }

  upgradeLegacyTextboxAssets(rootNode);

  const pagePath = getPageEditorPath();
  const sourceOverridesByPage = getPageEditorSourceOverrides();
  const sourcePageOverrides = sourceOverridesByPage[pagePath] || {};
  let draftPageOverrides = readPageEditorDraft(pagePath);
  let mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
  const editableNodes = getPageEditorEligibleNodes(rootNode);
  const flowNode = getPageEditorFlowContainer();

  if (rootNode instanceof HTMLElement && !editableNodes.includes(rootNode)) {
    editableNodes.unshift(rootNode);
  }
  if (flowNode instanceof HTMLElement && !editableNodes.includes(flowNode)) {
    editableNodes.unshift(flowNode);
  }
  const detailShellNode = document.querySelector(".page-main > .detail-shell");
  if (detailShellNode instanceof HTMLElement && !editableNodes.includes(detailShellNode)) {
    editableNodes.unshift(detailShellNode);
  }

  editableNodes.forEach((node) => {
    assignEditableNodeMetadata(node, getPageEditorNodeKey(node));
    if (!node.dataset.pageEditorDockComponent && !node.dataset.pageEditorDebugDisplayComponent) {
      node.dataset.pageEditorDockComponent = "panel";
    }
  });

  const originalNodeState = new Map(
    editableNodes.map((node) => [
      node.dataset.pageEditorKey,
      {
        parent: node.parentElement,
        nextSibling: node.nextSibling,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      },
    ])
  );

  window.__GDU_PAGE_EDITOR_ORIGINAL_STATE__ = Object.fromEntries(
    [...originalNodeState.entries()].map(([key, value]) => [
      key,
      {
        width: value.width,
        height: value.height,
      },
    ])
  );

  const ensureLocalTemplateLink = () => {
    const isLocalHomePage =
      window.location.pathname === "/" ||
      window.location.pathname.endsWith("/index.html") ||
      window.location.pathname.endsWith("/game-dev-utility-site/") ||
      window.location.pathname.endsWith("\\index.html");

    if (!isLocalHomePage) {
      return;
    }

    const heroActionsNode = document.querySelector(".hero__content .button-row");
    if (!heroActionsNode || heroActionsNode.querySelector('[data-local-template-link="true"]')) {
      return;
    }

    const templateLinkNode = document.createElement("a");
    templateLinkNode.className = "button button--ghost";
    templateLinkNode.href = "template.html";
    templateLinkNode.dataset.localTemplateLink = "true";
    templateLinkNode.textContent = "Open Template";
    heroActionsNode.appendChild(templateLinkNode);
  };

  const ensureLocalEditorLauncher = () => {
    if (!isPageEditorLocalHost()) {
      return;
    }

    let launcherNode = document.querySelector('[data-page-editor-launcher="true"]');
    if (!(launcherNode instanceof HTMLElement)) {
      launcherNode = document.createElement("button");
      launcherNode.type = "button";
      launcherNode.className = "button button--ghost page-editor-launcher";
      launcherNode.dataset.pageEditorLauncher = "true";
      launcherNode.textContent = "Open editor";
      document.body.appendChild(launcherNode);
    }

    launcherNode.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      ensureControlWindow();
      bindEditorWindow();
      syncEditorModeButton();
      syncEditorVisibility();
      getEditorDocument()?.defaultView?.focus?.();
      setStatus(
        editingEnabled
          ? "Editing is active. Click any panel, button, anchor, or field on the page."
          : "Editor opened. Click Enable editing when you want to edit this page."
      );
    };
  };

  const isLocalTemplatePage = () => {
    return (
      window.location.pathname.endsWith("/template.html") ||
      window.location.pathname.endsWith("\\template.html") ||
      window.location.pathname === "/template.html"
    );
  };

  let selectedNode = null;
  let selectedKey = "";

  const findEditableNodeByKey = (nodeKey) => {
    if (!nodeKey) {
      return null;
    }

    return (
      editableNodes.find((node) => node instanceof HTMLElement && node.dataset.pageEditorKey === nodeKey) ||
      null
    );
  };

  const restoreOriginalStructure = () => {
    editableNodes.forEach((node) => {
      const originalState = originalNodeState.get(node.dataset.pageEditorKey);
      if (!originalState?.parent) {
        return;
      }

      if (originalState.nextSibling && originalState.parent.contains(originalState.nextSibling)) {
        originalState.parent.insertBefore(node, originalState.nextSibling);
      } else {
        originalState.parent.appendChild(node);
      }
    });
  };

  const applyPlacementOverrides = () => {
    editableNodes.forEach((node) => {
      const override = mergedPageOverrides[node.dataset.pageEditorKey];
      const placement = override?.placement;
      if (!placement?.parentKey) {
        return;
      }

      const targetParent =
        editableNodes.find((candidate) => candidate.dataset.pageEditorKey === placement.parentKey) ||
        document.querySelector(`[data-page-editor-dock-key="${CSS.escape(placement.parentKey)}"]`);
      if (
        !targetParent ||
        !(targetParent instanceof HTMLElement) ||
        targetParent === node ||
        node.contains(targetParent)
      ) {
        return;
      }

      const childElements = isDockTargetNode(targetParent)
        ? [...targetParent.children].filter((childNode) => {
            return childNode instanceof HTMLElement && !!getPageEditorPlacementKey(childNode);
          })
        : [...targetParent.children];
      const safeIndex = Math.max(0, Math.min(Number.parseInt(placement.index ?? childElements.length, 10) || 0, childElements.length));
      const referenceNode = childElements[safeIndex] || null;
      targetParent.insertBefore(node, referenceNode);
    });
  };

  const applyOverrides = () => {
    ensurePersistedAssetNodes();
    restoreOriginalStructure();
    syncAllTableAssets(rootNode);
    applyPlacementOverrides();

    editableNodes.forEach((node) => {
      node.classList.remove("page-editor-drop-target");
      node.style.removeProperty("zoom");
    });

  editableNodes.forEach((node) => {
    const override = mergedPageOverrides[node.dataset.pageEditorKey];
    applyPageEditorOverride(node, override);
  });

    applyGridStructureOverrides(editableNodes, mergedPageOverrides);
    syncAllTableAssets(rootNode);
    syncDockedNodeLayout(rootNode, mergedPageOverrides);
    syncTextboxComponentLayout(rootNode, mergedPageOverrides);
    selectedNode = pruneTableInternalEditorNodes(
      editableNodes,
      selectedKey ? findEditableNodeByKey(selectedKey) || selectedNode : selectedNode
    );
    selectedKey = selectedNode?.dataset.pageEditorKey || "";
    syncBorderChildFreePositioning(rootNode, mergedPageOverrides);
    syncAutoExpandedContainers(rootNode);
    ensureLocalTemplateLink();
    ensureLocalEditorLauncher();
  };

  const normalizeInvalidPlacements = (overrideMap) => {
    if (!overrideMap || typeof overrideMap !== "object") {
      return false;
    }

    let changed = false;

    editableNodes.forEach((node) => {
      if (!(node instanceof HTMLElement) || !node.dataset.pageEditorKey) {
        return;
      }

      const nodeKey = node.dataset.pageEditorKey;
      const existingOverride = overrideMap[nodeKey];
      const placement = existingOverride?.placement;
      if (!placement?.parentKey) {
        return;
      }

      const savedParent =
        editableNodes.find((candidate) => candidate.dataset.pageEditorKey === placement.parentKey) ||
        document.querySelector(`[data-page-editor-dock-key="${CSS.escape(placement.parentKey)}"]`);
      const hasIllegalParent =
        !(savedParent instanceof HTMLElement) ||
        savedParent === node ||
        node.contains(savedParent);

      if (!hasIllegalParent) {
        return;
      }

      const liveParent = node.parentElement instanceof HTMLElement ? node.parentElement : null;
      const liveParentKey = getPageEditorPlacementKey(liveParent);
      const canUseLiveParent =
        !!liveParent &&
        !!liveParentKey &&
        liveParent !== node &&
        !node.contains(liveParent);

      const nextOverride = {
        ...existingOverride,
      };

      if (!canUseLiveParent) {
        delete nextOverride.placement;
      } else {
        const siblingElements = isDockTargetNode(liveParent)
          ? [...liveParent.children].filter((childNode) => {
              return childNode instanceof HTMLElement && !!getPageEditorPlacementKey(childNode);
            })
          : [...liveParent.children].filter((childNode) => childNode instanceof HTMLElement);
        nextOverride.placement = {
          parentKey: liveParentKey,
          index: Math.max(0, siblingElements.indexOf(node)),
        };
      }

      overrideMap[nodeKey] = nextOverride;
      changed = true;
    });

    return changed;
  };

  const syncTableAssetOverrides = (overrideMap) => {
    if (!overrideMap || typeof overrideMap !== "object") {
      return false;
    }

    let changed = false;

    editableNodes.forEach((node) => {
      if (!(node instanceof HTMLElement) || node.dataset.tableAsset !== "true" || !node.dataset.pageEditorKey) {
        return;
      }

      const nodeKey = node.dataset.pageEditorKey;
      const existingOverride = overrideMap[nodeKey] || {};
      const nextTableAssetId = node.dataset.tableAssetId || nodeKey;
      const nextTableStructure = serializeTableAssetStructure(node);
      const currentStructure = JSON.stringify(existingOverride.tableStructure || null);
      const nextStructure = JSON.stringify(nextTableStructure);

      if (
        existingOverride.assetType === "table" &&
        existingOverride.tableAssetId === nextTableAssetId &&
        currentStructure === nextStructure
      ) {
        return;
      }

      overrideMap[nodeKey] = {
        ...existingOverride,
        assetType: "table",
        tableAssetId: nextTableAssetId,
        tableStructure: nextTableStructure,
      };
      changed = true;
    });

    return changed;
  };

  if (!isPageEditorLocalHost()) {
    return;
  }

  ensureLocalTemplateLink();

  let controlWindow = null;
  let mouseStateWindow = null;
  let editingEnabled = false;
  let activeResizeMode = "";
  let resizeStartRect = null;
  let activeMovePointerId = null;
  let activeMoveState = null;
  let activeDropTarget = null;
  let lastValidDropTarget = null;
  let lastPointerState = {
    x: 0,
    y: 0,
    isDown: false,
    pointerId: null,
    targetLabel: "",
  };
  let structureMapEnabled = false;
  let pendingMoveKey = "";
  let mergeModeEnabled = false;
  let mergeCandidateKeys = new Set();
  let mergeGridCells = [];
  let spawnAssetType = "";
  let tableAssetCounter = 0;
  let activeDividerDrag = null;
  let activeRowResizeDrag = null;
  let lastSelectedAssetKey = "";

  const syncAssetCounterFromState = () => {
    const keys = [
      ...editableNodes.map((node) => node?.dataset?.pageEditorKey || ""),
      ...Object.keys(mergedPageOverrides || {}),
    ];
    const maxAssetIndex = keys.reduce((maxValue, key) => {
      const match = /^asset:(\d+)$/.exec(String(key));
      if (!match) {
        return maxValue;
      }

      return Math.max(maxValue, Number.parseInt(match[1], 10) || 0);
    }, 0);

    tableAssetCounter = Math.max(tableAssetCounter, maxAssetIndex);
  };

  const ensurePersistedAssetNodes = () => {
    Object.entries(mergedPageOverrides || {}).forEach(([nodeKey, override]) => {
      if (!/^asset:\d+$/.test(nodeKey) || override?.deleted === true || findEditableNodeByKey(nodeKey)) {
        return;
      }

      const assetType = inferPersistedAssetType(override);
      let assetNode = null;

      if (assetType === "table") {
        assetNode = createTableAssetNode(
          getPersistedTableAssetId(nodeKey, override),
          override?.tableStructure || null
        );
      } else if (assetType === "border") {
        assetNode = createBorderAssetNode(nodeKey);
      } else if (assetType === "textbox") {
        assetNode = createTextboxAssetNode(nodeKey);
      }

      if (!(assetNode instanceof HTMLElement)) {
        return;
      }

      assignEditableNodeMetadata(assetNode, nodeKey);
      rootNode.appendChild(assetNode);
      editableNodes.push(assetNode);
      originalNodeState.set(nodeKey, {
        parent: rootNode,
        nextSibling: null,
        width: assetNode.getBoundingClientRect().width,
        height: assetNode.getBoundingClientRect().height,
      });
    });

    syncAssetCounterFromState();
  };

  const resizeOverlay = document.createElement("div");
  resizeOverlay.className = "page-editor-overlay";
  resizeOverlay.hidden = true;
  resizeOverlay.innerHTML = `
    <button type="button" class="page-editor-overlay__label">Drag / resize selected</button>
    <button type="button" class="page-editor-overlay__handle page-editor-overlay__handle--right" data-resize-handle="right" aria-label="Resize width"></button>
    <button type="button" class="page-editor-overlay__handle page-editor-overlay__handle--bottom" data-resize-handle="bottom" aria-label="Resize height"></button>
    <button type="button" class="page-editor-overlay__handle page-editor-overlay__handle--corner" data-resize-handle="corner" aria-label="Resize width and height"></button>
  `;
  document.body.appendChild(resizeOverlay);

  const mergeOverlay = document.createElement("div");
  mergeOverlay.className = "page-editor-merge-overlay";
  mergeOverlay.hidden = true;
  document.body.appendChild(mergeOverlay);

  const insertOverlay = document.createElement("div");
  insertOverlay.className = "page-editor-insert-overlay";
  insertOverlay.hidden = true;
  document.body.appendChild(insertOverlay);

  const vectorOverlay = document.createElement("div");
  vectorOverlay.className = "page-editor-vector-overlay";
  vectorOverlay.hidden = true;
  document.body.appendChild(vectorOverlay);

  const getSelectedOverride = () => mergedPageOverrides[selectedKey] || {};

  const syncResizeOverlay = () => {
    if (!editingEnabled) {
      resizeOverlay.hidden = true;
      mergeOverlay.hidden = true;
      insertOverlay.hidden = true;
      return;
    }

    if (!selectedNode) {
      resizeOverlay.hidden = true;
      mergeOverlay.hidden = true;
      syncInsertOverlay();
      return;
    }

    const rect = selectedNode.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      resizeOverlay.hidden = true;
      return;
    }

    resizeOverlay.hidden = false;
    resizeOverlay.classList.toggle("page-editor-overlay--locked", isDockedNode(selectedNode));
    resizeOverlay.style.left = `${rect.left + window.scrollX}px`;
    resizeOverlay.style.top = `${rect.top + window.scrollY}px`;
    resizeOverlay.style.width = `${rect.width}px`;
    resizeOverlay.style.height = `${rect.height}px`;
    syncInsertOverlay();
  };

  const getMergeOverlayModel = () => {
    if (!editingEnabled || !mergeModeEnabled || !selectedNode) {
      return null;
    }

    const parentNode = selectedNode.parentElement;
    if (
      !(parentNode instanceof HTMLElement) ||
      !getContainerLayoutContext(parentNode).supportsGridPlacement
    ) {
      return null;
    }

    const siblings = [...parentNode.children].filter((child) => {
      return child instanceof HTMLElement && !!child.dataset.pageEditorKey && window.getComputedStyle(child).display !== "none";
    });
    if (!siblings.length) {
      return null;
    }

    const parentRect = parentNode.getBoundingClientRect();
    const boundsByKey = new Map(
      siblings.map((child) => [child.dataset.pageEditorKey, getGridPlacementBounds(child)])
    );
    const selectedBounds = boundsByKey.get(selectedNode.dataset.pageEditorKey) || { columnEnd: 1, rowEnd: 1 };
    const maxColumn = Math.max(
      1,
      selectedBounds.columnEnd + 2,
      ...[...boundsByKey.values()].map((bounds) => bounds.columnEnd)
    );
    const maxRow = Math.max(
      1,
      selectedBounds.rowEnd + 2,
      ...[...boundsByKey.values()].map((bounds) => bounds.rowEnd)
    );
    const columnStarts = new Array(maxColumn + 1).fill(parentRect.left);
    const columnEnds = new Array(maxColumn + 1).fill(parentRect.right);
    const rowStarts = new Array(maxRow + 1).fill(parentRect.top);
    const rowEnds = new Array(maxRow + 1).fill(parentRect.bottom);

    siblings.forEach((child) => {
      const childKey = child.dataset.pageEditorKey;
      const bounds = boundsByKey.get(childKey);
      const rect = child.getBoundingClientRect();
      const columnSpan = Math.max(1, bounds.columnEnd - bounds.columnStart + 1);
      const rowSpan = Math.max(1, bounds.rowEnd - bounds.rowStart + 1);
      const columnWidth = rect.width / columnSpan;
      const rowHeight = rect.height / rowSpan;

      for (let column = bounds.columnStart; column <= bounds.columnEnd; column += 1) {
        const offset = column - bounds.columnStart;
        columnStarts[column] = Math.max(columnStarts[column], rect.left + columnWidth * offset);
        columnEnds[column] = Math.min(columnEnds[column], rect.left + columnWidth * (offset + 1));
      }

      for (let row = bounds.rowStart; row <= bounds.rowEnd; row += 1) {
        const offset = row - bounds.rowStart;
        rowStarts[row] = Math.max(rowStarts[row], rect.top + rowHeight * offset);
        rowEnds[row] = Math.min(rowEnds[row], rect.top + rowHeight * (offset + 1));
      }
    });

    const cells = [];
    for (let row = 1; row <= maxRow; row += 1) {
      for (let column = 1; column <= maxColumn; column += 1) {
        const occupant = siblings.find((child) => {
          const bounds = boundsByKey.get(child.dataset.pageEditorKey);
          return bounds.columnStart <= column && bounds.columnEnd >= column && bounds.rowStart <= row && bounds.rowEnd >= row;
        }) || null;
        const isWithinSelectedMergeArea =
          column >= selectedBounds.columnStart &&
          column <= selectedBounds.columnEnd &&
          row >= selectedBounds.rowStart &&
          row <= selectedBounds.rowEnd;

        cells.push({
          row,
          column,
          left: columnStarts[column],
          top: rowStarts[row],
          width: Math.max(12, columnEnds[column] - columnStarts[column]),
          height: Math.max(12, rowEnds[row] - rowStarts[row]),
          occupantKey: occupant?.dataset.pageEditorKey || "",
          occupantNode: occupant,
          isWithinSelectedMergeArea,
        });
      }
    }

    return {
      parentNode,
      parentRect,
      cells,
    };
  };

  const syncMergeOverlay = () => {
    const model = getMergeOverlayModel();
    mergeGridCells = model?.cells || [];

    if (!model) {
      mergeOverlay.hidden = true;
      mergeOverlay.innerHTML = "";
      return;
    }

    mergeOverlay.hidden = false;
    mergeOverlay.style.left = `${model.parentRect.left + window.scrollX}px`;
    mergeOverlay.style.top = `${model.parentRect.top + window.scrollY}px`;
    mergeOverlay.style.width = `${model.parentRect.width}px`;
    mergeOverlay.style.height = `${model.parentRect.height}px`;

    mergeOverlay.innerHTML = model.cells
      .map((cell) => {
        const emptyCellKey = `cell:${cell.row}:${cell.column}`;
        const candidateToken = cell.occupantKey || emptyCellKey;
        const isSelectedCell =
          !cell.isWithinSelectedMergeArea &&
          mergeCandidateKeys.has(candidateToken);
        const isSelfCell = cell.isWithinSelectedMergeArea;
        const isSelectable =
          !cell.isWithinSelectedMergeArea &&
          (!cell.occupantKey || cell.occupantNode?.parentElement === selectedNode?.parentElement);

        return `
          <button
            type="button"
            class="page-editor-merge-cell${isSelectedCell ? " is-selected" : ""}${isSelfCell ? " is-origin" : ""}"
            data-merge-row="${cell.row}"
            data-merge-column="${cell.column}"
            data-merge-key="${escapePageEditorHtml(candidateToken)}"
            ${isSelectable ? "" : "disabled"}
            style="left:${cell.left - model.parentRect.left}px;top:${cell.top - model.parentRect.top}px;width:${cell.width}px;height:${cell.height}px;"
          >
            <span>${cell.row},${cell.column}</span>
          </button>
        `;
      })
      .join("");
  };

  const getBorderInsertionContainers = () => {
    const flowNode = getPageEditorFlowContainer();
    return [flowNode instanceof HTMLElement ? flowNode : rootNode];
  };

  const getBorderInsertionHost = (parentNode) => {
    if (!(parentNode instanceof HTMLElement)) {
      return null;
    }

    const visibleChildren = [...parentNode.children].filter((childNode) => {
      return childNode instanceof HTMLElement && window.getComputedStyle(childNode).display !== "none";
    });

    const contentShells = visibleChildren.filter((childNode) => {
      return childNode instanceof HTMLElement && childNode.matches(".detail-shell, .formula-shell");
    });

    if (contentShells.length === 1) {
      return contentShells[0];
    }

    return parentNode;
  };

  const syncInsertOverlay = () => {
    if (!insertOverlay || !document.body.contains(insertOverlay) || !editingEnabled || !spawnAssetType) {
      insertOverlay.hidden = true;
      insertOverlay.innerHTML = "";
      document.querySelectorAll(".page-editor-placement-target").forEach((node) => {
        node.classList.remove("page-editor-placement-target");
      });
      return;
    }

    document.querySelectorAll(".page-editor-placement-target").forEach((node) => {
      node.classList.remove("page-editor-placement-target");
    });

    if (spawnAssetType !== "border") {
      const pointerX = Number.isFinite(lastPointerState.x) ? lastPointerState.x : 0;
      const pointerY = Number.isFinite(lastPointerState.y) ? lastPointerState.y : 0;
      if (!pointerX && !pointerY) {
        insertOverlay.hidden = true;
        insertOverlay.innerHTML = "";
        return;
      }

      const hoveredNode = document.elementFromPoint(pointerX, pointerY);
      const targetNode =
        (hoveredNode instanceof HTMLElement
          ? findContainerTargetNode(hoveredNode, rootNode, null) ||
            findBestEditableNode(hoveredNode, rootNode)
          : null) || rootNode;
      const safeTarget =
        targetNode instanceof HTMLElement && isPageEditorContainerNode(targetNode)
          ? targetNode
          : rootNode;
      const targetRect = safeTarget.getBoundingClientRect();
      safeTarget.classList.add("page-editor-placement-target");

      const previewWidth = spawnAssetType === "textbox" ? 280 : 420;
      const previewHeight = spawnAssetType === "textbox" ? 140 : 280;
      const nextLeft = Math.max(
        targetRect.left,
        Math.min(pointerX - previewWidth / 2, targetRect.right - previewWidth)
      );
      const nextTop = Math.max(
        targetRect.top,
        Math.min(pointerY - previewHeight / 2, targetRect.bottom - previewHeight)
      );

      insertOverlay.hidden = false;
      insertOverlay.style.left = "0px";
      insertOverlay.style.top = "0px";
      insertOverlay.style.width = "100vw";
      insertOverlay.style.height = "100vh";
      insertOverlay.innerHTML = `
        <div
          class="page-editor-placement-preview page-editor-placement-preview--${escapePageEditorHtml(spawnAssetType)}"
          style="left:${Math.round(nextLeft)}px;top:${Math.round(nextTop)}px;width:${previewWidth}px;height:${previewHeight}px;"
        >
          <span>Place ${escapePageEditorHtml(spawnAssetType)} here</span>
        </div>
      `;
      return;
    }

    const guides = [];
    getBorderInsertionContainers().forEach((parentNode) => {
      if (!(parentNode instanceof HTMLElement)) {
        return;
      }

      const insertionHost = getBorderInsertionHost(parentNode);
      if (!(insertionHost instanceof HTMLElement)) {
        return;
      }

      const parentKey = getPageEditorPlacementKey(insertionHost);
      if (!parentKey) {
        return;
      }

      const parentRect = parentNode.getBoundingClientRect();
      if (!parentRect.width) {
        return;
      }
      const childElements = [...insertionHost.children].filter((childNode) => {
        return childNode instanceof HTMLElement && window.getComputedStyle(childNode).display !== "none";
      });

      const addGuide = (index, top) => {
        guides.push({
          parentKey,
          index,
          left: Math.round(parentRect.left + 16),
          top: Math.round(top),
          width: Math.max(140, Math.round(parentRect.width - 32)),
        });
      };

      if (!childElements.length) {
        addGuide(0, parentRect.top + 24);
        return;
      }

      addGuide(0, childElements[0].getBoundingClientRect().top - 10);
      childElements.forEach((childNode, childIndex) => {
        addGuide(childIndex + 1, childNode.getBoundingClientRect().bottom + 10);
      });
    });

    if (!guides.length) {
      insertOverlay.hidden = true;
      insertOverlay.innerHTML = "";
      return;
    }

    insertOverlay.hidden = false;
    insertOverlay.style.left = "0px";
    insertOverlay.style.top = "0px";
    insertOverlay.style.width = "100vw";
    insertOverlay.style.height = "100vh";
    insertOverlay.innerHTML = guides
      .map((guide) => {
        return `
          <button
            type="button"
            class="page-editor-insert-line"
            data-insert-parent-key="${escapePageEditorHtml(guide.parentKey)}"
            data-insert-index="${escapePageEditorHtml(String(guide.index))}"
            style="left:${guide.left}px;top:${guide.top}px;width:${guide.width}px;"
            aria-label="Insert border here"
          >
            <span>Insert border here</span>
          </button>
        `;
      })
      .join("");
  };

  const clearSelectionHighlight = () => {
    document.querySelectorAll(".page-editor-selected").forEach((node) => {
      node.classList.remove("page-editor-selected");
    });
    document.querySelectorAll(".page-editor-merge-candidate").forEach((node) => {
      node.classList.remove("page-editor-merge-candidate");
    });
  };

  const syncStructureMapState = () => {
    document.body.classList.toggle("page-editor-show-structure", editingEnabled && structureMapEnabled);
    const editorDocument = getEditorDocument();
    const buttonNode = editorDocument?.querySelector("[data-toggle-structure]");
    if (isDomElement(buttonNode)) {
      buttonNode.textContent = structureMapEnabled ? "Hide structure map" : "Show structure map";
    }
  };

  const syncMoveControls = () => {
    const editorDocument = getEditorDocument();
    const pickButton = editorDocument?.querySelector("[data-pick-move]");
    const moveButton = editorDocument?.querySelector("[data-move-here]");
    const directionButtons = editorDocument?.querySelectorAll("[data-move-direction]");
    const mergeToggleButton = editorDocument?.querySelector("[data-toggle-merge]");
    const mergeApplyButton = editorDocument?.querySelector("[data-apply-merge]");
    const mergeClearButton = editorDocument?.querySelector("[data-clear-merge]");
    const pendingMoveNode = pendingMoveKey
      ? editableNodes.find((node) => node.dataset.pageEditorKey === pendingMoveKey)
      : null;
    const canMoveWithinParent =
      selectedNode?.parentElement instanceof HTMLElement &&
      [...selectedNode.parentElement.children].filter((child) => child instanceof HTMLElement).length > 1;
    const canMerge =
      selectedNode?.parentElement instanceof HTMLElement &&
      getPageEditorLayoutContext(selectedNode).supportsGridPlacement;
    if (pickButton) {
      pickButton.textContent = pendingMoveNode
        ? `Picked: ${describePageEditorNode(pendingMoveNode)}`
        : "Pick selected for move";
      pickButton.disabled = !selectedNode;
    }

    if (moveButton) {
      moveButton.disabled =
        !pendingMoveNode ||
        !selectedNode ||
        pendingMoveNode === selectedNode ||
        !isPageEditorContainerNode(selectedNode) ||
        selectedNode.contains(pendingMoveNode) ||
        pendingMoveNode.contains(selectedNode);
    }

    directionButtons?.forEach((buttonNode) => {
      buttonNode.disabled = !canMoveWithinParent;
    });

    if (mergeToggleButton) {
      mergeToggleButton.textContent = mergeModeEnabled ? "Cancel merge selection" : "Start merge selection";
      mergeToggleButton.disabled = !canMerge;
    }

    if (mergeApplyButton) {
      mergeApplyButton.disabled = !canMerge || mergeCandidateKeys.size === 0;
    }

    if (mergeClearButton) {
      const selectedOverride = getSelectedOverride();
      mergeClearButton.disabled = !selectedOverride?.mergedKeys?.length;
    }

  };

  const highlightSelection = () => {
    clearSelectionHighlight();
    if (selectedNode) {
      selectedNode.classList.add("page-editor-selected");
    }
    mergeCandidateKeys.forEach((candidateKey) => {
      const candidateNode = editableNodes.find((node) => node.dataset.pageEditorKey === candidateKey);
      candidateNode?.classList.add("page-editor-merge-candidate");
    });
    syncResizeOverlay();
    syncMergeOverlay();
  };

  const ensureControlWindow = () => {
    if (controlWindow && !controlWindow.closed) {
      return controlWindow;
    }

    controlWindow = window.open(
      "",
      "gdu-page-editor-controls",
      "popup=yes,width=460,height=860,resizable=yes,scrollbars=yes"
    );

    if (!controlWindow) {
      return null;
    }

    controlWindow.document.open();
    controlWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
    <title>GameDev Utility Page Editor</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #1a0a0d;
      --surface: #2a1217;
      --border: rgba(255, 106, 122, 0.32);
      --text: #fff0f3;
      --muted: #d2aab2;
      --accent: #ff6a7a;
    }
    body {
      margin: 0;
      padding: 18px;
      box-sizing: border-box;
      font: 14px/1.5 "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow-x: hidden;
    }
    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }
    .editor-window {
      display: grid;
      gap: 14px;
      width: 100%;
      min-width: 0;
    }
    .editor-window h1,
    .editor-window p {
      margin: 0;
    }
    .editor-window__eyebrow {
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-weight: 700;
      font-size: 11px;
    }
    .editor-window__panel {
      display: grid;
      gap: 12px;
      padding: 14px;
      min-width: 0;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: var(--surface);
    }
    .editor-window__field {
      display: grid;
      gap: 6px;
    }
    .editor-window__checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .editor-window__checkbox input {
      width: auto;
      min-width: 0;
    }
    .editor-window label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .editor-window input,
    .editor-window textarea,
    .editor-window select {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      border-radius: 12px;
      border: 1px solid rgba(255, 106, 122, 0.22);
      background: rgba(28, 10, 14, 0.94);
      color: var(--text);
      padding: 10px 12px;
      font: inherit;
    }
    .editor-window textarea {
      min-height: 88px;
      resize: vertical;
    }
    .editor-window__grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .editor-window__wide {
      grid-column: 1 / -1;
    }
    .editor-window__actions {
      display: grid;
      gap: 10px;
      min-width: 0;
    }
    .mouse-window__grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .editor-window__tabs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      min-width: 0;
    }
    .editor-window__tab {
      border-radius: 14px;
      padding: 10px 12px;
      border: 1px solid rgba(92, 225, 255, 0.18);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      min-width: 0;
    }
    .editor-window__tab.is-active {
      background: linear-gradient(135deg, rgba(255,106,122,0.2), rgba(255,150,120,0.16));
      border-color: rgba(255, 106, 122, 0.5);
    }
    .editor-window__tab-panel[hidden] {
      display: none;
    }
    .editor-window__direction-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .editor-window__stepper {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 44px 44px;
      gap: 8px;
      align-items: center;
    }
    .editor-window__stepper button {
      border-radius: 14px;
      padding: 0;
      height: 44px;
      font-size: 22px;
      line-height: 1;
    }
    .editor-window button {
      border: 1px solid rgba(255, 106, 122, 0.22);
      border-radius: 999px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      min-width: 0;
      white-space: normal;
      text-wrap: balance;
    }
    .editor-window button.is-armed {
      background: linear-gradient(135deg, rgba(255,106,122,0.24), rgba(255,150,120,0.18));
      border-color: rgba(255, 106, 122, 0.6);
      box-shadow: 0 0 0 1px rgba(255, 106, 122, 0.26), 0 0 18px rgba(255, 106, 122, 0.18);
    }
    .editor-window button[data-submit] {
      background: linear-gradient(135deg, rgba(255,106,122,0.22), rgba(255,150,120,0.18));
      border-color: rgba(255, 106, 122, 0.5);
    }
    .editor-window__status {
      color: var(--muted);
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .editor-window__critical {
      border-color: rgba(255, 106, 122, 0.5);
      background: rgba(52, 16, 21, 0.96);
    }
    .editor-window__critical-text {
      color: #ff9aa5;
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-wrap;
      font-weight: 700;
    }
    @media (max-width: 520px) {
      body {
        padding: 14px;
      }
      .editor-window {
        gap: 12px;
      }
      .editor-window__panel {
        padding: 12px;
        border-radius: 16px;
      }
      .editor-window__tabs {
        grid-template-columns: 1fr;
      }
      .editor-window button,
      .editor-window__tab {
        border-radius: 16px;
        padding: 10px 12px;
      }
    }
  </style>
</head>
<body>
  <div class="editor-window">
    <p class="editor-window__eyebrow">Local editor</p>
    <h1>Page editor</h1>
    <p id="editor-summary">Select something on the page.</p>
    <div class="editor-window__panel">
      <div class="editor-window__actions">
        <button type="button" data-toggle-editing>Enable editing</button>
        <button type="button" data-print-log>Print log</button>
      </div>
    </div>
    <div class="editor-window__panel editor-window__critical" id="editor-critical-panel" hidden>
      <p class="editor-window__eyebrow">Critical failure</p>
      <p class="editor-window__critical-text" id="editor-critical-text"></p>
    </div>
    <div class="editor-window__tabs" data-editing-only>
      <button type="button" class="editor-window__tab is-active" data-editor-tab="editor">Editor</button>
      <button type="button" class="editor-window__tab" data-editor-tab="assets">Import asset</button>
      <button type="button" class="editor-window__tab" data-editor-tab="mouse">Mouse state</button>
    </div>
    <div class="editor-window__tab-panel" data-editor-panel="editor" data-editing-only>
    <div class="editor-window__panel">
      <div class="editor-window__panel" id="editor-debug-panel" hidden>
        <p class="editor-window__eyebrow">Debug display component</p>
        <div id="editor-debug-fields" class="editor-window__actions"></div>
      </div>
      <div class="editor-window__actions">
        <button type="button" data-toggle-structure>Show structure map</button>
        <button type="button" data-save>Save draft</button>
        <button type="button" data-reset>Reset page draft</button>
        <button type="button" data-submit>Submit to source</button>
      </div>
      <p class="editor-window__status" id="editor-status">Editing is active. Select an element to see its debug display component.</p>
    </div>
    </div>
    <div class="editor-window__tab-panel" data-editor-panel="assets" data-editing-only hidden>
      <div class="editor-window__panel">
        <p>Add local layout assets into the page, then place them with your next click.</p>
        <button type="button" data-spawn-asset="table">Spawn table asset</button>
        <button type="button" data-spawn-asset="border">Spawn border asset</button>
        <button type="button" data-spawn-asset="textbox">Spawn textbox asset</button>
        <p class="editor-window__status" id="editor-asset-status">Choose an asset, then click on the page where you want it inserted.</p>
      </div>
    </div>
    <div class="editor-window__tab-panel" data-editor-panel="mouse" data-editing-only hidden>
      <div class="editor-window__panel">
        <p class="editor-window__eyebrow">Mouse state</p>
        <div id="editor-mouse-state" class="mouse-window__grid"></div>
      </div>
    </div>
  </div>
</body>
</html>`);
    controlWindow.document.close();

    controlWindow.addEventListener("mouseup", () => {
      lastPointerState.isDown = false;
      clearInteractionState();
    });
    controlWindow.addEventListener("pointerup", () => {
      lastPointerState.isDown = false;
      clearInteractionState();
    });
    controlWindow.addEventListener("blur", () => {
      lastPointerState.isDown = false;
      clearInteractionState();
    });

    return controlWindow;
  };

  const getEditorDocument = () => {
    const popup = ensureControlWindow();
    return popup ? popup.document : null;
  };

  const ensureMouseStateWindow = () => {
    if (mouseStateWindow && !mouseStateWindow.closed) {
      return mouseStateWindow;
    }

    mouseStateWindow = window.open(
      "",
      "gdu-page-editor-mouse-state",
      "popup=yes,width=420,height=700,resizable=yes,scrollbars=yes"
    );

    if (!mouseStateWindow) {
      return null;
    }

    mouseStateWindow.document.open();
    mouseStateWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GameDev Utility Mouse State</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #071222;
      --surface: #111c31;
      --border: rgba(92, 225, 255, 0.24);
      --text: #eef6ff;
      --muted: #aeb9ca;
    }
    body {
      margin: 0;
      padding: 18px;
      font: 14px/1.5 "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .mouse-window {
      display: grid;
      gap: 14px;
    }
    .mouse-window__panel {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: var(--surface);
    }
    .mouse-window__grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .mouse-window__field {
      display: grid;
      gap: 6px;
    }
    .mouse-window label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .mouse-window input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      border-radius: 12px;
      border: 1px solid rgba(150, 176, 218, 0.18);
      background: rgba(7, 18, 34, 0.94);
      color: var(--text);
      padding: 10px 12px;
      font: inherit;
    }
  </style>
</head>
<body>
  <div class="mouse-window">
    <div class="mouse-window__panel">
      <div id="editor-mouse-state" class="mouse-window__grid"></div>
    </div>
  </div>
</body>
</html>`);
    mouseStateWindow.document.close();

    mouseStateWindow.addEventListener("mouseup", () => {
      lastPointerState.isDown = false;
      clearInteractionState();
    });
    mouseStateWindow.addEventListener("pointerup", () => {
      lastPointerState.isDown = false;
      clearInteractionState();
    });
    mouseStateWindow.addEventListener("blur", () => {
      lastPointerState.isDown = false;
      clearInteractionState();
    });

    return mouseStateWindow;
  };

  const setStatus = (message) => {
    const editorDocument = getEditorDocument();
    const statusNode = editorDocument?.getElementById("editor-status");
    if (statusNode) {
      statusNode.textContent = message;
    }
  };

  const syncCriticalFailurePanel = () => {
    const editorDocument = getEditorDocument();
    const panelNode = editorDocument?.getElementById("editor-critical-panel");
    const textNode = editorDocument?.getElementById("editor-critical-text");
    if (!(panelNode instanceof HTMLElement) || !(textNode instanceof HTMLElement)) {
      return;
    }

    const failures = getPageEditorCriticalFailures();
    if (!failures.length) {
      panelNode.hidden = true;
      textNode.textContent = "";
      return;
    }

    panelNode.hidden = false;
    textNode.textContent = failures.join("\n");
  };

  const emitEditorLog = async (eventName, payload = {}) => {
    try {
      if (!(window.__GDU_EDITOR_APP__ === true && typeof window.__GDU_EDITOR_API_BASE__ === "string")) {
        return;
      }

      const body = {
        event: eventName,
        page: pagePath,
        selectedKey: selectedKey || "(none)",
        selectedLabel: selectedNode ? describePageEditorNode(selectedNode) : "(none)",
        selectedDocked: selectedNode ? isDockedNode(selectedNode) : false,
        selectedDockHost: selectedNode && getDockHost(selectedNode) ? getPageEditorPlacementKey(getDockHost(selectedNode)) : "(none)",
        dropTarget: activeDropTarget ? getPageEditorPlacementKey(activeDropTarget) || describePageEditorNode(activeDropTarget) : "(none)",
        dropIsDockTarget: activeDropTarget ? isDockTargetNode(activeDropTarget) : false,
        mouseX: Math.round(lastPointerState.x || 0),
        mouseY: Math.round(lastPointerState.y || 0),
        isDown: !!lastPointerState.isDown,
        moveMode: activeMoveState?.mode || "(none)",
        resizeMode: activeResizeMode || "(none)",
        ...payload,
      };

      await fetch(`${window.__GDU_EDITOR_API_BASE__}/__editor-api/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      // Logging should never break editing.
    }
  };

  const reportEditorCriticalFailure = (message, error = null) => {
    const text = String(message || "").trim();
    if (!text) {
      return;
    }

    recordPageEditorCriticalFailure(text);
    syncCriticalFailurePanel();
    emitEditorLog("critical-failure", {
      message: text,
      errorName: error instanceof Error ? error.name : "",
    });
  };

  const setAssetStatus = (message) => {
    const editorDocument = getEditorDocument();
    const statusNode = editorDocument?.getElementById("editor-asset-status");
    if (statusNode) {
      statusNode.textContent = message;
    }
  };

  const clearAssetPlacementStatus = () => {
    setAssetStatus("No asset is armed. Choose an asset, then click once on the page to place it.");
  };

  const syncSpawnAssetButtons = () => {
    const editorDocument = getEditorDocument();
    if (!editorDocument) {
      return;
    }

    editorDocument.querySelectorAll("[data-spawn-asset]").forEach((buttonNode) => {
      if (isDomElement(buttonNode)) {
        const assetType = buttonNode.getAttribute("data-spawn-asset") || "";
        const isArmed = editingEnabled && spawnAssetType === assetType;
        buttonNode.classList.toggle("is-armed", isArmed);
        buttonNode.setAttribute("aria-pressed", isArmed ? "true" : "false");
      }
    });
  };

  const syncEditorModeButton = () => {
    const editorDocument = getEditorDocument();
    editorDocument?.querySelectorAll("[data-toggle-editing]").forEach((toggleNode) => {
      if (isDomElement(toggleNode)) {
        toggleNode.textContent = editingEnabled ? "Disable editing" : "Enable editing";
        toggleNode.disabled = false;
        toggleNode.hidden = false;
        toggleNode.setAttribute("aria-pressed", editingEnabled ? "true" : "false");
      }
    });
  };

  const setEditingEnabled = (enabled, options = {}) => {
    const { focusWindow = false } = options;
    editingEnabled = enabled;
    document.body.classList.toggle("page-editor-active", editingEnabled);

    if (editingEnabled) {
      bindEditorWindow();
      if (focusWindow) {
        ensureControlWindow()?.focus();
      }
      syncStructureMapState();
      setStatus("Editing is active. Click any panel, button, anchor, or field on the page.");
      if (!selectedNode && editableNodes[0]) {
        refreshSelection(editableNodes[0]);
      } else {
        syncEditorForm();
        highlightSelection();
      }
    } else {
      syncStructureMapState();
      clearSelectionHighlight();
      syncResizeOverlay();
      clearInteractionState();
      setStatus("Editing is off. The page is back to normal local behavior.");
    }
    syncEditorModeButton();
    syncEditorVisibility();
    syncInsertOverlay();
    syncSpawnAssetButtons();
    syncCriticalFailurePanel();
  };

  const syncEditorVisibility = () => {
    const editorDocument = getEditorDocument();
    if (!editorDocument) {
      return;
    }

    editorDocument.querySelectorAll("[data-editing-only]").forEach((node) => {
      if (isDomElement(node)) {
        node.hidden = !editingEnabled;
      }
    });

    syncEditorModeButton();
    syncSpawnAssetButtons();

    if (!editingEnabled) {
      setEditorTab("editor");
    }
  };

  const setEditorTab = (tabName) => {
    const editorDocument = getEditorDocument();
    if (!editorDocument) {
      return;
    }

    const effectiveTabName = editingEnabled ? tabName : "editor";

    editorDocument.querySelectorAll("[data-editor-tab]").forEach((buttonNode) => {
      buttonNode.classList.toggle("is-active", buttonNode.getAttribute("data-editor-tab") === effectiveTabName);
    });

    editorDocument.querySelectorAll("[data-editor-panel]").forEach((panelNode) => {
      panelNode.hidden = !editingEnabled || panelNode.getAttribute("data-editor-panel") !== effectiveTabName;
    });

    syncEditorModeButton();
  };

  const renderDebugDisplayPanel = (editorDocument, node) => {
    const panelNode = editorDocument.getElementById("editor-debug-panel");
    const fieldsNode = editorDocument.getElementById("editor-debug-fields");
    if (!panelNode || !fieldsNode) {
      return;
    }

    const fields = getDebugDisplayComponentFields(node);
    if (!node || !fields.length) {
      panelNode.hidden = true;
      fieldsNode.innerHTML = "";
      return;
    }

    fieldsNode.innerHTML = fields.map((field) => {
      const inputId = `editor-debug-${field.key}`;
      if (field.type === "textarea") {
        return `
          <div class="editor-window__field">
            <label for="${escapePageEditorHtml(inputId)}">${escapePageEditorHtml(field.label)}</label>
            <textarea id="${escapePageEditorHtml(inputId)}" data-debug-field="${escapePageEditorHtml(field.key)}"></textarea>
          </div>
        `;
      }

      if (field.type === "color") {
        return `
          <div class="editor-window__field">
            <label for="${escapePageEditorHtml(inputId)}">${escapePageEditorHtml(field.label)}</label>
            <input id="${escapePageEditorHtml(inputId)}" type="color" data-debug-field="${escapePageEditorHtml(field.key)}" />
          </div>
        `;
      }

      if (field.type === "select") {
        const options = (field.options || []).map((option) => {
          return `<option value="${escapePageEditorHtml(option.value)}">${escapePageEditorHtml(option.label)}</option>`;
        }).join("");
        return `
          <div class="editor-window__field">
            <label for="${escapePageEditorHtml(inputId)}">${escapePageEditorHtml(field.label)}</label>
            <select id="${escapePageEditorHtml(inputId)}" data-debug-field="${escapePageEditorHtml(field.key)}">${options}</select>
          </div>
        `;
      }

      if (field.type === "checkbox") {
        return `
          <div class="editor-window__field">
            <label class="editor-window__checkbox" for="${escapePageEditorHtml(inputId)}">
              <input id="${escapePageEditorHtml(inputId)}" type="checkbox" data-debug-field="${escapePageEditorHtml(field.key)}" />
              <span>${escapePageEditorHtml(field.label)}</span>
            </label>
          </div>
        `;
      }

      return `
        <div class="editor-window__field">
          <label for="${escapePageEditorHtml(inputId)}">${escapePageEditorHtml(field.label)}</label>
          <input id="${escapePageEditorHtml(inputId)}" type="text" data-debug-field="${escapePageEditorHtml(field.key)}" />
        </div>
      `;
    }).join("");

    panelNode.hidden = false;
  };

  const syncMouseStatePanel = () => {
    if (
      !lastPointerState.isDown &&
      (activeResizeMode || activeMovePointerId !== null || activeMoveState)
    ) {
      activeResizeMode = "";
      resizeStartRect = null;
      activeMovePointerId = null;
      activeMoveState = null;
      if (activeDropTarget) {
        activeDropTarget.classList.remove("page-editor-drop-target");
        activeDropTarget = null;
      }
      document.body.classList.remove("page-editor-resizing");
      document.body.classList.remove("page-editor-moving");
    }

    const stateNode = getEditorDocument()?.getElementById("editor-mouse-state");
    const rows = [
      ["Editing enabled", editingEnabled ? "true" : "false"],
      ["Selected key", selectedKey || "(none)"],
      ["Selected label", selectedNode ? describePageEditorNode(selectedNode) : "(none)"],
      ["Is selected", selectedNode ? "true" : "false"],
      ["Is docked", selectedNode && isDockedNode(selectedNode) ? "true" : "false"],
      ["Dock host", selectedNode && getDockHost(selectedNode) ? describePageEditorNode(getDockHost(selectedNode)) : "(none)"],
      ["Dock host key", selectedNode && getDockHost(selectedNode) ? getPageEditorPlacementKey(getDockHost(selectedNode)) : "(none)"],
      ["Spawn armed", spawnAssetType || "(none)"],
      ["Is resizing", activeResizeMode ? "true" : "false"],
      ["Resize mode", activeResizeMode || "(none)"],
      ["Is moving", activeMovePointerId !== null ? "true" : "false"],
      ["Move mode", activeMoveState?.mode || "(none)"],
      ["Drop target", activeDropTarget ? describePageEditorNode(activeDropTarget) : "(none)"],
      ["Drop target key", activeDropTarget ? getPageEditorPlacementKey(activeDropTarget) : "(none)"],
      ["Drop is dock target", activeDropTarget && isDockTargetNode(activeDropTarget) ? "true" : "false"],
      ["Structure map", structureMapEnabled ? "true" : "false"],
      ["Merge mode", mergeModeEnabled ? "true" : "false"],
      ["Merge count", String(mergeCandidateKeys.size)],
      ["Mouse down", lastPointerState.isDown ? "true" : "false"],
      ["Pointer id", lastPointerState.pointerId ?? "(none)"],
      ["Mouse x", String(Math.round(lastPointerState.x || 0))],
      ["Mouse y", String(Math.round(lastPointerState.y || 0))],
      ["Pointer target", lastPointerState.targetLabel || "(none)"],
    ];

    if (stateNode) {
      stateNode.innerHTML = rows.map(([label, value]) => {
        return `
          <div class="editor-window__field">
            <label>${escapePageEditorHtml(label)}</label>
            <input type="text" value="${escapePageEditorHtml(value)}" readonly />
          </div>
        `;
      }).join("");
    }

    if (!editingEnabled) {
      vectorOverlay.hidden = true;
      vectorOverlay.innerHTML = "";
      return;
    }

    const selectedRect = selectedNode instanceof HTMLElement
      ? selectedNode.getBoundingClientRect()
      : null;
    const selectedX = selectedRect ? Math.round(selectedRect.left) : 0;
    const selectedY = selectedRect ? Math.round(selectedRect.top) : 0;
    const dockHost = selectedNode instanceof HTMLElement ? getDockHost(selectedNode) : null;

    vectorOverlay.hidden = false;
    vectorOverlay.innerHTML = `
      <div class="page-editor-vector-card">
        <span class="page-editor-vector-card__label">Mouse</span>
        <span class="page-editor-vector-card__value">${Math.round(lastPointerState.x || 0)}, ${Math.round(lastPointerState.y || 0)}</span>
      </div>
      <div class="page-editor-vector-card">
        <span class="page-editor-vector-card__label">Selected</span>
        <span class="page-editor-vector-card__value">${selectedX}, ${selectedY}</span>
      </div>
      <div class="page-editor-vector-card">
        <span class="page-editor-vector-card__label">Drop</span>
        <span class="page-editor-vector-card__value">${activeDropTarget ? getPageEditorPlacementKey(activeDropTarget) || describePageEditorNode(activeDropTarget) : "(none)"}</span>
      </div>
      <div class="page-editor-vector-card">
        <span class="page-editor-vector-card__label">Docked</span>
        <span class="page-editor-vector-card__value">${selectedNode && isDockedNode(selectedNode) ? (getPageEditorPlacementKey(dockHost) || describePageEditorNode(dockHost)) : "(no)"}</span>
      </div>
    `;
  };

  const registerEditableSubtree = (rootNodeToRegister) => {
    const nodesToRegister = [
      rootNodeToRegister,
      ...getPageEditorEligibleNodes(rootNodeToRegister),
    ].filter((node, index, nodes) => node instanceof HTMLElement && nodes.indexOf(node) === index);

    nodesToRegister.forEach((node) => {
      if (!node.dataset.pageEditorKey) {
        tableAssetCounter += 1;
        assignEditableNodeMetadata(node, `asset:${tableAssetCounter}`);
        editableNodes.push(node);
        originalNodeState.set(node.dataset.pageEditorKey, {
          parent: node.parentElement,
          nextSibling: node.nextSibling,
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        });
      }
    });
  };

  const unregisterEditableSubtree = (rootNodeToRemove) => {
    const nodesToRemove = [
      rootNodeToRemove,
      ...getPageEditorEligibleNodes(rootNodeToRemove),
    ].filter((node, index, nodes) => node instanceof HTMLElement && nodes.indexOf(node) === index);

    nodesToRemove.forEach((node) => {
      const nodeKey = node.dataset.pageEditorKey;
      if (nodeKey) {
        originalNodeState.delete(nodeKey);
        delete draftPageOverrides[nodeKey];
      }

      const editableIndex = editableNodes.indexOf(node);
      if (editableIndex >= 0) {
        editableNodes.splice(editableIndex, 1);
      }
    });
  };

  const deleteSelectedAsset = () => {
    let targetNode = selectedNode;
    let targetKey = selectedKey;

    if ((!targetNode || !targetKey) && lastSelectedAssetKey) {
      const fallbackNode = findEditableNodeByKey(lastSelectedAssetKey);
      if (fallbackNode instanceof HTMLElement) {
        targetNode = fallbackNode;
        targetKey = lastSelectedAssetKey;
      }
    }

    if (!targetNode || !targetKey) {
      return;
    }

    const nextSelection =
      targetNode.parentElement instanceof HTMLElement && targetNode.parentElement !== rootNode
        ? targetNode.parentElement
        : null;

    if (targetKey.startsWith("asset:")) {
      unregisterEditableSubtree(targetNode);
      targetNode.remove();
      if (lastSelectedAssetKey === targetKey) {
        lastSelectedAssetKey = "";
      }
    } else {
      draftPageOverrides[targetKey] = {
        ...(draftPageOverrides[targetKey] || {}),
        deleted: true,
      };
    }

    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    writePageEditorDraft(pagePath, draftPageOverrides);
    applyOverrides();
    refreshSelection(nextSelection);
    setStatus("Deleted the selected asset.");
  };

  const placeSpawnedAssetFreely = (assetNode, parentNode, x, y) => {
    if (!(assetNode instanceof HTMLElement) || !(parentNode instanceof HTMLElement)) {
      return;
    }

    ensurePositionedParent(parentNode);
    const parentRect = parentNode.getBoundingClientRect();
    const assetRect = assetNode.getBoundingClientRect();
    const nextLeft = Math.max(
      0,
      Math.round(x - parentRect.left + parentNode.scrollLeft - assetRect.width / 2)
    );
    const nextTop = Math.max(
      0,
      Math.round(y - parentRect.top + parentNode.scrollTop - assetRect.height / 2)
    );

    assetNode.style.position = "absolute";
    assetNode.style.left = `${nextLeft}px`;
    assetNode.style.top = `${nextTop}px`;
    assetNode.style.justifySelf = "";
    assetNode.style.alignSelf = "";
    assetNode.style.gridColumn = "";
    assetNode.style.gridRow = "";
    assetNode.style.order = "";

    if (assetNode.dataset.pageEditorKey) {
      draftPageOverrides[assetNode.dataset.pageEditorKey] = {
        ...(draftPageOverrides[assetNode.dataset.pageEditorKey] || {}),
        styles: {
          ...(draftPageOverrides[assetNode.dataset.pageEditorKey]?.styles || {}),
          position: "absolute",
          left: `${nextLeft}px`,
          top: `${nextTop}px`,
          justifySelf: "",
          alignSelf: "",
          gridColumn: "",
          gridRow: "",
          order: "",
        },
      };
    }
  };

  const spawnTableAssetAtPoint = (targetNode, x, y) => {
    const containerNode =
      findContainerTargetNode(targetNode, rootNode, null) ||
      findBestEditableNode(targetNode, rootNode) ||
      rootNode;
    const safeContainer =
      containerNode instanceof HTMLElement && isPageEditorContainerNode(containerNode)
        ? containerNode
        : rootNode;
    const assetId = `table-${Date.now()}-${tableAssetCounter + 1}`;
    const tableNode = createTableAssetNode(assetId);
    const beforeNode =
      targetNode instanceof HTMLElement &&
      safeContainer.contains(targetNode) &&
      targetNode !== safeContainer
        ? targetNode.closest("[data-page-editor-key]")
        : null;

    safeContainer.insertBefore(tableNode, beforeNode instanceof HTMLElement ? beforeNode : null);
    registerEditableSubtree(tableNode);
    if (tableNode.dataset.pageEditorKey) {
      draftPageOverrides[tableNode.dataset.pageEditorKey] = {
        ...(draftPageOverrides[tableNode.dataset.pageEditorKey] || {}),
        assetType: "table",
        tableAssetId: assetId,
        tableStructure: serializeTableAssetStructure(tableNode),
      };
    }
    placeSpawnedAssetFreely(tableNode, safeContainer, x, y);
    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
    refreshSelection(tableNode);
    spawnAssetType = "";
    syncSpawnAssetButtons();
    setEditorTab("editor");
    clearAssetPlacementStatus();
    setStatus(`Placed a table asset inside ${describePageEditorNode(safeContainer)}.`);
  };

  const spawnBorderAssetAtPoint = (targetNode, x, y) => {
    const safeContainer = rootNode;
    const assetId = `border-${Date.now()}-${tableAssetCounter + 1}`;
    const borderNode = createBorderAssetNode(assetId);
    const beforeNode =
      targetNode instanceof HTMLElement &&
      safeContainer.contains(targetNode) &&
      targetNode !== safeContainer
        ? targetNode.closest("[data-page-editor-key]")
        : null;

    safeContainer.insertBefore(borderNode, beforeNode instanceof HTMLElement ? beforeNode : null);
    registerEditableSubtree(borderNode);
    if (borderNode.dataset.pageEditorKey) {
      draftPageOverrides[borderNode.dataset.pageEditorKey] = {
        ...(draftPageOverrides[borderNode.dataset.pageEditorKey] || {}),
        assetType: "border",
      };
    }
    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
    refreshSelection(borderNode);
    spawnAssetType = "";
    syncSpawnAssetButtons();
    setEditorTab("editor");
    clearAssetPlacementStatus();
    setStatus(`Placed a border asset inside ${describePageEditorNode(safeContainer)}.`);
  };

  const spawnBorderAssetAtPlacement = (parentKey, index) => {
    const safeContainer =
      editableNodes.find((node) => node.dataset.pageEditorKey === parentKey) ||
      document.querySelector(`[data-page-editor-dock-key="${CSS.escape(parentKey)}"]`) ||
      rootNode;
    if (!(safeContainer instanceof HTMLElement)) {
      return;
    }

    const assetId = `border-${Date.now()}-${tableAssetCounter + 1}`;
    const borderNode = createBorderAssetNode(assetId);
    const childElements = [...safeContainer.children].filter((childNode) => childNode instanceof HTMLElement);
    const safeIndex = Math.max(0, Math.min(Number.parseInt(index, 10) || 0, childElements.length));
    const beforeNode = childElements[safeIndex] || null;

    safeContainer.insertBefore(borderNode, beforeNode instanceof HTMLElement ? beforeNode : null);
    registerEditableSubtree(borderNode);
    if (borderNode.dataset.pageEditorKey) {
      draftPageOverrides[borderNode.dataset.pageEditorKey] = {
        ...(draftPageOverrides[borderNode.dataset.pageEditorKey] || {}),
        assetType: "border",
        placement: {
          parentKey,
          index: safeIndex,
        },
      };
    }
    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
    refreshSelection(borderNode);
    spawnAssetType = "";
    syncSpawnAssetButtons();
    setEditorTab("editor");
    clearAssetPlacementStatus();
    syncInsertOverlay();
    setStatus(`Placed a border asset into ${describePageEditorNode(safeContainer)}.`);
  };

  const spawnTextboxAssetAtPoint = (targetNode, x, y) => {
    const containerNode =
      findContainerTargetNode(targetNode, rootNode, null) ||
      findBestEditableNode(targetNode, rootNode) ||
      rootNode;
    const safeContainer =
      containerNode instanceof HTMLElement && isPageEditorContainerNode(containerNode)
        ? containerNode
        : rootNode;
    const assetId = `textbox-${Date.now()}-${tableAssetCounter + 1}`;
    const textboxNode = createTextboxAssetNode(assetId);
    const beforeNode =
      targetNode instanceof HTMLElement &&
      safeContainer.contains(targetNode) &&
      targetNode !== safeContainer
        ? targetNode.closest("[data-page-editor-key]")
        : null;

    safeContainer.insertBefore(textboxNode, beforeNode instanceof HTMLElement ? beforeNode : null);
    registerEditableSubtree(textboxNode);
    if (textboxNode.dataset.pageEditorKey) {
      draftPageOverrides[textboxNode.dataset.pageEditorKey] = {
        ...(draftPageOverrides[textboxNode.dataset.pageEditorKey] || {}),
        assetType: "textbox",
      };
    }
    placeSpawnedAssetFreely(textboxNode, safeContainer, x, y);
    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
    refreshSelection(textboxNode);
    spawnAssetType = "";
    syncSpawnAssetButtons();
    setEditorTab("editor");
    clearAssetPlacementStatus();
    setStatus(`Placed a textbox asset inside ${describePageEditorNode(safeContainer)}.`);
  };

  const syncEditorForm = () => {
    const editorDocument = getEditorDocument();
    if (!editorDocument) {
      return;
    }

    const summary = editorDocument.getElementById("editor-summary");

    if (!summary) {
      return;
    }

    const selectedOverride = getSelectedOverride();
    const node = selectedNode;
    renderDebugDisplayPanel(editorDocument, node);
    summary.textContent = node
      ? `Selected ${describePageEditorNode(node)}`
      : "Select something on the page.";

    getDebugDisplayComponentFields(node).forEach((field) => {
      const input = editorDocument.getElementById(`editor-debug-${field.key}`);
      if (!input) {
        return;
      }

      const textboxState =
        getDebugDisplayComponentType(node) === "textbox"
          ? getTextboxComponentState(node, selectedOverride)
          : null;
      const resolvedValue =
        field.key === "text"
          ? textboxState?.text ?? selectedOverride.text ?? getEditableText(node)
          : field.key === "left"
            ? textboxState?.left ?? ""
            : field.key === "top"
              ? textboxState?.top ?? ""
              : field.key === "width"
                ? textboxState?.width ?? ""
                : field.key === "height"
                  ? textboxState?.height ?? ""
                  : field.key === "themeColor"
                    ? textboxState?.themeColor || "#5ce1ff"
          : field.key === "dockHorizontal"
              ? textboxState?.dockHorizontal || selectedOverride.dockHorizontal || node?.parentElement?.dataset.pageEditorDockHorizontal || "stretch"
              : field.key === "dockVertical"
                ? textboxState?.dockVertical || selectedOverride.dockVertical || node?.parentElement?.dataset.pageEditorDockVertical || "stretch"
                : field.key === "scaleToFit"
                  ? textboxState?.scaleToFit === true || selectedOverride.scaleToFit === true || node?.parentElement?.dataset.pageEditorDockScaleToFit === "true"
                  : "";

      if (field.type === "checkbox") {
        input.checked = resolvedValue === true;
      } else {
        input.value = resolvedValue;
      }
    });

    parentPicker.disabled = !node;

    summary.textContent = node
      ? `${describePageEditorNode(node)}`
      : "Select something on the page.";
    syncMouseStatePanel();
  };

  const getSelectableEditorNode = (node) => {
    if (!(node instanceof HTMLElement)) {
      return null;
    }

    if (node === rootNode) {
      const flowNode = getPageEditorFlowContainer();
      if (flowNode instanceof HTMLElement) {
        return flowNode;
      }
    }

    if (node.matches(".page-editor-table-asset__cell")) {
      return node.closest(".page-editor-table-asset");
    }

    if (node.matches(".page-editor-table-asset__subrow, .page-editor-table-asset__subcell, .page-editor-table-asset__subcell-divider, .page-editor-table-asset__subdivider, .page-editor-table-asset__subrow-add, .page-editor-table-asset__subrow-remove")) {
      return node.closest(".page-editor-table-asset");
    }

    return node;
  };

  const refreshSelection = (nodeOrKey) => {
    const resolvedNode =
      typeof nodeOrKey === "string"
        ? findEditableNodeByKey(nodeOrKey)
        : nodeOrKey instanceof HTMLElement && nodeOrKey.dataset.pageEditorKey
          ? findEditableNodeByKey(nodeOrKey.dataset.pageEditorKey) || nodeOrKey
          : nodeOrKey;
    const nextNode = getSelectableEditorNode(resolvedNode);
    selectedNode = nextNode;
    selectedKey = nextNode?.dataset.pageEditorKey || "";
    if (selectedKey && /^asset:\d+$/.test(selectedKey)) {
      lastSelectedAssetKey = selectedKey;
    }
    highlightSelection();
    syncEditorForm();
  };

  const clearSelectedElement = () => {
    selectedNode = null;
    selectedKey = "";
    mergeCandidateKeys.clear();
    clearInteractionState();
    clearSelectionHighlight();
    syncEditorForm();
    syncMoveControls();
  };

  const patchNodeStyles = (node, nodeKey, styleUpdates) => {
    if (!(node instanceof HTMLElement) || !nodeKey) {
      return;
    }

    const existingOverride = draftPageOverrides[nodeKey] || {};
    const nextStyles = {
      ...(existingOverride.styles || {}),
      ...styleUpdates,
    };

    Object.keys(nextStyles).forEach((styleKey) => {
      if (!nextStyles[styleKey]) {
        delete nextStyles[styleKey];
      }
    });

    draftPageOverrides[nodeKey] = {
      ...existingOverride,
      styles: nextStyles,
    };

    if (getDebugDisplayComponentType(node) === "textbox") {
      const textboxComponentState = {
        ...getTextboxComponentState(node, draftPageOverrides[nodeKey]),
      };
      if (Object.prototype.hasOwnProperty.call(styleUpdates, "left")) {
        textboxComponentState.left = nextStyles.left || "";
      }
      if (Object.prototype.hasOwnProperty.call(styleUpdates, "top")) {
        textboxComponentState.top = nextStyles.top || "";
      }
      if (Object.prototype.hasOwnProperty.call(styleUpdates, "width")) {
        textboxComponentState.width = nextStyles.width || "";
      }
      if (Object.prototype.hasOwnProperty.call(styleUpdates, "height")) {
        textboxComponentState.height = nextStyles.height || "";
      }
      setTextboxDatasetState(node, textboxComponentState);
      setComponentOverride(draftPageOverrides[nodeKey], "textbox", textboxComponentState);
    }

    if (!Object.keys(nextStyles).length) {
      delete draftPageOverrides[nodeKey].styles;
    }

    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
    highlightSelection();
    syncEditorForm();
  };

  const patchSelectedStyles = (styleUpdates) => {
    if (!selectedNode || !selectedKey) {
      return;
    }

    patchNodeStyles(selectedNode, selectedKey, styleUpdates);
  };

  const resolveGridCollisionsInParent = (parentNode, anchorNode) => {
    if (!(parentNode instanceof HTMLElement) || !anchorNode) {
      return;
    }

    if (!getContainerLayoutContext(parentNode).supportsGridPlacement) {
      return;
    }

    const gridChildren = [...parentNode.children].filter((child) => {
      return (
        child instanceof HTMLElement &&
        !!child.dataset.pageEditorKey &&
        window.getComputedStyle(child).display !== "none"
      );
    });

    if (gridChildren.length < 2) {
      return;
    }

    const childBounds = new Map(
      gridChildren.map((child) => [child.dataset.pageEditorKey, getGridPlacementBounds(child)])
    );
    const anchorBounds = childBounds.get(anchorNode.dataset.pageEditorKey);
    if (!anchorBounds) {
      return;
    }

    const columnCount = Math.max(
      1,
      ...[...childBounds.values()].map((bounds) => bounds.columnEnd)
    );
    const occupied = [];
    occupied.push(anchorBounds);

    const siblings = gridChildren.filter((child) => child !== anchorNode);
    siblings.sort((leftNode, rightNode) => {
      const leftBounds = childBounds.get(leftNode.dataset.pageEditorKey);
      const rightBounds = childBounds.get(rightNode.dataset.pageEditorKey);
      return (
        (leftBounds?.rowStart || 0) - (rightBounds?.rowStart || 0) ||
        (leftBounds?.columnStart || 0) - (rightBounds?.columnStart || 0)
      );
    });

    siblings.forEach((childNode) => {
      const childKey = childNode.dataset.pageEditorKey;
      const originalBounds = childBounds.get(childKey);
      if (!originalBounds) {
        return;
      }

      let nextBounds = { ...originalBounds };
      while (occupied.some((occupiedBounds) => doGridBoundsOverlap(nextBounds, occupiedBounds))) {
        const nextColumnStart = nextBounds.columnStart + 1;
        const span = nextBounds.columnEnd - nextBounds.columnStart + 1;
        if (nextColumnStart + span - 1 <= columnCount) {
          nextBounds = {
            ...nextBounds,
            columnStart: nextColumnStart,
            columnEnd: nextColumnStart + span - 1,
          };
        } else {
          nextBounds = {
            ...nextBounds,
            columnStart: 1,
            columnEnd: span,
            rowStart: nextBounds.rowEnd + 1,
            rowEnd: nextBounds.rowEnd + 1 + (originalBounds.rowEnd - originalBounds.rowStart),
          };
        }
      }

      occupied.push(nextBounds);

      const existingOverride = draftPageOverrides[childKey] || {};
      draftPageOverrides[childKey] = {
        ...existingOverride,
        placement: {
          parentKey: parentNode.dataset.pageEditorKey,
          index: existingOverride.placement?.index ?? [...parentNode.children].indexOf(childNode),
        },
        styles: {
          ...(existingOverride.styles || {}),
          gridColumn:
            nextBounds.columnStart === nextBounds.columnEnd
              ? String(nextBounds.columnStart)
              : `${nextBounds.columnStart} / span ${nextBounds.columnEnd - nextBounds.columnStart + 1}`,
          gridRow:
            nextBounds.rowStart === nextBounds.rowEnd
              ? String(nextBounds.rowStart)
              : `${nextBounds.rowStart} / span ${nextBounds.rowEnd - nextBounds.rowStart + 1}`,
        },
      };
    });

    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
  };

  const resolveRenderedOverlapInParent = (parentNode, anchorNode) => {
    if (!(parentNode instanceof HTMLElement) || !(anchorNode instanceof HTMLElement)) {
      return;
    }

    if (!getContainerLayoutContext(parentNode).supportsGridPlacement) {
      return;
    }

    const gridChildren = [...parentNode.children].filter((child) => {
      return (
        child instanceof HTMLElement &&
        !!child.dataset.pageEditorKey &&
        window.getComputedStyle(child).display !== "none"
      );
    });
    const boundsByKey = new Map(
      gridChildren.map((child) => [child.dataset.pageEditorKey, getGridPlacementBounds(child)])
    );
    const anchorBounds = boundsByKey.get(anchorNode.dataset.pageEditorKey);
    if (!anchorBounds) {
      return;
    }

    const anchorRect = anchorNode.getBoundingClientRect();
    const sameRowSiblings = gridChildren
      .filter((node) => {
        if (node === anchorNode) {
          return false;
        }

        const nodeBounds = boundsByKey.get(node.dataset.pageEditorKey);
        return nodeBounds && nodeBounds.rowStart === anchorBounds.rowStart;
      })
      .sort((leftNode, rightNode) => {
        const leftBounds = boundsByKey.get(leftNode.dataset.pageEditorKey);
        const rightBounds = boundsByKey.get(rightNode.dataset.pageEditorKey);
        return (leftBounds?.columnStart || 0) - (rightBounds?.columnStart || 0);
      });
    const rowGap =
      Number.parseFloat(window.getComputedStyle(parentNode).columnGap || "0") || 12;
    let currentRightEdge = anchorRect.right;
    let changed = false;

    sameRowSiblings.forEach((node) => {
      const nodeKey = node.dataset.pageEditorKey;
      const existingOverride = draftPageOverrides[nodeKey] || {};
      const nodeRect = node.getBoundingClientRect();
      const requiredLeft = currentRightEdge + rowGap;
      const nextMarginLeft = Math.max(0, Math.round(requiredLeft - nodeRect.left));
      const nextStyles = {
        ...(existingOverride.styles || {}),
      };

      if (nextMarginLeft > 0) {
        nextStyles.marginLeft = `${nextMarginLeft}px`;
        changed = true;
      } else if (nextStyles.marginLeft) {
        delete nextStyles.marginLeft;
        changed = true;
      }

      draftPageOverrides[nodeKey] = {
        ...existingOverride,
        styles: nextStyles,
      };

      if (!Object.keys(nextStyles).length) {
        delete draftPageOverrides[nodeKey].styles;
      }

      currentRightEdge = Math.max(currentRightEdge, nodeRect.right + nextMarginLeft);
    });

    if (!changed) {
      return;
    }

    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
  };

  const updateSelectedOverrideFromForm = () => {
    const editorDocument = getEditorDocument();
    if (!editorDocument || !selectedNode || !selectedKey) {
      return;
    }

    const activeEditorElement = editorDocument.activeElement;
    const activeDebugFieldId =
      isDomElement(activeEditorElement) && activeEditorElement.hasAttribute("data-debug-field")
        ? activeEditorElement.id || ""
        : "";
    const activeSelectionStart =
      activeEditorElement &&
      typeof activeEditorElement.selectionStart === "number"
        ? activeEditorElement.selectionStart
        : null;
    const activeSelectionEnd =
      activeEditorElement &&
      typeof activeEditorElement.selectionEnd === "number"
        ? activeEditorElement.selectionEnd
        : null;

    const readDebugFieldValue = (key, type = "text") => {
      const input = editorDocument.getElementById(`editor-debug-${key}`);
      if (!input) {
        return "";
      }

      return type === "checkbox" ? input.checked : input.value || "";
    };
    const selectedOverride = getSelectedOverride();
    const nextOverride = {
      ...selectedOverride,
      ...(selectedOverride.styles ? { styles: { ...selectedOverride.styles } } : {}),
    };
    const textboxComponentState =
      getDebugDisplayComponentType(selectedNode) === "textbox"
        ? {
            ...getTextboxComponentState(selectedNode, selectedOverride),
          }
        : null;

    const debugFields = getDebugDisplayComponentFields(selectedNode);
    if (debugFields.length) {
      debugFields.forEach((field) => {
        const nextValue = readDebugFieldValue(field.key, field.type);
        if (field.key === "text") {
          if (textboxComponentState) {
            textboxComponentState.text = nextValue;
          } else {
            nextOverride.text = nextValue;
            if (selectedNode.matches("input, textarea, select")) {
              setTextControlValue(selectedNode, nextValue);
              nextOverride.value = nextValue;
            }
          }
        } else if (field.key === "left" && textboxComponentState) {
          textboxComponentState.left = normalizePageEditorDimension(nextValue);
        } else if (field.key === "top" && textboxComponentState) {
          textboxComponentState.top = normalizePageEditorDimension(nextValue);
        } else if (field.key === "width" && textboxComponentState) {
          textboxComponentState.width = normalizePageEditorDimension(nextValue);
        } else if (field.key === "height" && textboxComponentState) {
          textboxComponentState.height = normalizePageEditorDimension(nextValue);
        } else if (field.key === "themeColor" && textboxComponentState) {
          textboxComponentState.themeColor = nextValue;
        } else if (field.key === "dockHorizontal") {
          if (textboxComponentState) {
            textboxComponentState.dockHorizontal = nextValue;
          } else {
            nextOverride.dockHorizontal = nextValue;
          }
        } else if (field.key === "dockVertical") {
          if (textboxComponentState) {
            textboxComponentState.dockVertical = nextValue;
          } else {
            nextOverride.dockVertical = nextValue;
          }
        } else if (field.key === "scaleToFit") {
          if (textboxComponentState) {
            textboxComponentState.scaleToFit = nextValue === true;
          } else if (nextValue === true) {
            nextOverride.scaleToFit = true;
          } else {
            delete nextOverride.scaleToFit;
          }
        }
      });
    }

    if (textboxComponentState) {
      setTextboxDatasetState(selectedNode, textboxComponentState);
      setComponentOverride(nextOverride, "textbox", textboxComponentState);
      nextOverride.text = textboxComponentState.text || "";
      nextOverride.value = textboxComponentState.text || "";
      nextOverride.dockHorizontal = textboxComponentState.dockHorizontal || "";
      nextOverride.dockVertical = textboxComponentState.dockVertical || "";
      if (textboxComponentState.scaleToFit === true) {
        nextOverride.scaleToFit = true;
      } else {
        delete nextOverride.scaleToFit;
      }
      nextOverride.styles = {
        ...(nextOverride.styles || {}),
        left: textboxComponentState.left || "",
        top: textboxComponentState.top || "",
        width: textboxComponentState.width || "",
        height: textboxComponentState.height || "",
      };
      setTextControlValue(selectedNode, textboxComponentState.text || "");
    }

    if (!nextOverride.text) {
      delete nextOverride.text;
    }
    if (!nextOverride.value) {
      delete nextOverride.value;
    }
    if (!nextOverride.dockHorizontal) {
      delete nextOverride.dockHorizontal;
    }
    if (!nextOverride.dockVertical) {
      delete nextOverride.dockVertical;
    }
    if (nextOverride.styles && typeof nextOverride.styles === "object") {
      Object.keys(nextOverride.styles).forEach((styleKey) => {
        if (!nextOverride.styles[styleKey]) {
          delete nextOverride.styles[styleKey];
        }
      });
      if (!Object.keys(nextOverride.styles).length) {
        delete nextOverride.styles;
      }
    }

    draftPageOverrides[selectedKey] = nextOverride;
    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    writePageEditorDraft(pagePath, draftPageOverrides);
    applyOverrides();
    if (getDebugDisplayComponentType(selectedNode) === "textbox") {
      applyTextboxComponentState(selectedNode, nextOverride);
    }
    highlightSelection();
    syncResizeOverlay();
    syncMouseStatePanel();

    if (activeDebugFieldId) {
      const nextActiveField = editorDocument.getElementById(activeDebugFieldId);
      if (isDomElement(nextActiveField) && typeof nextActiveField.focus === "function") {
        nextActiveField.focus({ preventScroll: true });
        if (
          typeof nextActiveField.setSelectionRange === "function" &&
          typeof activeSelectionStart === "number" &&
          typeof activeSelectionEnd === "number"
        ) {
          nextActiveField.setSelectionRange(activeSelectionStart, activeSelectionEnd);
        }
      }
    }
  };

  const clearInteractionState = () => {
    activeResizeMode = "";
    resizeStartRect = null;
    const activeDraggedNode = selectedNode;
    activeMovePointerId = null;
    activeMoveState = null;
    if (activeDropTarget) {
      activeDropTarget.classList.remove("page-editor-drop-target");
      activeDropTarget = null;
    }
    lastValidDropTarget = null;
    if (activeDraggedNode) {
      activeDraggedNode.style.removeProperty("z-index");
      activeDraggedNode.style.removeProperty("pointer-events");
      activeDraggedNode.style.removeProperty("transform");
    }
    document.body.classList.remove("page-editor-resizing");
    document.body.classList.remove("page-editor-moving");
    syncMouseStatePanel();
  };

  const stopResize = (event) => {
    emitEditorLog("stop-interaction:start", {
      pointerId: event?.pointerId ?? null,
      lastValidDropTarget: lastValidDropTarget ? getPageEditorPlacementKey(lastValidDropTarget) : "(none)",
    });
    if (activeResizeMode && selectedNode && resizeStartRect) {
      patchSelectedStyles({
        width:
          activeResizeMode === "right" || activeResizeMode === "corner"
            ? selectedNode.style.width || `${Math.round(resizeStartRect.width)}px`
            : activeResizeMode === "bottom" && resizeStartRect.existingWidth
              ? resizeStartRect.existingWidth
            : undefined,
        height:
          activeResizeMode === "bottom" || activeResizeMode === "corner"
            ? selectedNode.style.height || `${Math.round(resizeStartRect.height)}px`
            : activeResizeMode === "right" && resizeStartRect.existingHeight
              ? resizeStartRect.existingHeight
            : undefined,
      });
    }

    if (selectedNode && activeMoveState?.mode === "free" && activeMoveState.didMove) {
      if (activeMoveState?.mode === "free") {
        const resolvedDropTarget =
          lastValidDropTarget && lastValidDropTarget !== selectedNode
            ? lastValidDropTarget
            : activeDropTarget && activeDropTarget !== selectedNode
              ? activeDropTarget
              : null;
        const targetParent = resolvedDropTarget || activeMoveState.parentNode;
        if (targetParent instanceof HTMLElement) {
          const isDockDrop =
            resolvedDropTarget instanceof HTMLElement &&
            isDockTargetNode(resolvedDropTarget) &&
            resolvedDropTarget !== activeMoveState.parentNode;
          if (resolvedDropTarget && resolvedDropTarget !== activeMoveState.parentNode) {
            emitEditorLog("drop-commit:free", {
              targetParent: getPageEditorPlacementKey(targetParent),
              isDockDrop,
            });
            commitMoveToTarget(selectedNode, targetParent, isDockDrop ? 0 : null);
          }
          if (!isDockDrop) {
            ensurePositionedParent(targetParent);
            const relative = getNodeRectRelativeToParent(selectedNode, targetParent);
            patchSelectedStyles({
              position: "absolute",
              left: `${relative.left}px`,
              top: `${relative.top}px`,
              gridColumn: "",
              gridRow: "",
              justifySelf: "",
              alignSelf: "",
              order: "",
              zIndex: "",
            });
            setStatus(`Freely positioned ${describePageEditorNode(selectedNode)} inside ${describePageEditorNode(targetParent)}.`);
          } else {
            setStatus(`Docked ${describePageEditorNode(selectedNode)} into ${describePageEditorNode(targetParent)}.`);
          }
        }
      }
    } else if (
      activeMovePointerId !== null &&
      (event?.pointerId == null || activeMovePointerId === event?.pointerId) &&
      selectedNode &&
      (lastValidDropTarget || activeDropTarget)
    ) {
      const resolvedDropTarget = lastValidDropTarget || activeDropTarget;
      emitEditorLog("drop-commit:fallback", {
        targetParent: getPageEditorPlacementKey(resolvedDropTarget),
        isDockDrop: isDockTargetNode(resolvedDropTarget),
      });
      commitMoveToTarget(selectedNode, resolvedDropTarget, isDockTargetNode(resolvedDropTarget) ? 0 : null);
      setStatus(`Moved ${describePageEditorNode(selectedNode)} into ${describePageEditorNode(resolvedDropTarget)}.`);
    }
    emitEditorLog("stop-interaction:end");
    clearInteractionState();
  };

  const findDropTargetFromPoint = (x, y) => {
    const nodesAtPoint = document.elementsFromPoint(x, y);
    const explicitDockTarget = nodesAtPoint
      .map((node) => {
        if (!(node instanceof Element) || !rootNode.contains(node)) {
          return null;
        }

        const dockNode = node.closest("[data-page-editor-dock-key][data-page-editor-dockable='true']");
        return dockNode instanceof HTMLElement &&
          dockNode !== selectedNode &&
          !selectedNode?.contains(dockNode)
          ? dockNode
          : null;
      })
      .find((node) => {
        return (
          node instanceof HTMLElement &&
          (!isPageBorderAsset(selectedNode) || isPageLevelPlacementContainer(node, rootNode))
        );
      });

    if (explicitDockTarget) {
      return explicitDockTarget;
    }

    const explicitBorderTarget = nodesAtPoint
      .map((node) => {
        if (!(node instanceof Element) || !rootNode.contains(node)) {
          return null;
        }

        const borderNode = node.closest(".page-editor-border-asset");
        return borderNode instanceof HTMLElement && borderNode !== selectedNode ? borderNode : null;
      })
      .find((node) => {
        return (
          node instanceof HTMLElement &&
          (!isPageBorderAsset(selectedNode) || isPageLevelPlacementContainer(node, rootNode))
        );
      });

    if (explicitBorderTarget) {
      return explicitBorderTarget;
    }

    const resolvedTargets = nodesAtPoint
      .map((node) => {
        if (!(node instanceof Element) || !rootNode.contains(node)) {
          return null;
        }

        return findContainerTargetNode(node, rootNode, selectedNode);
      })
      .filter((node) => {
        return (
          node instanceof HTMLElement &&
          node !== selectedNode &&
          (!isPageBorderAsset(selectedNode) || isPageLevelPlacementContainer(node, rootNode))
        );
      });

    const dockTarget = resolvedTargets.find((node) => isDockTargetNode(node));
    if (dockTarget) {
      return dockTarget;
    }

    const freePositionTarget = resolvedTargets.find((node) => isFreePositionContainer(node));
    if (freePositionTarget) {
      return freePositionTarget;
    }

    return resolvedTargets[0] || null;
  };

  const commitMoveToTarget = (sourceNode, targetNode, targetIndex = null) => {
    const sourceKey = sourceNode?.dataset.pageEditorKey || "";
    const targetKey = getPageEditorPlacementKey(targetNode);
    if (!sourceNode || !sourceKey || !targetKey) {
      emitEditorLog("commit-move:skipped", {
        reason: "missing-source-or-target",
        sourceKey,
        targetKey,
      });
      return;
    }

    if (isPageBorderAsset(sourceNode) && !isPageLevelPlacementContainer(targetNode, rootNode)) {
      setStatus("Borders are page elements and can only be placed in the page flow.");
      emitEditorLog("commit-move:blocked", {
        reason: "border-non-page-target",
        sourceKey,
        targetKey,
      });
      return;
    }

    if (targetNode === sourceNode || sourceNode.contains(targetNode)) {
      setStatus("That item cannot be placed inside itself.");
      emitEditorLog("commit-move:blocked", {
        reason: "self-or-descendant-target",
        sourceKey,
        targetKey,
      });
      return;
    }

    const sourceParent = sourceNode.parentElement instanceof HTMLElement ? sourceNode.parentElement : null;
    const sourceRectBeforeMove = sourceNode.getBoundingClientRect();
    const targetRectBeforeMove = targetNode.getBoundingClientRect();
    const sourceBoundsBeforeMove = getGridPlacementBounds(sourceNode);
    const sourceColumnSpanBeforeMove = Math.max(
      1,
      sourceBoundsBeforeMove.columnEnd - sourceBoundsBeforeMove.columnStart + 1
    );
    const sourceRowSpanBeforeMove = Math.max(
      1,
      sourceBoundsBeforeMove.rowEnd - sourceBoundsBeforeMove.rowStart + 1
    );
    const targetChildren = [...targetNode.children].filter((child) => {
      if (!(child instanceof HTMLElement) || child === sourceNode) {
        return false;
      }

      if (isDockTargetNode(targetNode)) {
        return !!getPageEditorPlacementKey(child);
      }

      return true;
    });
    const safeIndex = Math.max(0, Math.min(Number.parseInt(targetIndex ?? targetChildren.length, 10) || 0, targetChildren.length));
    const targetRows = getSiblingRowGroups(targetNode).map((row) =>
      row.items.map((item) => item.node).filter((node) => node !== sourceNode)
    );
    const flattenedTarget = targetRows.flat();
    const insertionIndex = Math.max(0, Math.min(safeIndex, flattenedTarget.length));
    flattenedTarget.splice(insertionIndex, 0, sourceNode);
    const rebuiltTargetRows =
      targetRows.length > 0
        ? []
        : [[sourceNode]];

    if (targetRows.length > 0) {
      const fallbackWidth = Math.max(
        1,
        ...targetRows.map((rowNodes) => rowNodes.length || 1)
      );
      for (let offset = 0; offset < flattenedTarget.length; offset += fallbackWidth) {
        rebuiltTargetRows.push(flattenedTarget.slice(offset, offset + fallbackWidth));
      }
    }

    const targetIsDockTarget = isDockTargetNode(targetNode);
    const sourceUsesManagedGrid = shouldUseManagedGridPlacement(sourceParent);
    const targetUsesManagedGrid = !targetIsDockTarget && shouldUseManagedGridPlacement(targetNode);
    const targetUsesFreePositioning = isFreePositionContainer(targetNode) && isFreeMoveEligible(sourceNode);

    if (sourceParent && sourceParent !== targetNode && sourceUsesManagedGrid) {
      const sourceRows = getSiblingRowGroups(sourceParent)
        .map((row) => row.items.map((item) => item.node).filter((node) => node !== sourceNode))
        .filter((rowNodes) => rowNodes.length > 0);
      rewriteParentPlacementDraft(
        draftPageOverrides,
        sourceParent,
        sourceRows.length ? sourceRows : [[]],
        { useGrid: true }
      );
    } else if (sourceParent && sourceParent !== targetNode && isStructuredGridContainer(sourceParent)) {
      clearStructuredContainerPlacementOverrides(draftPageOverrides, sourceParent);
    }

    const targetLayout = getContainerLayoutContext(targetNode);
    if (targetUsesManagedGrid) {
      rewriteParentPlacementDraft(
        draftPageOverrides,
        targetNode,
        rebuiltTargetRows.filter((rowNodes) => rowNodes.length > 0),
        { useGrid: true }
      );

      const targetMetrics = getGridTrackMetrics(targetNode, sourceNode);
      const sourceRowIndex = rebuiltTargetRows.findIndex((rowNodes) => rowNodes.includes(sourceNode));
      const sourceColumnIndex =
        sourceRowIndex >= 0 ? rebuiltTargetRows[sourceRowIndex].indexOf(sourceNode) : 0;
      const sourceOverride = draftPageOverrides[sourceKey] || {};
      draftPageOverrides[sourceKey] = {
        ...sourceOverride,
        styles: {
          ...(sourceOverride.styles || {}),
          gridColumn: buildGridPlacement(
            String(sourceColumnIndex + 1),
            sourceColumnSpanBeforeMove > 1
              ? String(Math.min(sourceColumnSpanBeforeMove, targetMetrics.columnCount - sourceColumnIndex))
              : ""
          ),
          gridRow: buildGridPlacement(
            String(sourceRowIndex + 1),
            sourceRowSpanBeforeMove > 1 ? String(sourceRowSpanBeforeMove) : ""
          ),
        },
      };
    } else {
      const sourceOverride = draftPageOverrides[sourceKey] || {};
      const nextStyles = {
        ...(sourceOverride.styles || {}),
      };
      ["gridColumn", "gridRow", "order", "justifySelf", "alignSelf"].forEach((styleKey) => {
        delete nextStyles[styleKey];
      });

      if (targetUsesFreePositioning) {
        const nextLeft = Math.max(
          0,
          Math.round(sourceRectBeforeMove.left - targetRectBeforeMove.left + targetNode.scrollLeft)
        );
        const nextTop = Math.max(
          0,
          Math.round(sourceRectBeforeMove.top - targetRectBeforeMove.top + targetNode.scrollTop)
        );
        nextStyles.position = "absolute";
        nextStyles.left = `${nextLeft}px`;
        nextStyles.top = `${nextTop}px`;
      } else {
        ["position", "left", "top", "zIndex"].forEach((styleKey) => {
          delete nextStyles[styleKey];
        });

        if (targetIsDockTarget) {
          nextStyles.width = "100%";
          nextStyles.height = "100%";
          nextStyles.maxWidth = "none";
          nextStyles.minHeight = "0";
          nextStyles.justifySelf = "stretch";
          nextStyles.alignSelf = "stretch";
          nextStyles.marginLeft = "";
        }
      }

      draftPageOverrides[sourceKey] = {
        ...sourceOverride,
        placement: {
          parentKey: targetKey,
          index: safeIndex,
        },
        styles: nextStyles,
      };

      if (!Object.keys(nextStyles).length) {
        delete draftPageOverrides[sourceKey].styles;
      }

      if (isStructuredGridContainer(targetNode)) {
        clearStructuredContainerPlacementOverrides(draftPageOverrides, targetNode);
      }
    }

    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    if (normalizeInvalidPlacements(draftPageOverrides)) {
      mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    }
    applyOverrides();
    emitEditorLog("commit-move:applied", {
      sourceKey,
      targetKey,
      targetIndex: safeIndex,
      targetIsDockTarget: isDockTargetNode(targetNode),
      targetUsesManagedGrid,
      targetUsesFreePositioning,
    });
    if (targetUsesManagedGrid) {
      resolveGridCollisionsInParent(targetNode, sourceNode);
    }
    highlightSelection();
    syncEditorForm();
  };

  const moveSelectedWithinParent = (direction) => {
    if (!selectedNode) {
      return;
    }

    const parentNode = selectedNode.parentElement;
    if (!(parentNode instanceof HTMLElement)) {
      return;
    }

    const parentLayout = getPageEditorLayoutContext(selectedNode);
    const rows = getSiblingRowGroups(parentNode).map((row) => row.items.map((item) => item.node));
    const currentRowIndex = rows.findIndex((rowNodes) => rowNodes.includes(selectedNode));
    if (currentRowIndex < 0) {
      return;
    }

    const currentColumnIndex = rows[currentRowIndex].indexOf(selectedNode);
    rows[currentRowIndex] = rows[currentRowIndex].filter((node) => node !== selectedNode);
    if (!rows[currentRowIndex].length) {
      rows.splice(currentRowIndex, 1);
    }

    if (direction === "left" || direction === "right") {
      const targetRowIndex = rows.findIndex((rowNodes) => rowNodes.length > 0 && (rowNodes.includes(selectedNode) || true));
      const effectiveRowIndex = Math.min(currentRowIndex, rows.length - 1);
      const targetRow = rows[effectiveRowIndex] || [];
      const insertIndex =
        direction === "left"
          ? Math.max(0, currentColumnIndex - 1)
          : Math.min(targetRow.length, currentColumnIndex + 1);
      targetRow.splice(insertIndex, 0, selectedNode);
      rows[effectiveRowIndex] = targetRow;
    } else if (direction === "up") {
      if (currentRowIndex > 0) {
        rows[currentRowIndex - 1].push(selectedNode);
      } else {
        rows.unshift([selectedNode]);
      }
    } else if (direction === "down") {
      if (currentRowIndex < rows.length) {
        const targetRowIndex = Math.min(currentRowIndex + 1, rows.length);
        if (targetRowIndex < rows.length) {
          rows[targetRowIndex].push(selectedNode);
        } else {
          rows.push([selectedNode]);
        }
      } else {
        rows.push([selectedNode]);
      }
    }

    rewriteParentPlacementDraft(
      draftPageOverrides,
      parentNode,
      rows.filter((rowNodes) => rowNodes.length > 0),
      { useGrid: parentLayout.supportsGridPlacement }
    );
    mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
    applyOverrides();
    highlightSelection();
    syncEditorForm();
    setStatus(`Moved ${describePageEditorNode(selectedNode)} ${direction} within ${describePageEditorNode(parentNode)}.`);
  };

  const updateResize = (event) => {
    lastPointerState = {
      x: event.clientX,
      y: event.clientY,
      isDown: (event.buttons & 1) === 1,
      pointerId: event.pointerId ?? null,
      targetLabel:
        event.target instanceof HTMLElement
          ? describePageEditorNode(getSelectableEditorNode(event.target) || event.target)
          : "",
    };
    syncMouseStatePanel();

    if (!activeResizeMode || !selectedNode || !resizeStartRect) {
      if (activeMovePointerId !== null && activeMovePointerId === event.pointerId && selectedNode) {
        if ((event.buttons & 1) !== 1) {
          stopResize(event);
          return;
        }

        if (activeMoveState?.mode === "free") {
          const dragDeltaX = event.clientX - activeMoveState.startX;
          const dragDeltaY = event.clientY - activeMoveState.startY;
          if (!activeMoveState.didMove) {
            if (Math.abs(dragDeltaX) < 4 && Math.abs(dragDeltaY) < 4) {
              return;
            }
            activeMoveState.didMove = true;
            emitEditorLog("drag:start", {
              pointerId: event.pointerId ?? null,
              sourceParent: activeMoveState.parentNode ? getPageEditorPlacementKey(activeMoveState.parentNode) : "(none)",
            });
            document.body.classList.add("page-editor-moving");
            document.body.appendChild(selectedNode);
            selectedNode.style.width = `${Math.round(activeMoveState.startRect.width)}px`;
            selectedNode.style.height = `${Math.round(activeMoveState.startRect.height)}px`;
            selectedNode.style.position = "fixed";
            selectedNode.style.justifySelf = "";
            selectedNode.style.alignSelf = "";
            selectedNode.style.gridColumn = "";
            selectedNode.style.gridRow = "";
            selectedNode.style.order = "";
            selectedNode.style.left = `${Math.round(event.clientX - activeMoveState.startRect.width / 2)}px`;
            selectedNode.style.top = `${Math.round(event.clientY - activeMoveState.startRect.height / 2)}px`;
            selectedNode.style.transform = "none";
            selectedNode.style.pointerEvents = "none";
            selectedNode.style.zIndex = "10030";
          }

          const nextDropTarget = findDropTargetFromPoint(event.clientX, event.clientY);
          if (activeDropTarget && activeDropTarget !== nextDropTarget) {
            activeDropTarget.classList.remove("page-editor-drop-target");
          }
          activeDropTarget = nextDropTarget;
          activeDropTarget?.classList.add("page-editor-drop-target");
          if (nextDropTarget) {
            lastValidDropTarget = nextDropTarget;
            emitEditorLog("drag:hover-target", {
              targetKey: getPageEditorPlacementKey(nextDropTarget),
              targetIsDockTarget: isDockTargetNode(nextDropTarget),
            });
          }

          const parentNode =
            activeDropTarget && activeDropTarget !== selectedNode
              ? activeDropTarget
              : activeMoveState.parentNode;
          if (parentNode instanceof HTMLElement) {
            const nextLeft = Math.round(event.clientX - activeMoveState.startRect.width / 2);
            const nextTop = Math.round(event.clientY - activeMoveState.startRect.height / 2);
            selectedNode.style.position = "fixed";
            selectedNode.style.justifySelf = "";
            selectedNode.style.alignSelf = "";
            selectedNode.style.gridColumn = "";
            selectedNode.style.gridRow = "";
            selectedNode.style.order = "";
            selectedNode.style.left = `${nextLeft}px`;
            selectedNode.style.top = `${nextTop}px`;
            selectedNode.style.transform = "none";
            selectedNode.style.zIndex = "10030";
            syncResizeOverlay();
          }
          return;
        }

        const nextDropTarget = findDropTargetFromPoint(event.clientX, event.clientY);
        if (activeDropTarget && activeDropTarget !== nextDropTarget) {
          activeDropTarget.classList.remove("page-editor-drop-target");
        }
        activeDropTarget = nextDropTarget;
        activeDropTarget?.classList.add("page-editor-drop-target");
        if (nextDropTarget) {
          lastValidDropTarget = nextDropTarget;
          emitEditorLog("drag:hover-target", {
            targetKey: getPageEditorPlacementKey(nextDropTarget),
            targetIsDockTarget: isDockTargetNode(nextDropTarget),
          });
        }
      }
      return;
    }

    if ((event.buttons & 1) !== 1) {
      stopResize(event);
      return;
    }

    const deltaX = event.clientX - resizeStartRect.pointerX;
    const deltaY = event.clientY - resizeStartRect.pointerY;
    const nextWidth =
      activeResizeMode === "right" || activeResizeMode === "corner"
        ? Math.max(80, Math.round(resizeStartRect.width + deltaX))
        : resizeStartRect.width;
    const nextHeight =
      activeResizeMode === "bottom" || activeResizeMode === "corner"
        ? Math.max(48, Math.round(resizeStartRect.height + deltaY))
        : resizeStartRect.height;

    if (selectedNode.parentElement instanceof HTMLElement) {
      clearAutoOffsetStylesForChildren(draftPageOverrides, selectedNode.parentElement);
    }

    if (activeResizeMode === "right" || activeResizeMode === "corner") {
      selectedNode.style.width = `${nextWidth}px`;
    }

    if (activeResizeMode === "bottom" || activeResizeMode === "corner") {
      selectedNode.style.height = `${nextHeight}px`;
    }

    syncResizeOverlay();
  };

  const bindEditorWindow = () => {
    const editorDocument = getEditorDocument();
    if (!editorDocument || editorDocument.body.dataset.boundPageEditor === "true") {
      return;
    }

    editorDocument.body.dataset.boundPageEditor = "true";

    editorDocument.querySelectorAll("[data-editor-tab]").forEach((buttonNode) => {
      buttonNode.addEventListener("click", () => {
        const tabName = buttonNode.getAttribute("data-editor-tab") || "editor";
        setEditorTab(tabName);
      });
    });

    editorDocument.querySelectorAll("[data-spawn-asset]").forEach((buttonNode) => {
      buttonNode.addEventListener("click", () => {
        const requestedAssetType = buttonNode.getAttribute("data-spawn-asset") || "";
        spawnAssetType = spawnAssetType === requestedAssetType ? "" : requestedAssetType;
        syncSpawnAssetButtons();
        if (!spawnAssetType) {
          clearAssetPlacementStatus();
          setStatus("Asset placement is no longer armed.");
          syncInsertOverlay();
          return;
        }
        const assetLabel =
          spawnAssetType === "border"
            ? "border asset"
            : spawnAssetType === "textbox"
              ? "textbox asset"
              : "table asset";
        setAssetStatus(
          spawnAssetType === "border"
            ? "Move over the page insertion lines, then click one to place the border."
            : `Move over the page to preview, then click once to place the ${assetLabel}.`
        );
        setStatus("Asset placement is armed. Move over the page to preview placement.");
        syncInsertOverlay();
      });
    });

    editorDocument.addEventListener("input", (event) => {
      if (isDomElement(event.target) && event.target.matches("[data-debug-field]")) {
        updateSelectedOverrideFromForm();
      }
    });

    editorDocument.addEventListener("change", (event) => {
      if (isDomElement(event.target) && event.target.matches("[data-debug-field]")) {
        updateSelectedOverrideFromForm();
      }
    });

    editorDocument.querySelector("[data-print-log]")?.addEventListener("click", async () => {
      try {
        if (!(window.__GDU_EDITOR_APP__ === true && typeof window.__GDU_EDITOR_API_BASE__ === "string")) {
          setStatus("Print log is only available in the local EXE editor.");
          return;
        }

        const response = await fetch(`${window.__GDU_EDITOR_API_BASE__}/__editor-api/print-log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{}",
        });

        if (!response.ok) {
          throw new Error("Failed to write editor log.");
        }

        const payload = await response.json();
        const savedPath = payload?.path || "publish\\logs\\editor-log.txt";
        const fileName = String(savedPath).split(/[\\/]/).filter(Boolean).pop() || "editor-log.txt";
        setStatus(`Saved ${fileName} in the publish logs folder.`);
      } catch (error) {
        setStatus("Could not print the editor log.");
      }
    });

    editorDocument.addEventListener("keydown", handleDeleteShortcut, true);

    editorDocument.querySelector("[data-save]")?.addEventListener("click", () => {
      if (syncTableAssetOverrides(draftPageOverrides)) {
        mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
      }
      if (normalizeInvalidPlacements(draftPageOverrides)) {
        mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
        applyOverrides();
      }
      writePageEditorDraft(pagePath, draftPageOverrides);
      setStatus("Draft saved in this browser.");
    });

    editorDocument.querySelector("[data-toggle-structure]")?.addEventListener("click", () => {
      structureMapEnabled = !structureMapEnabled;
      syncStructureMapState();
      setStatus(
        structureMapEnabled
          ? "Structure map is on. Panels and widgets are outlined on the page."
          : "Structure map is off."
      );
    });

    editorDocument.addEventListener("click", (event) => {
      if (isDomElement(event.target) && event.target.matches("[data-toggle-editing]")) {
        event.preventDefault();
        event.stopPropagation();
        const nextEnabled = !editingEnabled;
        event.target.textContent = nextEnabled ? "Disable editing" : "Enable editing";
        event.target.setAttribute("aria-pressed", nextEnabled ? "true" : "false");
        setEditingEnabled(nextEnabled, { focusWindow: false });
        return;
      }

      if (!editingEnabled || !selectedNode || !isDomElement(event.target)) {
        return;
      }

      const debugPanel = editorDocument.getElementById("editor-debug-panel");
      const clickedInsideDebugDetails =
        debugPanel instanceof HTMLElement && debugPanel.contains(event.target);

      if (!clickedInsideDebugDetails) {
        clearSelectedElement();
        setStatus("Selection cleared.");
      }
    });

    mergeOverlay.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    insertOverlay.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    insertOverlay.addEventListener("click", (event) => {
      const targetNode =
        event.target instanceof Element ? event.target.closest("[data-insert-parent-key][data-insert-index]") : null;
      if (!(targetNode instanceof HTMLElement) || spawnAssetType !== "border") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      spawnBorderAssetAtPlacement(
        targetNode.getAttribute("data-insert-parent-key") || "",
        targetNode.getAttribute("data-insert-index") || "0"
      );
    });

    mergeOverlay.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const targetNode =
        event.target instanceof Element ? event.target.closest("[data-merge-key]") : null;
      if (!(targetNode instanceof HTMLElement)) {
        return;
      }

      const candidateKey = targetNode.getAttribute("data-merge-key") || "";
      if (!candidateKey) {
        return;
      }

      if (mergeCandidateKeys.has(candidateKey)) {
        mergeCandidateKeys.delete(candidateKey);
      } else {
        mergeCandidateKeys.add(candidateKey);
      }

      highlightSelection();
      setStatus(`${mergeCandidateKeys.size} merge cell(s) selected.`);
    });

    editorDocument.querySelectorAll("[data-move-direction]").forEach((buttonNode) => {
      buttonNode.addEventListener("click", () => {
        const direction = buttonNode.getAttribute("data-move-direction") || "";
        moveSelectedWithinParent(direction);
      });
    });

    editorDocument.querySelector("[data-clear]")?.addEventListener("click", () => {
      if (!selectedKey) {
        return;
      }

      delete draftPageOverrides[selectedKey];
      mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
      applyOverrides();
      syncEditorForm();
      highlightSelection();
      writePageEditorDraft(pagePath, draftPageOverrides);
      setStatus("Cleared the selected element override.");
    });

    editorDocument.querySelector("[data-reset]")?.addEventListener("click", () => {
      draftPageOverrides = {};
      mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
      clearPageEditorDraft(pagePath);
      applyOverrides();
      refreshSelection(selectedNode);
      setStatus("Reset this page back to the saved source version.");
    });

    editorDocument.querySelector("[data-submit]")?.addEventListener("click", async () => {
      try {
        if (syncTableAssetOverrides(draftPageOverrides)) {
          mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
        }
        if (normalizeInvalidPlacements(draftPageOverrides)) {
          mergedPageOverrides = mergePageEditorMaps(sourcePageOverrides, draftPageOverrides);
          applyOverrides();
        }

        const payload = {
          ...sourceOverridesByPage,
          [pagePath]: mergedPageOverrides,
        };

        if (window.__GDU_EDITOR_APP__ === true && typeof window.__GDU_EDITOR_API_BASE__ === "string") {
          const response = await fetch(`${window.__GDU_EDITOR_API_BASE__}/__editor-api/page-editor-overrides`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload, null, 2),
          });

          if (!response.ok) {
            throw new Error("Failed to save page editor overrides.");
          }

          writePageEditorDraft(pagePath, draftPageOverrides);
          setStatus("Saved into source. Rebuild and deploy when you want it live.");
          return;
        }

        if ("showOpenFilePicker" in window) {
          const [fileHandle] = await window.showOpenFilePicker({
            multiple: false,
            types: [
              {
                description: "JSON",
                accept: {
                  "application/json": [".json"],
                },
              },
            ],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(`${JSON.stringify(payload, null, 2)}\n`);
          await writable.close();
          setStatus("Wrote the source override file. Rebuild and deploy when you want it live.");
          return;
        }

        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setStatus("Copied the source override JSON to your clipboard.");
      } catch (error) {
        setStatus("Submit was cancelled or blocked. Your draft is still local.");
      }
    });

    syncEditorForm();
    syncStructureMapState();
    syncMouseStatePanel();
    syncEditorVisibility();
    syncInsertOverlay();
    syncCriticalFailurePanel();
  };

  window.addEventListener("error", (event) => {
    const error = event.error instanceof Error ? event.error : null;
    const message = error
      ? `${error.name}: ${error.message}`
      : event.message || "Unknown page editor error";
    reportEditorCriticalFailure(message, error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const error = reason instanceof Error ? reason : null;
    const message =
      error
        ? `${error.name}: ${error.message}`
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    reportEditorCriticalFailure(message, error);
  });

  resizeOverlay.querySelectorAll("[data-resize-handle]").forEach((handleNode) => {
    handleNode.addEventListener("pointerdown", (event) => {
      lastPointerState = {
        x: event.clientX,
        y: event.clientY,
        isDown: true,
        pointerId: event.pointerId ?? null,
        targetLabel: "Resize handle",
      };
      syncMouseStatePanel();

      if (!editingEnabled || !selectedNode) {
        return;
      }

      if (isDockedNode(selectedNode)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      activeMovePointerId = null;
      activeMoveState = null;
      if (activeDropTarget) {
        activeDropTarget.classList.remove("page-editor-drop-target");
        activeDropTarget = null;
      }
      document.body.classList.remove("page-editor-moving");
      activeResizeMode = handleNode.getAttribute("data-resize-handle") || "";
      const rect = selectedNode.getBoundingClientRect();
      resizeStartRect = {
        width: rect.width,
        height: rect.height,
        pointerX: event.clientX,
        pointerY: event.clientY,
        existingWidth: getSelectedOverride().styles?.width || getExplicitStyleValue(selectedNode, "width"),
        existingHeight: getSelectedOverride().styles?.height || getExplicitStyleValue(selectedNode, "height"),
      };
      document.body.classList.add("page-editor-resizing");
      handleNode.setPointerCapture?.(event.pointerId);
    });
  });

  document.addEventListener("pointermove", updateResize, true);
  document.addEventListener("pointerup", (event) => {
    lastPointerState = {
      x: event.clientX,
      y: event.clientY,
      isDown: false,
      pointerId: event.pointerId ?? null,
      targetLabel:
        event.target instanceof HTMLElement
          ? describePageEditorNode(getSelectableEditorNode(event.target) || event.target)
          : "",
    };
    stopResize(event);
  }, true);
  document.addEventListener("mouseup", () => {
    lastPointerState.isDown = false;
    clearInteractionState();
  }, true);
  window.addEventListener("mouseup", () => {
    lastPointerState.isDown = false;
    clearInteractionState();
  }, true);
  window.addEventListener("blur", () => {
    lastPointerState.isDown = false;
    clearInteractionState();
  }, true);
  window.addEventListener("resize", () => {
    syncResizeOverlay();
    syncMergeOverlay();
    syncInsertOverlay();
    syncMouseStatePanel();
  });
  window.addEventListener("scroll", () => {
    syncResizeOverlay();
    syncMergeOverlay();
    syncInsertOverlay();
    syncMouseStatePanel();
  }, true);

  const interactionGuard = (event) => {
    if (!editingEnabled) {
      return;
    }

    const target =
      event.target instanceof Element
        ? event.target instanceof HTMLElement
          ? event.target
          : event.target.parentElement
        : null;
    if (!target || !rootNode.contains(target)) {
      return;
    }

    lastPointerState = {
      x: event.clientX || 0,
      y: event.clientY || 0,
      isDown: event.type === "pointerdown" ? true : lastPointerState.isDown,
      pointerId: event.pointerId ?? lastPointerState.pointerId ?? null,
      targetLabel:
        target instanceof HTMLElement
          ? describePageEditorNode(getSelectableEditorNode(target) || target)
          : "",
    };
    syncMouseStatePanel();

    if (
      event.type === "pointerdown" &&
      activeResizeMode &&
      !(target instanceof HTMLElement && target.closest("[data-resize-handle]"))
    ) {
      stopResize(event);
    }

    if (spawnAssetType === "table" && event.type === "click" && !mergeOverlay.contains(target)) {
      spawnAssetType = "";
      setEditorTab("editor");
      event.preventDefault();
      event.stopPropagation();
      spawnTableAssetAtPoint(target, event.clientX, event.clientY);
      return;
    }

    if (spawnAssetType === "border" && event.type === "click" && !mergeOverlay.contains(target)) {
      event.preventDefault();
      event.stopPropagation();
      setStatus("Click one of the page insertion lines to place the border.");
      return;
    }

    if (spawnAssetType === "textbox" && event.type === "click" && !mergeOverlay.contains(target)) {
      spawnAssetType = "";
      setEditorTab("editor");
      event.preventDefault();
      event.stopPropagation();
      spawnTextboxAssetAtPoint(target, event.clientX, event.clientY);
      return;
    }

    const editableNode =
      findBestEditableNodeFromPoint(event.clientX, event.clientY, rootNode) ||
      findBestEditableNode(target, rootNode) ||
      editableNodes.find((node) => node.contains(target));

    if (!editableNode) {
      return;
    }

    if (
      selectedNode &&
      event.type === "click" &&
      (!selectedNode.contains(target) || editableNode !== selectedNode)
    ) {
      if (editableNode && editableNode !== selectedNode) {
        refreshSelection(editableNode);
        setStatus(`Selected ${describePageEditorNode(editableNode)}.`);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      clearSelectedElement();
      setStatus("Selection cleared.");
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      mergeModeEnabled &&
      event.type === "click" &&
      selectedNode &&
      !mergeOverlay.contains(target)
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (
      event.type === "pointerdown" &&
      selectedNode &&
      selectedNode.contains(target) &&
      !resizeOverlay.contains(target) &&
      !target.closest(".page-editor-table-asset__divider, .page-editor-table-asset__subcell-divider, .page-editor-table-asset__row-resize, .page-editor-table-asset__subdivider, .page-editor-table-asset__row-add, .page-editor-table-asset__subrow-add, .page-editor-table-asset__subrow-remove")
    ) {
      activeMovePointerId = event.pointerId;
      activeDropTarget = null;
      lastValidDropTarget = null;
      activeMoveState = null;
      if (isFreeMoveEligible(selectedNode) && selectedNode.parentElement instanceof HTMLElement) {
        const parentNode = selectedNode.parentElement;
        ensurePositionedParent(parentNode);
        const nodeRect = selectedNode.getBoundingClientRect();
        activeMoveState = {
          mode: "free",
          parentNode,
          offsetX: event.clientX - nodeRect.left,
          offsetY: event.clientY - nodeRect.top,
          startX: event.clientX,
          startY: event.clientY,
          startRect: {
            left: nodeRect.left,
            top: nodeRect.top,
            width: nodeRect.width,
            height: nodeRect.height,
          },
          didMove: false,
        };
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.type === "click") {
      refreshSelection(editableNode);
    }
  };

  ["click", "pointerdown", "submit", "change"].forEach((eventName) => {
    document.addEventListener(eventName, interactionGuard, true);
  });

  let activeSubdividerDrag = null;

  document.addEventListener("dblclick", (event) => {
    if (!editingEnabled) {
      return;
    }

    const targetNode = event.target instanceof Element ? event.target.closest(".page-editor-table-asset__cell, .page-editor-table-asset__divider, .page-editor-table-asset__subcell, .page-editor-table-asset__subcell-divider") : null;
    if (!(targetNode instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (targetNode.matches(".page-editor-table-asset__cell")) {
      const rowNode = targetNode.parentElement;
      if (!(rowNode instanceof HTMLElement)) {
        return;
      }

      if (cellHasDockedContent(targetNode)) {
        setStatus("This cell is locked because it already has docked content.");
        return;
      }

      const currentWeight = Number.parseFloat(targetNode.dataset.tableWeight || "1") || 1;
      const leftWeight = Math.max(0.5, currentWeight / 2);
      const rightWeight = Math.max(0.5, currentWeight - leftWeight);
      targetNode.dataset.tableWeight = String(leftWeight);

      const newCellNode = createTableCellNode(rightWeight);

      rowNode.insertBefore(newCellNode, targetNode.nextSibling);
      syncTableRowStructure(rowNode);
      registerEditableSubtree(newCellNode);
      applyOverrides();
      setStatus("Split the selected table cell.");
      return;
    }

    if (targetNode.matches(".page-editor-table-asset__divider")) {
      const rowNode = targetNode.parentElement;
      if (!(rowNode instanceof HTMLElement)) {
        return;
      }

      const children = [...rowNode.children];
      const dividerIndex = children.indexOf(targetNode);
      const leftCell = children[dividerIndex - 1];
      const rightCell = children[dividerIndex + 1];

      if (
        !(leftCell instanceof HTMLElement) ||
        !(rightCell instanceof HTMLElement) ||
        !leftCell.matches(".page-editor-table-asset__cell") ||
        !rightCell.matches(".page-editor-table-asset__cell")
      ) {
        return;
      }

      if (cellHasDockedContent(leftCell) || cellHasDockedContent(rightCell)) {
        setStatus("You cannot merge cells that already contain docked content.");
        return;
      }

      const nextWeight =
        (Number.parseFloat(leftCell.dataset.tableWeight || "1") || 1) +
        (Number.parseFloat(rightCell.dataset.tableWeight || "1") || 1);
      leftCell.dataset.tableWeight = String(nextWeight);
      rightCell.remove();
      syncTableRowStructure(rowNode);
      applyOverrides();
      setStatus("Merged the two table cells.");
      return;
    }

    if (targetNode.matches(".page-editor-table-asset__subcell")) {
      const subrowNode = targetNode.parentElement;
      if (!(subrowNode instanceof HTMLElement)) {
        return;
      }

      if (getTableSubcellDockedChildren(targetNode).length > 0) {
        setStatus("This subrow cell is locked because it already has docked content.");
        return;
      }

      const currentWeight = Number.parseFloat(targetNode.dataset.tableSubcellWeight || "1") || 1;
      const leftWeight = Math.max(0.5, currentWeight / 2);
      const rightWeight = Math.max(0.5, currentWeight - leftWeight);
      targetNode.dataset.tableSubcellWeight = String(leftWeight);

      const newSubcellNode = createTableSubcellNode(rightWeight);
      subrowNode.insertBefore(newSubcellNode, targetNode.nextSibling);
      syncTableSubrowStructure(subrowNode);
      syncTableSubrowLayout(subrowNode);
      registerEditableSubtree(newSubcellNode);
      applyOverrides();
      setStatus("Split the selected subrow cell.");
      return;
    }

    if (targetNode.matches(".page-editor-table-asset__subcell-divider")) {
      const subrowNode = targetNode.parentElement;
      if (!(subrowNode instanceof HTMLElement)) {
        return;
      }

      const children = [...subrowNode.children];
      const dividerIndex = children.indexOf(targetNode);
      const leftSubcell = children[dividerIndex - 1];
      const rightSubcell = children[dividerIndex + 1];

      if (
        !(leftSubcell instanceof HTMLElement) ||
        !(rightSubcell instanceof HTMLElement) ||
        !leftSubcell.matches(".page-editor-table-asset__subcell") ||
        !rightSubcell.matches(".page-editor-table-asset__subcell")
      ) {
        return;
      }

      if (getTableSubcellDockedChildren(leftSubcell).length || getTableSubcellDockedChildren(rightSubcell).length) {
        setStatus("You cannot merge subrow cells that already contain docked content.");
        return;
      }

      const nextWeight =
        (Number.parseFloat(leftSubcell.dataset.tableSubcellWeight || "1") || 1) +
        (Number.parseFloat(rightSubcell.dataset.tableSubcellWeight || "1") || 1);
      leftSubcell.dataset.tableSubcellWeight = String(nextWeight);
      rightSubcell.remove();
      syncTableSubrowStructure(subrowNode);
      syncTableSubrowLayout(subrowNode);
      applyOverrides();
      setStatus("Merged the two subrow cells.");
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (!editingEnabled) {
      return;
    }

    const subrowAddButton = event.target instanceof Element
      ? event.target.closest(".page-editor-table-asset__subrow-add")
      : null;
    if (subrowAddButton instanceof HTMLElement) {
      const subrowNode = subrowAddButton.closest(".page-editor-table-asset__subrow");
      const cellNode = subrowNode?.closest(".page-editor-table-asset__cell");
      if (!(subrowNode instanceof HTMLElement) || !(cellNode instanceof HTMLElement) || subrowHasDockedContent(subrowNode)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const currentWeight = Number.parseFloat(subrowNode.dataset.tableSubrowWeight || "1") || 1;
      const topWeight = Math.max(0.5, currentWeight / 2);
      const bottomWeight = Math.max(0.5, currentWeight - topWeight);
      subrowNode.dataset.tableSubrowWeight = String(topWeight);

      const newSubrowNode = createTableSubrowNode(bottomWeight);
      cellNode.insertBefore(newSubrowNode, subrowNode.nextSibling);
      syncTableCellSubrowStructure(cellNode);
      syncTableCellSubrowLayout(cellNode);
      applyOverrides();
      setStatus("Split the selected subrow.");
      return;
    }

    const subrowRemoveButton = event.target instanceof Element
      ? event.target.closest(".page-editor-table-asset__subrow-remove")
      : null;
    if (subrowRemoveButton instanceof HTMLElement) {
      const subrowNode = subrowRemoveButton.closest(".page-editor-table-asset__subrow");
      const cellNode = subrowNode?.closest(".page-editor-table-asset__cell");
      if (!(subrowNode instanceof HTMLElement) || !(cellNode instanceof HTMLElement)) {
        return;
      }

      const subrows = getTableCellSubrows(cellNode);
      if (subrows.length <= 1 || subrowHasDockedContent(subrowNode)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const removedWeight = Number.parseFloat(subrowNode.dataset.tableSubrowWeight || "1") || 1;
      const subrowIndex = subrows.indexOf(subrowNode);
      const fallbackTarget = subrows[subrowIndex - 1] || subrows[subrowIndex + 1] || null;
      if (fallbackTarget instanceof HTMLElement) {
        const nextWeight = (Number.parseFloat(fallbackTarget.dataset.tableSubrowWeight || "1") || 1) + removedWeight;
        fallbackTarget.dataset.tableSubrowWeight = String(nextWeight);
      }

      subrowNode.remove();
      syncTableCellSubrowStructure(cellNode);
      syncTableCellSubrowLayout(cellNode);
      applyOverrides();
      setStatus("Removed the selected subrow.");
      return;
    }

    const addRowButton = event.target instanceof Element
      ? event.target.closest(".page-editor-table-asset__row-add")
      : null;
    if (!(addRowButton instanceof HTMLElement)) {
      return;
    }

    const tableNode = addRowButton.closest(".page-editor-table-asset");
    const insertAfterIndex = Number.parseInt(addRowButton.dataset.tableAddRowAfter || "", 10);
    if (!(tableNode instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const newRowNode = addTableRowAtIndex(
      tableNode,
      Number.isFinite(insertAfterIndex) ? insertAfterIndex + 1 : null
    );
    if (!(newRowNode instanceof HTMLElement)) {
      return;
    }

    registerEditableSubtree(newRowNode);
    applyOverrides();
    refreshSelection(newRowNode);
    setStatus("Added a new table row.");
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (!editingEnabled) {
      return;
    }

    const rowResizeNode = event.target instanceof Element ? event.target.closest(".page-editor-table-asset__row-resize") : null;
    if (rowResizeNode instanceof HTMLElement) {
      const bodyNode = rowResizeNode.parentElement;
      const tableNode = bodyNode?.closest(".page-editor-table-asset");
      if (!(bodyNode instanceof HTMLElement) || !(tableNode instanceof HTMLElement)) {
        return;
      }

      const rows = getTableBodyRows(tableNode);
      const resizeAfterIndex = Number.parseInt(rowResizeNode.dataset.tableRowResizeAfter || "-1", 10);
      const topRow = rows[resizeAfterIndex];
      const bottomRow = rows[resizeAfterIndex + 1];
      if (!(topRow instanceof HTMLElement) || !(bottomRow instanceof HTMLElement)) {
        return;
      }

      const tableRect = tableNode.getBoundingClientRect();
      if (tableNode.dataset.pageEditorExplicitHeight !== "true" && tableNode.dataset.pageEditorKey) {
        patchNodeStyles(tableNode, tableNode.dataset.pageEditorKey, {
          height: `${Math.max(0, Math.round(tableRect.height))}px`,
        });
      }

      activeRowResizeDrag = {
        tableNode,
        topRow,
        bottomRow,
        pointerY: event.clientY,
        topRect: topRow.getBoundingClientRect(),
        bottomRect: bottomRow.getBoundingClientRect(),
        topWeight: Number.parseFloat(topRow.dataset.tableRowWeight || "1") || 1,
        bottomWeight: Number.parseFloat(bottomRow.dataset.tableRowWeight || "1") || 1,
      };

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const subdividerNode = event.target instanceof Element ? event.target.closest(".page-editor-table-asset__subdivider") : null;
    if (subdividerNode instanceof HTMLElement) {
      const cellNode = subdividerNode.parentElement;
      if (!(cellNode instanceof HTMLElement)) {
        return;
      }

      const children = [...cellNode.children];
      const dividerIndex = children.indexOf(subdividerNode);
      const topSubrow = children[dividerIndex - 1];
      const bottomSubrow = children[dividerIndex + 1];

      if (
        !(topSubrow instanceof HTMLElement) ||
        !(bottomSubrow instanceof HTMLElement) ||
        !topSubrow.matches(".page-editor-table-asset__subrow") ||
        !bottomSubrow.matches(".page-editor-table-asset__subrow")
      ) {
        return;
      }

      activeSubdividerDrag = {
        cellNode,
        topSubrow,
        bottomSubrow,
        pointerY: event.clientY,
        topRect: topSubrow.getBoundingClientRect(),
        bottomRect: bottomSubrow.getBoundingClientRect(),
        topWeight: Number.parseFloat(topSubrow.dataset.tableSubrowWeight || "1") || 1,
        bottomWeight: Number.parseFloat(bottomSubrow.dataset.tableSubrowWeight || "1") || 1,
      };

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const subcellDividerNode = event.target instanceof Element ? event.target.closest(".page-editor-table-asset__subcell-divider") : null;
    if (subcellDividerNode instanceof HTMLElement) {
      const subrowNode = subcellDividerNode.parentElement;
      if (!(subrowNode instanceof HTMLElement)) {
        return;
      }

      const children = [...subrowNode.children];
      const dividerIndex = children.indexOf(subcellDividerNode);
      const leftCell = children[dividerIndex - 1];
      const rightCell = children[dividerIndex + 1];

      if (
        !(leftCell instanceof HTMLElement) ||
        !(rightCell instanceof HTMLElement) ||
        !leftCell.matches(".page-editor-table-asset__subcell") ||
        !rightCell.matches(".page-editor-table-asset__subcell")
      ) {
        return;
      }

      activeDividerDrag = {
        rowNode: subrowNode,
        leftCell,
        rightCell,
        pointerX: event.clientX,
        leftRect: leftCell.getBoundingClientRect(),
        rightRect: rightCell.getBoundingClientRect(),
        leftWeight: Number.parseFloat(leftCell.dataset.tableSubcellWeight || "1") || 1,
        rightWeight: Number.parseFloat(rightCell.dataset.tableSubcellWeight || "1") || 1,
        weightKey: "tableSubcellWeight",
        syncLayout: () => syncTableSubrowLayout(subrowNode),
      };

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const dividerNode = event.target instanceof Element ? event.target.closest(".page-editor-table-asset__divider") : null;
    if (!(dividerNode instanceof HTMLElement)) {
      return;
    }

    const rowNode = dividerNode.parentElement;
    if (!(rowNode instanceof HTMLElement)) {
      return;
    }

    const children = [...rowNode.children];
    const dividerIndex = children.indexOf(dividerNode);
    const leftCell = children[dividerIndex - 1];
    const rightCell = children[dividerIndex + 1];

    if (
      !(leftCell instanceof HTMLElement) ||
      !(rightCell instanceof HTMLElement) ||
      !leftCell.matches(".page-editor-table-asset__cell") ||
      !rightCell.matches(".page-editor-table-asset__cell")
    ) {
      return;
    }

    activeDividerDrag = {
      rowNode,
      leftCell,
      rightCell,
      pointerX: event.clientX,
      leftRect: leftCell.getBoundingClientRect(),
      rightRect: rightCell.getBoundingClientRect(),
      leftWeight: Number.parseFloat(leftCell.dataset.tableWeight || "1") || 1,
      rightWeight: Number.parseFloat(rightCell.dataset.tableWeight || "1") || 1,
      weightKey: "tableWeight",
      syncLayout: () => syncTableRowLayout(rowNode),
    };

    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("pointermove", (event) => {
    if (activeRowResizeDrag) {
      const deltaY = event.clientY - activeRowResizeDrag.pointerY;
      const totalHeight = activeRowResizeDrag.topRect.height + activeRowResizeDrag.bottomRect.height;
      const nextTopHeight = Math.max(48, Math.min(totalHeight - 48, activeRowResizeDrag.topRect.height + deltaY));
      const totalWeight = activeRowResizeDrag.topWeight + activeRowResizeDrag.bottomWeight;
      const nextTopWeight = Math.max(0.4, (nextTopHeight / totalHeight) * totalWeight);
      const nextBottomWeight = Math.max(0.4, totalWeight - nextTopWeight);

      activeRowResizeDrag.topRow.dataset.tableRowWeight = String(nextTopWeight);
      activeRowResizeDrag.bottomRow.dataset.tableRowWeight = String(nextBottomWeight);
      syncTableAssetHeightLayout(activeRowResizeDrag.tableNode);
      syncTableRowResizeControls(activeRowResizeDrag.tableNode);
      syncTableRowAddControls(activeRowResizeDrag.tableNode);

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (activeSubdividerDrag) {
      const deltaY = event.clientY - activeSubdividerDrag.pointerY;
      const totalHeight = activeSubdividerDrag.topRect.height + activeSubdividerDrag.bottomRect.height;
      const nextTopHeight = Math.max(40, Math.min(totalHeight - 40, activeSubdividerDrag.topRect.height + deltaY));
      const nextBottomHeight = totalHeight - nextTopHeight;
      const totalWeight = activeSubdividerDrag.topWeight + activeSubdividerDrag.bottomWeight;
      const nextTopWeight = Math.max(0.4, (nextTopHeight / totalHeight) * totalWeight);
      const nextBottomWeight = Math.max(0.4, totalWeight - nextTopWeight);

      activeSubdividerDrag.topSubrow.dataset.tableSubrowWeight = String(nextTopWeight);
      activeSubdividerDrag.bottomSubrow.dataset.tableSubrowWeight = String(nextBottomWeight);
      syncTableCellSubrowLayout(activeSubdividerDrag.cellNode);

      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!activeDividerDrag) {
      return;
    }

    const deltaX = event.clientX - activeDividerDrag.pointerX;
    const totalWidth = activeDividerDrag.leftRect.width + activeDividerDrag.rightRect.width;
    const nextLeftWidth = Math.max(48, Math.min(totalWidth - 48, activeDividerDrag.leftRect.width + deltaX));
    const nextRightWidth = totalWidth - nextLeftWidth;
    const totalWeight = activeDividerDrag.leftWeight + activeDividerDrag.rightWeight;
    const nextLeftWeight = Math.max(0.4, (nextLeftWidth / totalWidth) * totalWeight);
    const nextRightWeight = Math.max(0.4, totalWeight - nextLeftWeight);

    const weightKey = activeDividerDrag.weightKey || "tableWeight";
    activeDividerDrag.leftCell.dataset[weightKey] = String(nextLeftWeight);
    activeDividerDrag.rightCell.dataset[weightKey] = String(nextRightWeight);
    if (typeof activeDividerDrag.syncLayout === "function") {
      activeDividerDrag.syncLayout();
    } else {
      syncTableRowLayout(activeDividerDrag.rowNode);
    }

    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("pointermove", (event) => {
    lastPointerState = {
      x: event.clientX || 0,
      y: event.clientY || 0,
      isDown: (event.buttons & 1) === 1,
      pointerId: event.pointerId ?? lastPointerState.pointerId ?? null,
      targetLabel:
        event.target instanceof HTMLElement
          ? describePageEditorNode(getSelectableEditorNode(event.target) || event.target)
          : lastPointerState.targetLabel,
    };

    if (editingEnabled && spawnAssetType) {
      syncInsertOverlay();
    }

    syncMouseStatePanel();
  }, true);

  document.addEventListener("pointerup", () => {
    if (activeRowResizeDrag) {
      syncTableAssetHeightLayout(activeRowResizeDrag.tableNode);
      syncTableRowResizeControls(activeRowResizeDrag.tableNode);
      syncTableRowAddControls(activeRowResizeDrag.tableNode);
      activeRowResizeDrag = null;
      return;
    }

    if (activeSubdividerDrag) {
      syncTableCellSubrowLayout(activeSubdividerDrag.cellNode);
      activeSubdividerDrag = null;
      return;
    }

    if (!activeDividerDrag) {
      return;
    }

    if (typeof activeDividerDrag.syncLayout === "function") {
      activeDividerDrag.syncLayout();
    } else {
      syncTableRowLayout(activeDividerDrag.rowNode);
    }
    activeDividerDrag = null;
  }, true);

  const handleDeleteShortcut = (event) => {
    if (!editingEnabled || !selectedNode) {
      return;
    }

    const target =
      event.target instanceof HTMLElement
        ? event.target
        : event.target instanceof Element
          ? event.target.parentElement
          : null;

    if (target && (target.matches("input, textarea, select") || target.isContentEditable)) {
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      event.stopPropagation();
      deleteSelectedAsset();
    }
  };

  document.addEventListener("keydown", handleDeleteShortcut, true);

  syncAssetCounterFromState();
  applyOverrides();

  window.__GDU_OPEN_EDITOR__ = () => {
    ensureControlWindow();
    bindEditorWindow();
    syncEditorModeButton();
    syncEditorVisibility();
    getEditorDocument()?.defaultView?.focus?.();
  };

  window.__GDU_OPEN_EDITOR__();
  setEditingEnabled(false);
  setEditorTab("editor");
  syncEditorVisibility();
}

function reportPageEditorStartupError(error) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  recordPageEditorCriticalFailure(message);
  console.error("Page editor failed to start.", error);

  if (!(document.body instanceof HTMLElement) || document.querySelector("[data-page-editor-error-banner='true']")) {
    return;
  }

  const bannerNode = document.createElement("div");
  bannerNode.dataset.pageEditorErrorBanner = "true";
  bannerNode.style.position = "fixed";
  bannerNode.style.left = "16px";
  bannerNode.style.right = "16px";
  bannerNode.style.bottom = "16px";
  bannerNode.style.zIndex = "10000";
  bannerNode.style.padding = "12px 14px";
  bannerNode.style.borderRadius = "14px";
  bannerNode.style.border = "1px solid rgba(255, 106, 122, 0.55)";
  bannerNode.style.background = "rgba(42, 18, 23, 0.96)";
  bannerNode.style.color = "#fff0f3";
  bannerNode.style.font = '600 13px/1.4 "Segoe UI", sans-serif';
  bannerNode.style.boxShadow = "0 18px 44px rgba(0, 0, 0, 0.28)";
  bannerNode.textContent = `Page editor failed to start: ${message}`;
  document.body.appendChild(bannerNode);
}

try {
  setupPageEditor();
} catch (error) {
  reportPageEditorStartupError(error);
}

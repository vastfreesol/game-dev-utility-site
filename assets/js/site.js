function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function setResult(resultNode, label, value, explanation) {
  const labelNode = resultNode.querySelector("[data-result-label]");
  const valueNode = resultNode.querySelector("[data-result-value]");
  const explanationNode = resultNode.querySelector("[data-result-explanation]");

  labelNode.textContent = label;
  valueNode.textContent = value;
  explanationNode.textContent = explanation;
}

function attachCalculator(formId, onCalculate) {
  const form = document.getElementById(formId);
  const resultNode = form.querySelector("[data-result]");

  const run = () => onCalculate(form, resultNode);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run();
  });

  form.addEventListener("reset", () => {
    window.setTimeout(run, 0);
  });

  run();
}

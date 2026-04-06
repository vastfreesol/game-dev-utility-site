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

function setupHeader() {
  const header = document.querySelector("[data-site-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");
  const dropdowns = [
    {
      menu: document.querySelector("[data-tools-menu]"),
      toggle: document.querySelector("[data-tools-toggle]"),
    },
    {
      menu: document.querySelector("[data-support-menu]"),
      toggle: document.querySelector("[data-support-toggle]"),
    },
  ].filter((entry) => entry.menu && entry.toggle);

  if (!header) {
    return;
  }

  const syncScrollState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  const closeDropdowns = () => {
    dropdowns.forEach(({ menu, toggle: dropdownToggle }) => {
      menu.classList.remove("is-open");
      dropdownToggle.setAttribute("aria-expanded", "false");
    });
  };

  const closeMenu = () => {
    if (!toggle || !panel) {
      closeDropdowns();
      return;
    }

    toggle.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
    closeDropdowns();
  };

  syncScrollState();
  window.addEventListener("scroll", syncScrollState, { passive: true });

  if (!toggle || !panel) {
    dropdowns.forEach(({ menu, toggle: dropdownToggle }) => {
      dropdownToggle.addEventListener("click", () => {
        if (window.innerWidth > 820) {
          return;
        }

        const isOpen = dropdownToggle.getAttribute("aria-expanded") === "true";
        closeDropdowns();
        dropdownToggle.setAttribute("aria-expanded", String(!isOpen));
        menu.classList.toggle("is-open", !isOpen);
      });
    });

    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    panel.classList.toggle("is-open", !isOpen);
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  dropdowns.forEach(({ menu, toggle: dropdownToggle }) => {
    dropdownToggle.addEventListener("click", () => {
      if (window.innerWidth > 820) {
        return;
      }

      const isOpen = dropdownToggle.getAttribute("aria-expanded") === "true";
      closeDropdowns();
      dropdownToggle.setAttribute("aria-expanded", String(!isOpen));
      menu.classList.toggle("is-open", !isOpen);
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 820) {
      return;
    }

    dropdowns.forEach(({ menu, toggle: dropdownToggle }) => {
      if (!menu.contains(event.target)) {
        menu.classList.remove("is-open");
        dropdownToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  dropdowns.forEach(({ menu, toggle: dropdownToggle }) => {
    menu.addEventListener("mouseenter", () => {
      if (window.innerWidth <= 820) {
        return;
      }

      menu.classList.add("is-open");
      dropdownToggle.setAttribute("aria-expanded", "true");
    });

    menu.addEventListener("mouseleave", () => {
      if (window.innerWidth <= 820) {
        return;
      }

      menu.classList.remove("is-open");
      dropdownToggle.setAttribute("aria-expanded", "false");
    });
  });
}

setupHeader();

(function () {
  const screenEl = () => document.getElementById("country-screen");
  const appEl = () => document.getElementById("app");
  const confirmBtn = () => document.getElementById("country-confirm-btn");

  let pendingCountryId = null;

  function pickerLang() {
    return window.TnewsUi?.getUiLangId?.() || "en";
  }

  function pickerLabels() {
    const lang = pickerLang();
    const sample = window.TnewsCountries?.list?.()?.[0];
    return sample ? window.TnewsCountries.label(sample, lang) : {};
  }

  function updateConfirmButton() {
    const btn = confirmBtn();
    if (!btn) return;
    btn.disabled = !pendingCountryId;
    const L = pickerLabels();
    btn.textContent = L.continue || "Continue";
  }

  function highlightSelected() {
    document.querySelectorAll(".country-card").forEach((card) => {
      card.classList.toggle(
        "country-card--selected",
        card.dataset.countryId === pendingCountryId,
      );
    });
  }

  function pickCountry(id) {
    pendingCountryId = id;
    highlightSelected();
    updateConfirmButton();
  }

  function renderPicker() {
    const screen = screenEl();
    if (!screen || !window.TnewsCountries) return;

    const L = pickerLabels();
    const titleEl = document.getElementById("country-picker-title");
    const hintEl = document.getElementById("country-picker-hint");
    if (titleEl) titleEl.textContent = L.pickTitle || "Choose your country";
    if (hintEl) hintEl.textContent = L.pickHint || "";

    const grid = document.getElementById("country-grid");
    if (!grid) return;

    grid.innerHTML = "";
    window.TnewsCountries.list().forEach((country) => {
      const cl = window.TnewsCountries.label(country, pickerLang());
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "country-card";
      btn.dataset.countryId = country.id;
      btn.innerHTML = `
        <span class="country-card-flag">${country.flag}</span>
        <span class="country-card-brand">${country.brand}</span>
        <span class="country-card-name">${cl.name || country.id}</span>
      `;
      btn.addEventListener("click", () => pickCountry(country.id));
      grid.appendChild(btn);
    });

    highlightSelected();
    updateConfirmButton();
  }

  function setScreen(mode) {
    document.body.dataset.screen = mode;

    const screen = screenEl();
    const app = appEl();
    const isPicker = mode === "picker";

    if (screen) {
      screen.hidden = !isPicker;
      screen.setAttribute("aria-hidden", isPicker ? "false" : "true");
    }
    if (app) {
      app.hidden = isPicker;
      app.setAttribute("aria-hidden", isPicker ? "true" : "false");
    }
  }

  function showPicker() {
    setScreen("picker");
    renderPicker();
  }

  function showApp() {
    setScreen("news");
  }

  function selectCountry(id) {
    if (!window.TnewsCountries?.setSelected(id)) return;

    const country = window.TnewsCountries.getCurrent();
    window.TnewsCountries.clearNewsCache();
    window.TnewsCountries.clearWeatherCache();

    if (window.TnewsUi?.setUiLang && country?.defaultUiLang) {
      window.TnewsUi.setUiLang(country.defaultUiLang);
      window.TnewsUi.applyDocumentLocale?.();
    }

    window.TnewsCountries.applyBranding(country);
    showApp();

    if (typeof window.tnewsStartMainApp === "function") {
      window.tnewsStartMainApp({ countryChanged: true });
    }
  }

  function confirmSelection() {
    if (!pendingCountryId) return;
    selectCountry(pendingCountryId);
  }

  function openCountryPicker() {
    pendingCountryId = window.TnewsCountries?.getSelectedId?.() || null;
    showPicker();
    window.scrollTo(0, 0);
  }

  function boot() {
    const id = window.TnewsCountries?.getSelectedId?.();
    if (!id) {
      pendingCountryId = null;
      showPicker();
      return;
    }
    window.TnewsCountries.applyBranding(window.TnewsCountries.getCurrent());
    showApp();
    if (typeof window.tnewsStartMainApp === "function") {
      window.tnewsStartMainApp({ countryChanged: false });
    }
  }

  window.TnewsCountryBoot = {
    boot,
    openCountryPicker,
    selectCountry,
    renderPicker,
    confirmSelection,
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (window.TnewsUi?.applyDocumentLocale) {
      window.TnewsUi.applyDocumentLocale();
    }

    confirmBtn()?.addEventListener("click", confirmSelection);

    boot();
  });
})();

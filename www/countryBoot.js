(function () {
  const screenEl = () => document.getElementById("country-screen");
  const appEl = () => document.getElementById("app");

  function pickerLang() {
    return window.TnewsUi?.getUiLangId?.() || "en";
  }

  function renderPicker() {
    const screen = screenEl();
    if (!screen || !window.TnewsCountries) return;

    const lang = pickerLang();
    const sample = window.TnewsCountries.list()[0];
    const L = sample ? window.TnewsCountries.label(sample, lang) : {};

    const titleEl = document.getElementById("country-picker-title");
    const hintEl = document.getElementById("country-picker-hint");
    if (titleEl) titleEl.textContent = L.pickTitle || "Choose your country";
    if (hintEl) hintEl.textContent = L.pickHint || "";

    const grid = document.getElementById("country-grid");
    if (!grid) return;

    grid.innerHTML = "";
    window.TnewsCountries.list().forEach((country) => {
      const cl = window.TnewsCountries.label(country, lang);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "country-card";
      btn.innerHTML = `
        <span class="country-card-flag">${country.flag}</span>
        <span class="country-card-brand">${country.brand}</span>
        <span class="country-card-name">${cl.name || country.id}</span>
      `;
      btn.addEventListener("click", () => selectCountry(country.id));
      grid.appendChild(btn);
    });
  }

  function showPicker() {
    const screen = screenEl();
    const app = appEl();
    if (screen) {
      screen.hidden = false;
      screen.setAttribute("aria-hidden", "false");
    }
    if (app) {
      app.hidden = true;
      app.setAttribute("aria-hidden", "true");
    }
    renderPicker();
  }

  function showApp() {
    const screen = screenEl();
    const app = appEl();
    if (screen) {
      screen.hidden = true;
      screen.setAttribute("aria-hidden", "true");
    }
    if (app) {
      app.hidden = false;
      app.setAttribute("aria-hidden", "false");
    }
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

  function openCountryPicker() {
    showPicker();
    renderPicker();
  }

  function boot() {
    const id = window.TnewsCountries?.getSelectedId?.();
    if (!id) {
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
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (window.TnewsUi?.applyDocumentLocale) {
      window.TnewsUi.applyDocumentLocale();
    }
    boot();
  });
})();

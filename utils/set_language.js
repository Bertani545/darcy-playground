let language = "en";

export function setLanguage(lang) {
  language = lang;
  localStorage.setItem("lang", language);
}

function getBrowserLanguage() {
  const lang = (navigator.language || "en").substring(0, 2);
  setLanguage(lang)
}

export function initializeLanguage() {
  const l_lang = localStorage.getItem("lang")
  if (l_lang){
    setLanguage(l_lang)
    return;
  }
  getBrowserLanguage();
}

export async function setPageText() {
  const res = await fetch(`../lang/${language}.json`);
  const translations = await res.json();

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.innerHTML = translations[key] || "";
  });
}


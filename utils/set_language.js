let language = "en";
let path = "";

export function setLanguage(lang) {
  language = lang;
  localStorage.setItem("lang", language);
}

function getBrowserLanguage() {
  const lang = (navigator.language || "en").substring(0, 2);
  setLanguage(lang)
}

export function initializeLanguage(lang_path) {
  const l_lang = localStorage.getItem("lang");
  path = lang_path;
  if (l_lang){
    setLanguage(l_lang)
    return language;
  }
  getBrowserLanguage();
  return language;
}

export async function setPageText() {
  const real_path = path.replace("$", language)
  const res = await fetch(real_path);
  const translations = await res.json();

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.innerHTML = translations[key] || "";
  });
}


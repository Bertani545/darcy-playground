let language = "";
let path = "";
let translations = {};

export function getLanguage() {
  return language;
}

export async function setLanguage(lang) {
  if (lang == language) return;
  language = lang;
  localStorage.setItem("lang", language);
  const real_path = path.replace("$", language)
  const res = await fetch(real_path);
  translations = await res.json();
}

async function getBrowserLanguage() {
  const lang = (navigator.language || "en").substring(0, 2);
  return setLanguage(lang)
}

export async function initializeLanguage(lang_path) {
  const l_lang = localStorage.getItem("lang");
  path = lang_path;
  if (l_lang){
    await setLanguage(l_lang)
    return language;
  }
  await getBrowserLanguage();
  return language;
}

export function setPageText() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.innerHTML = translations[key] || "";
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = translations[key] || "";  
  });

}

export function setErrorMessage(el) {
  const key = el.getAttribute("data-i18n-error");
  const text = translations[key] || "";
  el.setCustomValidity(text);
}

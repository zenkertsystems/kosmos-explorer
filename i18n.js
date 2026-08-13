/*
 * Sprachumschaltung fuer Kosmos Explorer.
 *
 * Wird vor solar-system.js geladen. Die Sprachdatei muss synchron dasein, bevor
 * die Anwendung ihre Datenobjekte aufbaut - deshalb wird sie waehrend des
 * Parsens per document.write nachgezogen und nicht per fetch geholt. Das ist
 * hier der einzige Weg, der ohne Bundler und ohne Umbau der Anwendung auskommt,
 * und er greift ausschliesslich beim ersten Seitenaufbau.
 *
 * Deutsch ist die Referenzsprache und liegt im Anwendungscode selbst. Fehlt ein
 * Schluessel in einer Uebersetzung, bleibt der deutsche Text stehen.
 */
(() => {
'use strict';

const LANGS = {
  bg:"Български", cs:"Čeština", da:"Dansk", de:"Deutsch", el:"Ελληνικά",
  en:"English", es:"Español", et:"Eesti", fi:"Suomi", fr:"Français",
  ga:"Gaeilge", hr:"Hrvatski", hu:"Magyar", it:"Italiano", ja:"日本語",
  lt:"Lietuvių", lv:"Latviešu", mt:"Malti", nl:"Nederlands", pl:"Polski",
  pt:"Português", ro:"Română", ru:"Русский", sk:"Slovenčina", sl:"Slovenščina",
  sv:"Svenska", uk:"Українська", zh:"中文"
};
const FALLBACK = "de";
const STORE = "kosmos.lang";

function pick() {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved && LANGS[saved]) return saved;
  } catch (e) { /* privater Modus: dann eben Geraetesprache */ }
  const wanted = (navigator.languages && navigator.languages.length)
    ? navigator.languages : [navigator.language || FALLBACK];
  for (const tag of wanted) {
    if (!tag) continue;
    const base = String(tag).toLowerCase().split("-")[0];
    if (LANGS[base]) return base;
  }
  return FALLBACK;
}

const lang = pick();
window.I18N_LANGS = LANGS;
window.I18N_LANG = lang;
window.I18N_FALLBACK = FALLBACK;

// Deutsch braucht keine Datei, die Texte stehen bereits im Anwendungscode.
if (lang !== FALLBACK) {
  document.write('<script src="i18n/' + lang + '.js"><\/script>');
}

/** Setzt die gespeicherte Sprache und laedt neu. */
window.setLanguage = function (next) {
  if (!LANGS[next] || next === window.I18N_LANG) return;
  try { localStorage.setItem(STORE, next); } catch (e) { /* nicht kritisch */ }
  location.reload();
};

/**
 * Uebersetzt Elemente mit data-i18n (Textinhalt) bzw. data-i18n-html (Markup).
 * Wird nach dem Laden aufgerufen und ist gefahrlos mehrfach ausfuehrbar.
 */
window.applyDomI18n = function () {
  const d = window.I18N_DATA;
  if (!d || !d.ui) return;
  document.documentElement.lang = window.I18N_LANG;
  if (d.dir) document.documentElement.dir = d.dir;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = d.ui[el.getAttribute("data-i18n")];
    if (typeof v === "string") el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const v = d.ui[el.getAttribute("data-i18n-html")];
    if (typeof v === "string") el.innerHTML = v;
  });
  document.querySelectorAll("[data-i18n-attr]").forEach(el => {
    // Format: "aria-label:schluessel;title:schluessel"
    el.getAttribute("data-i18n-attr").split(";").forEach(pair => {
      const [attr, key] = pair.split(":");
      const v = d.ui[key];
      if (attr && typeof v === "string") el.setAttribute(attr.trim(), v);
    });
  });
  if (d.ui["page.title"]) document.title = d.ui["page.title"];
};

/** Baut das Sprachmenue und haengt es an das uebergebene Element an. */
window.buildLanguageMenu = function (host) {
  if (!host) return;
  const sel = document.createElement("select");
  sel.className = "lang-select";
  sel.setAttribute("aria-label", (window.I18N_DATA && window.I18N_DATA.ui
    && window.I18N_DATA.ui["ui.language"]) || "Sprache");
  Object.keys(LANGS).sort((a, b) => LANGS[a].localeCompare(LANGS[b]))
    .forEach(code => {
      const o = document.createElement("option");
      o.value = code;
      o.textContent = LANGS[code];
      if (code === window.I18N_LANG) o.selected = true;
      sel.append(o);
    });
  sel.onchange = e => window.setLanguage(e.target.value);
  host.append(sel);
};
})();

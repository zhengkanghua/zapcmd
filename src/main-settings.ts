import { createApp } from "vue";
import { createPinia } from "pinia";
import AppSettings from "./AppSettings.vue";
import { i18n, setAppLocale } from "./i18n";
import { readSettingsFromStorage } from "./stores/settingsStore";
import "./styles/index.css";

const initialSettings = readSettingsFromStorage();
setAppLocale(initialSettings.general.language);

createApp(AppSettings).use(createPinia()).use(i18n).mount("#app");

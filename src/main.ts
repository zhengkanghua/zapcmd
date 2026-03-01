import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";
import { i18n, setAppLocale } from "./i18n";
import { readSettingsFromStorage } from "./stores/settingsStore";
import "./styles.css";

const initialSettings = readSettingsFromStorage();
setAppLocale(initialSettings.general.language);

createApp(App).use(createPinia()).use(i18n).mount("#app");

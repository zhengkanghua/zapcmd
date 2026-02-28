const HOTKEY_MODIFIER_ORDER = ["Ctrl", "Cmd", "Alt", "Shift"] as const;

export function normalizeHotkeyKeyToken(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return "";
  }

  const lower = raw.toLowerCase();
  if (lower === "ctrl" || lower === "control") {
    return "Ctrl";
  }
  if (lower === "cmd" || lower === "command" || lower === "meta") {
    return "Cmd";
  }
  if (lower === "alt" || lower === "option") {
    return "Alt";
  }
  if (lower === "shift") {
    return "Shift";
  }
  if (lower === "esc") {
    return "Escape";
  }
  if (lower === " ") {
    return "Space";
  }
  if (lower === "arrowup") {
    return "ArrowUp";
  }
  if (lower === "arrowdown") {
    return "ArrowDown";
  }
  if (lower === "arrowleft") {
    return "ArrowLeft";
  }
  if (lower === "arrowright") {
    return "ArrowRight";
  }
  if (lower === "enter") {
    return "Enter";
  }
  if (lower === "tab") {
    return "Tab";
  }
  if (lower === "backspace") {
    return "Backspace";
  }
  if (lower === "delete" || lower === "del") {
    return "Delete";
  }
  if (lower === "space" || lower === "spacebar") {
    return "Space";
  }
  if (/^f\d{1,2}$/i.test(raw)) {
    return raw.toUpperCase();
  }
  if (raw.length === 1) {
    return raw.toUpperCase();
  }
  return raw[0].toUpperCase() + raw.slice(1);
}

export function hotkeyMatches(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey
    .split("+")
    .map((part) => normalizeHotkeyKeyToken(part))
    .filter(Boolean);
  if (parts.length === 0) {
    return false;
  }

  const key = parts[parts.length - 1];
  const modifiers = new Set(parts.slice(0, -1).map((part) => part.toLowerCase()));
  const eventKey = normalizeHotkeyKeyToken(event.key).toLowerCase();
  if (eventKey !== key.toLowerCase()) {
    return false;
  }

  const needsCtrl = modifiers.has("ctrl") || modifiers.has("cmd") || modifiers.has("meta");
  const needsMeta = modifiers.has("cmd") || modifiers.has("meta");
  const needsAlt = modifiers.has("alt") || modifiers.has("option");
  const needsShift = modifiers.has("shift");

  if (needsCtrl && !(event.ctrlKey || event.metaKey)) {
    return false;
  }
  if (needsMeta && !event.metaKey) {
    return false;
  }
  if (needsAlt !== event.altKey) {
    return false;
  }
  if (needsShift !== event.shiftKey) {
    return false;
  }
  if (!needsCtrl && (event.ctrlKey || event.metaKey)) {
    return false;
  }

  return true;
}

export function hotkeyFromKeyboardEvent(event: KeyboardEvent): string | null {
  const keyToken = normalizeHotkeyKeyToken(event.key);
  if (!keyToken || ["Ctrl", "Cmd", "Alt", "Shift"].includes(keyToken)) {
    return null;
  }

  const modifiers: string[] = [];
  if (event.ctrlKey) {
    modifiers.push("Ctrl");
  }
  if (event.metaKey) {
    modifiers.push("Cmd");
  }
  if (event.altKey) {
    modifiers.push("Alt");
  }
  if (event.shiftKey) {
    modifiers.push("Shift");
  }

  return normalizeHotkey([...modifiers, keyToken].join("+"));
}

export function normalizeHotkey(value: string): string {
  const parts = value
    .split("+")
    .map((part) => normalizeHotkeyKeyToken(part))
    .filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "";
  }

  const modifiers = new Set<string>();
  let mainKey = "";
  for (const part of parts) {
    if (HOTKEY_MODIFIER_ORDER.includes(part as (typeof HOTKEY_MODIFIER_ORDER)[number])) {
      modifiers.add(part);
    } else {
      mainKey = part;
    }
  }

  const orderedModifiers = HOTKEY_MODIFIER_ORDER.filter((key) => modifiers.has(key));
  return [...orderedModifiers, mainKey].filter(Boolean).join("+");
}

export function formatHotkeyForHint(hotkey: string): string {
  const normalized = normalizeHotkey(hotkey);
  if (!normalized) {
    return "-";
  }

  return normalized
    .split("+")
    .map((part) => {
      const key = normalizeHotkeyKeyToken(part);
      if (key === "ArrowUp") {
        return "↑";
      }
      if (key === "ArrowDown") {
        return "↓";
      }
      if (key === "ArrowLeft") {
        return "←";
      }
      if (key === "ArrowRight") {
        return "→";
      }
      if (key === "Enter") {
        return "⏎";
      }
      if (key === "Escape") {
        return "Esc";
      }
      return key;
    })
    .join("+");
}

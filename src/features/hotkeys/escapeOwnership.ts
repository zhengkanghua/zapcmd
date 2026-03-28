const LOCAL_ESCAPE_SCOPE_SELECTOR = '[data-local-escape-scope="true"]';

export function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

interface EscapeOwnershipOptions {
  allowTypingTarget?: EventTarget | null;
  isTypingTarget?: (target: EventTarget | null) => boolean;
}

export function shouldDeferGlobalEscape(
  event: KeyboardEvent,
  options: EscapeOwnershipOptions = {}
): boolean {
  if (event.defaultPrevented) {
    return true;
  }

  const target = event.target;
  if (target instanceof Element && target.closest(LOCAL_ESCAPE_SCOPE_SELECTOR)) {
    return true;
  }

  const isTypingTarget = options.isTypingTarget ?? isTypingElement;
  if (target !== options.allowTypingTarget && isTypingTarget(target)) {
    return true;
  }

  return false;
}

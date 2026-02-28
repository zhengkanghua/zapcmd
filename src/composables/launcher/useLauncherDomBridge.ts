import { ref, type ComponentPublicInstance } from "vue";

type ElementLike = Element | ComponentPublicInstance | null;

interface EnsureResultVisibleOptions {
  drawerOpen: boolean;
  activeIndex: number;
}

interface EnsureStagingVisibleOptions {
  stagingExpanded: boolean;
  stagingActiveIndex: number;
}

export function useLauncherDomBridge() {
  const searchInputRef = ref<HTMLInputElement | null>(null);
  const resultButtons = ref<Array<HTMLElement | null>>([]);
  const searchShellRef = ref<HTMLElement | null>(null);
  const drawerRef = ref<HTMLElement | null>(null);
  const stagingPanelRef = ref<HTMLElement | null>(null);
  const stagingListRef = ref<HTMLElement | null>(null);
  const paramInputRef = ref<HTMLInputElement | null>(null);

  function setResultButtonRef(el: ElementLike, index: number): void {
    resultButtons.value[index] = el instanceof HTMLElement ? el : null;
  }

  function setSearchShellRef(el: ElementLike): void {
    searchShellRef.value = el instanceof HTMLElement ? el : null;
  }

  function setSearchInputRef(el: ElementLike): void {
    searchInputRef.value = el instanceof HTMLInputElement ? el : null;
  }

  function setDrawerRef(el: ElementLike): void {
    drawerRef.value = el instanceof HTMLElement ? el : null;
  }

  function setStagingPanelRef(el: ElementLike): void {
    stagingPanelRef.value = el instanceof HTMLElement ? el : null;
  }

  function setStagingListRef(el: ElementLike): void {
    stagingListRef.value = el instanceof HTMLElement ? el : null;
  }

  function setParamInputRef(el: ElementLike, index: number): void {
    if (index !== 0) {
      return;
    }
    paramInputRef.value = el instanceof HTMLInputElement ? el : null;
  }

  function ensureResultVisible(options: EnsureResultVisibleOptions): void {
    if (!options.drawerOpen) {
      return;
    }
    const drawer = drawerRef.value;
    const target = resultButtons.value[options.activeIndex];
    if (!drawer || !target) {
      return;
    }

    const drawerRect = drawer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (targetRect.top < drawerRect.top) {
      drawer.scrollTop -= drawerRect.top - targetRect.top;
      return;
    }
    if (targetRect.bottom > drawerRect.bottom) {
      drawer.scrollTop += targetRect.bottom - drawerRect.bottom;
    }
  }

  function ensureStagingVisible(options: EnsureStagingVisibleOptions): void {
    if (!options.stagingExpanded) {
      return;
    }
    const list = stagingListRef.value;
    const card = list?.querySelector<HTMLElement>(
      `[data-staging-index="${options.stagingActiveIndex}"] .staging-card`
    );
    if (!list || !card) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (cardRect.top < listRect.top) {
      list.scrollTop -= listRect.top - cardRect.top;
      return;
    }
    if (cardRect.bottom > listRect.bottom) {
      list.scrollTop += cardRect.bottom - listRect.bottom;
    }
  }

  return {
    searchInputRef,
    resultButtons,
    searchShellRef,
    drawerRef,
    stagingPanelRef,
    stagingListRef,
    paramInputRef,
    setResultButtonRef,
    setSearchShellRef,
    setSearchInputRef,
    setDrawerRef,
    setStagingPanelRef,
    setStagingListRef,
    setParamInputRef,
    ensureResultVisible,
    ensureStagingVisible
  };
}

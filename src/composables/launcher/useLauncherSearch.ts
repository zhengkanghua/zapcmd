import { computed, ref, type Ref } from "vue";
import { commandTemplates } from "../../features/commands/commandTemplates";
import type { CommandTemplate } from "../../features/commands/types";

const MAX_FILTERED_RESULTS = 500;

function tokenizeQuery(query: string): string[] {
  return query.split(/\s+/).filter(Boolean);
}

function getSearchText(command: CommandTemplate): string {
  return `${command.title} ${command.description} ${command.preview} ${command.folder} ${command.category}`.toLowerCase();
}

function matchCommand(tokens: string[], command: CommandTemplate): boolean {
  const searchText = getSearchText(command);
  return tokens.every((token) => searchText.includes(token));
}

function scoreCommand(
  query: string,
  tokens: string[],
  command: CommandTemplate,
): number {
  const title = command.title.toLowerCase();
  const description = command.description.toLowerCase();
  const preview = command.preview.toLowerCase();
  const folder = command.folder.toLowerCase();
  const category = command.category.toLowerCase();

  let score = 0;
  if (title.startsWith(query)) {
    score += 120;
  }
  if (title.includes(query)) {
    score += 80;
  }
  if (description.includes(query)) {
    score += 30;
  }
  if (preview.includes(query)) {
    score += 20;
  }
  if (folder.includes(query) || category.includes(query)) {
    score += 10;
  }

  for (const token of tokens) {
    if (title.startsWith(token)) {
      score += 12;
    } else if (title.includes(token)) {
      score += 8;
    }

    if (description.includes(token)) {
      score += 4;
    }
    if (preview.includes(token)) {
      score += 3;
    }
  }

  return score;
}

interface UseLauncherSearchOptions {
  commandSource?: Ref<CommandTemplate[]>;
}

export function useLauncherSearch(options: UseLauncherSearchOptions = {}) {
  const commandSource = options.commandSource ?? ref(commandTemplates);
  const query = ref("");
  const activeIndex = ref(0);

  const filteredResults = computed<CommandTemplate[]>(() => {
    const normalized = query.value.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    const tokens = tokenizeQuery(normalized);

    return commandSource.value
      .map((cmd, index) => ({ cmd, index }))
      .filter((item) => matchCommand(tokens, item.cmd))
      .sort((left, right) => {
        const scoreDiff =
          scoreCommand(normalized, tokens, right.cmd) -
          scoreCommand(normalized, tokens, left.cmd);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return left.index - right.index;
      })
      .slice(0, MAX_FILTERED_RESULTS)
      .map((item) => item.cmd);
  });

  function normalizeActiveIndex(): void {
    if (activeIndex.value >= filteredResults.value.length) {
      activeIndex.value = Math.max(filteredResults.value.length - 1, 0);
    }
  }

  function onQueryInput(value: string): void {
    query.value = value;
    normalizeActiveIndex();
  }

  function clearSearchQueryAndSelection(): void {
    query.value = "";
    activeIndex.value = 0;
  }

  return {
    query,
    activeIndex,
    filteredResults,
    onQueryInput,
    clearSearchQueryAndSelection,
  };
}

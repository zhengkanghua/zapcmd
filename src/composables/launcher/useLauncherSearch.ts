import { computed, ref, type Ref } from "vue";
import type { CommandTemplate } from "../../features/commands/types";

const MAX_FILTERED_RESULTS = 500;

interface SearchableCommand {
  command: CommandTemplate;
  index: number;
  searchText: string;
  title: string;
  description: string;
  preview: string;
  folder: string;
  category: string;
}

interface RankedMatch {
  command: CommandTemplate;
  index: number;
  score: number;
}

function tokenizeQuery(query: string): string[] {
  return query.split(/\s+/).filter(Boolean);
}

function createSearchableCommand(command: CommandTemplate, index: number): SearchableCommand {
  const title = command.title.toLowerCase();
  const description = command.description.toLowerCase();
  const preview = command.preview.toLowerCase().replace(/\s+/g, " ").trim();
  const folder = command.folder.toLowerCase();
  const category = command.category.toLowerCase();

  return {
    command,
    index,
    searchText: `${title} ${description} ${preview} ${folder} ${category}`,
    title,
    description,
    preview,
    folder,
    category
  };
}

function matchCommand(tokens: string[], command: SearchableCommand): boolean {
  return tokens.every((token) => command.searchText.includes(token));
}

function scoreCommand(
  query: string,
  tokens: string[],
  command: SearchableCommand
): number {
  let score = 0;
  if (command.title.startsWith(query)) {
    score += 120;
  }
  if (command.title.includes(query)) {
    score += 80;
  }
  if (command.description.includes(query)) {
    score += 30;
  }
  if (command.preview.includes(query)) {
    score += 20;
  }
  if (command.folder.includes(query) || command.category.includes(query)) {
    score += 10;
  }

  for (const token of tokens) {
    if (command.title.startsWith(token)) {
      score += 12;
    } else if (command.title.includes(token)) {
      score += 8;
    }

    if (command.description.includes(token)) {
      score += 4;
    }
    if (command.preview.includes(token)) {
      score += 3;
    }
  }

  return score;
}

interface UseLauncherSearchOptions {
  commandSource: Ref<CommandTemplate[]>;
}

export function useLauncherSearch(options: UseLauncherSearchOptions) {
  if (!options.commandSource) {
    throw new Error("commandSource is required");
  }

  const { commandSource } = options;
  const query = ref("");
  const activeIndex = ref(0);
  const searchableCommands = computed<SearchableCommand[]>(() =>
    commandSource.value.map((command, index) => createSearchableCommand(command, index))
  );

  const filteredResults = computed<CommandTemplate[]>(() => {
    const normalized = query.value.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    const tokens = tokenizeQuery(normalized);
    const rankedMatches = searchableCommands.value
      .filter((item) => matchCommand(tokens, item))
      .map<RankedMatch>((item) => ({
        command: item.command,
        index: item.index,
        score: scoreCommand(normalized, tokens, item)
      }));

    return rankedMatches
      .sort((left, right) => {
        const scoreDiff = right.score - left.score;
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        return left.index - right.index;
      })
      .slice(0, MAX_FILTERED_RESULTS)
      .map((item) => item.command);
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
    clearSearchQueryAndSelection
  };
}

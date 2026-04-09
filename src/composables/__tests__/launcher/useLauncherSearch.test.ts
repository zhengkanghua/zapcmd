import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";
import type { CommandTemplate } from "../../../features/commands/types";

interface InstrumentedScoreCounter {
  startsWith: number;
  includes: number;
}

function createCommand(id: string, title: string, preview: string, description = title): CommandTemplate {
  return {
    id,
    title,
    description,
    preview,
    folder: title.split(" ")[0] ?? "misc",
    category: "test",
    needsArgs: false
  };
}

function createInstrumentedTitle(value: string, counter: InstrumentedScoreCounter): string {
  const lowered = value.toLowerCase();

  return {
    toLowerCase() {
      return {
        startsWith(query: string) {
          counter.startsWith += 1;
          return lowered.startsWith(query);
        },
        includes(query: string) {
          counter.includes += 1;
          return lowered.includes(query);
        },
        toString() {
          return lowered;
        },
        [Symbol.toPrimitive]() {
          return lowered;
        }
      };
    }
  } as unknown as string;
}

describe("useLauncherSearch", () => {
  it("filters by title/description/preview using case-insensitive contains", () => {
    const search = useLauncherSearch();
    search.onQueryInput("DoCkEr");

    expect(search.filteredResults.value.length).toBeGreaterThan(0);
    expect(search.filteredResults.value.some((item) => item.preview.toLowerCase().includes("docker"))).toBe(
      true
    );
  });

  it("keeps deterministic ranking when relevance score ties", () => {
    const commandSource = ref<CommandTemplate[]>([
      {
        id: "docker-ps",
        title: "docker ps",
        description: "container command",
        preview: "docker ps",
        folder: "docker",
        category: "docker",
        needsArgs: false
      },
      {
        id: "docker-rm",
        title: "docker rm",
        description: "container command",
        preview: "docker rm",
        folder: "docker",
        category: "docker",
        needsArgs: false
      },
      {
        id: "git-status",
        title: "git status",
        description: "git command",
        preview: "git status",
        folder: "git",
        category: "git",
        needsArgs: false
      }
    ]);

    const search = useLauncherSearch({ commandSource });
    search.onQueryInput("docker");

    expect(search.filteredResults.value.map((item) => item.id)).toEqual(["docker-ps", "docker-rm"]);
  });

  it("supports space-separated multi-token AND matching", () => {
    const commandSource = ref<CommandTemplate[]>([
      {
        id: "docker-network-inspect",
        title: "Docker network inspect",
        description: "Inspect docker bridge network",
        preview: "docker network inspect bridge",
        folder: "docker",
        category: "network",
        needsArgs: false
      },
      {
        id: "docker-ps",
        title: "Docker ps",
        description: "List running containers",
        preview: "docker ps",
        folder: "docker",
        category: "container",
        needsArgs: false
      },
      {
        id: "port-inspect",
        title: "Port inspect",
        description: "Inspect local ports",
        preview: "netstat -ano | findstr :8080",
        folder: "network",
        category: "diagnostic",
        needsArgs: false
      }
    ]);

    const search = useLauncherSearch({ commandSource });
    search.onQueryInput("docker inspect");

    expect(search.filteredResults.value.map((item) => item.id)).toEqual(["docker-network-inspect"]);
  });

  it("keeps ranking semantics for short and narrow queries", () => {
    const commandSource = ref<CommandTemplate[]>([
      createCommand("docker-logs", "docker logs", "docker logs"),
      createCommand("docker-ps", "docker ps", "docker ps"),
      createCommand("doctl-auth", "doctl auth", "doctl auth init")
    ]);

    const search = useLauncherSearch({ commandSource });
    search.onQueryInput("do");
    const broad = search.filteredResults.value.map((item) => item.id);

    search.onQueryInput("dock");
    const narrow = search.filteredResults.value.map((item) => item.id);

    expect(broad).not.toEqual(narrow);
    expect(narrow[0]).toBe("docker-logs");
  });

  it("scores each matched candidate once per query", () => {
    const dockerLogsCounter: InstrumentedScoreCounter = { startsWith: 0, includes: 0 };
    const dockerPsCounter: InstrumentedScoreCounter = { startsWith: 0, includes: 0 };
    const doctlCounter: InstrumentedScoreCounter = { startsWith: 0, includes: 0 };
    const commandSource = ref<CommandTemplate[]>([
      {
        ...createCommand("docker-logs", "docker logs", "docker logs"),
        title: createInstrumentedTitle("docker logs", dockerLogsCounter)
      },
      {
        ...createCommand("docker-ps", "docker ps", "docker ps"),
        title: createInstrumentedTitle("docker ps", dockerPsCounter)
      },
      {
        ...createCommand("doctl-auth", "doctl auth", "doctl auth init"),
        title: createInstrumentedTitle("doctl auth", doctlCounter)
      }
    ]);

    const search = useLauncherSearch({ commandSource });
    search.onQueryInput("do");

    expect(search.filteredResults.value.map((item) => item.id)).toEqual([
      "docker-logs",
      "docker-ps",
      "doctl-auth"
    ]);
    expect(dockerLogsCounter).toEqual({ startsWith: 2, includes: 1 });
    expect(dockerPsCounter).toEqual({ startsWith: 2, includes: 1 });
    expect(doctlCounter).toEqual({ startsWith: 2, includes: 1 });
  });

  it("clamps active index when query shrinks result size", () => {
    const search = useLauncherSearch();
    search.onQueryInput("docker");
    search.activeIndex.value = 7;

    search.onQueryInput("docker logs --tail");
    expect(search.filteredResults.value.length).toBe(1);
    expect(search.activeIndex.value).toBe(0);
  });

  it("does not hard-cap broad queries to 8 results", () => {
    const commandSource = ref<CommandTemplate[]>(
      Array.from({ length: 20 }, (_, index) => ({
        id: `git-${index}`,
        title: `命令 ${index}`,
        description: "git command",
        preview: `git reset --soft HEAD~${index}`,
        folder: "@_git",
        category: "git",
        needsArgs: false
      }))
    );

    const search = useLauncherSearch({ commandSource });
    search.onQueryInput("git");

    expect(search.filteredResults.value).toHaveLength(20);
    expect(search.filteredResults.value.some((item) => item.id === "git-12")).toBe(true);
  });

  it("clears query and selection", () => {
    const search = useLauncherSearch();
    search.onQueryInput("git");
    search.activeIndex.value = 2;

    search.clearSearchQueryAndSelection();

    expect(search.query.value).toBe("");
    expect(search.activeIndex.value).toBe(0);
    expect(search.filteredResults.value).toEqual([]);
  });
});

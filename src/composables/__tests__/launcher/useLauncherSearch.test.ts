import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useLauncherSearch } from "../../launcher/useLauncherSearch";
import type { CommandTemplate } from "../../../features/commands/types";

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

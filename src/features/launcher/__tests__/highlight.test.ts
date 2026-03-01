import { describe, expect, it } from "vitest";

import { splitHighlight } from "../highlight";

describe("splitHighlight", () => {
  it("returns plain text segment when keyword is empty", () => {
    expect(splitHighlight("docker logs", "   ")).toEqual([
      { text: "docker logs", match: false }
    ]);
  });

  it("marks matched segments case-insensitively", () => {
    const parts = splitHighlight("Docker docker DOCKER", "docker");
    expect(parts.filter((item) => item.match)).toHaveLength(3);
  });

  it("escapes regex meta characters in keyword", () => {
    const parts = splitHighlight("echo a+b && echo a+b", "a+b");
    const matched = parts.filter((item) => item.match).map((item) => item.text);
    expect(matched).toEqual(["a+b", "a+b"]);
  });

  it("supports space-separated token highlight regardless of token order", () => {
    const parts = splitHighlight("Docker network inspect bridge", "inspect docker");
    const matched = parts.filter((item) => item.match).map((item) => item.text.toLowerCase());
    expect(matched).toEqual(["docker", "inspect"]);
  });
});

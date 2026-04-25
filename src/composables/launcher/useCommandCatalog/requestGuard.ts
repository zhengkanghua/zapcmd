export function createLatestRequestGuard() {
  let requestVersion = 0;

  return {
    start(): number {
      requestVersion += 1;
      return requestVersion;
    },
    isLatest(version: number): boolean {
      return requestVersion === version;
    }
  };
}

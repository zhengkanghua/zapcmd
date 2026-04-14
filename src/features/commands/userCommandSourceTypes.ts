export interface UserCommandFileScanEntry {
  path: string;
  modifiedMs: number;
  size: number;
}

export interface UserCommandFileScanIssue {
  path: string;
  reason: string;
}

export interface UserCommandFileScanResult {
  files: UserCommandFileScanEntry[];
  issues: UserCommandFileScanIssue[];
}

export interface UserCommandJsonFile {
  path: string;
  content: string;
  modifiedMs: number;
  size?: number;
}

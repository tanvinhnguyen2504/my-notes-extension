export enum EMemoType {
  GIT = 'GIT',
  DATABASE = 'DATABASE',
  SHELL = 'SHELL',
  CONFIG = 'CONFIG',
  NOTE = 'NOTE',
}

export enum EMemoSubTypeGit {
  ANY_REPO = 'ANY_REPO',
  THIS_PROJECT = 'THIS_PROJECT',
}

export enum EMemoSubTypeDatabase {
  POSTGRESQL = 'POSTGRESQL',
  MYSQL = 'MYSQL',
  SQLITE = 'SQLITE',
  MONGODB = 'MONGODB',
}

export enum EMemoSubTypeShell {
  BASH_ZSH = 'BASH_ZSH',
  POWERSHELL = 'POWERSHELL',
  FISH = 'FISH',
}

export enum EMemoSubTypeConfig {
  ENV = 'ENV',
  JSON = 'JSON',
  YAML = 'YAML',
  TOML = 'TOML',
}

export enum EMemoSubTypeNote {
  PLAIN = 'PLAIN',
  MARKDOWN = 'MARKDOWN',
}

export type MemoSubType = EMemoSubTypeGit | EMemoSubTypeDatabase | EMemoSubTypeShell | EMemoSubTypeConfig | EMemoSubTypeNote;

export const MEMO_SUBTYPES: Record<EMemoType, readonly MemoSubType[]> = {
  [EMemoType.GIT]: [EMemoSubTypeGit.ANY_REPO, EMemoSubTypeGit.THIS_PROJECT],
  [EMemoType.DATABASE]: [
    EMemoSubTypeDatabase.POSTGRESQL,
    EMemoSubTypeDatabase.MYSQL,
    EMemoSubTypeDatabase.SQLITE,
    EMemoSubTypeDatabase.MONGODB,
  ],
  [EMemoType.SHELL]: [EMemoSubTypeShell.BASH_ZSH, EMemoSubTypeShell.POWERSHELL, EMemoSubTypeShell.FISH],
  [EMemoType.CONFIG]: [EMemoSubTypeConfig.ENV, EMemoSubTypeConfig.JSON, EMemoSubTypeConfig.YAML, EMemoSubTypeConfig.TOML],
  [EMemoType.NOTE]: [EMemoSubTypeNote.PLAIN, EMemoSubTypeNote.MARKDOWN],
};

export const MEMO_TYPE_LABELS: Record<EMemoType, string> = {
  [EMemoType.GIT]: 'Git',
  [EMemoType.DATABASE]: 'SQL',
  [EMemoType.SHELL]: 'Shell',
  [EMemoType.CONFIG]: 'Config',
  [EMemoType.NOTE]: 'Note',
};

export interface IMemo {
  label: string;
  id: string;
  type: EMemoType;
  subType: MemoSubType;
  content: string;
  isPinned: boolean;
  uses: number;
  updatedAt: number | null;
}

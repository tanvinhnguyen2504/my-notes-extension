import { EMemoType, MemoSubType } from '@/src/core/types/memos';
import { EMemoSubTypeConfig, EMemoSubTypeDatabase, EMemoSubTypeGit, EMemoSubTypeNote, EMemoSubTypeShell } from '@/src/core/types/memos';

export const MEMO_TYPE_DOT: Record<EMemoType, string> = {
  [EMemoType.GIT]: 'bg-type-git',
  [EMemoType.DATABASE]: 'bg-type-database',
  [EMemoType.SHELL]: 'bg-type-shell',
  [EMemoType.CONFIG]: 'bg-type-config',
  [EMemoType.NOTE]: 'bg-type-note',
};

export const MEMO_SUBTYPE_LABELS: Record<MemoSubType, string> = {
  [EMemoSubTypeGit.ANY_REPO]: 'Any repo',
  [EMemoSubTypeGit.THIS_PROJECT]: 'This project',
  [EMemoSubTypeDatabase.POSTGRESQL]: 'Postgres',
  [EMemoSubTypeDatabase.MYSQL]: 'MySQL',
  [EMemoSubTypeDatabase.SQLITE]: 'SQLite',
  [EMemoSubTypeDatabase.MONGODB]: 'Mongo',
  [EMemoSubTypeShell.BASH_ZSH]: 'bash / zsh',
  [EMemoSubTypeShell.POWERSHELL]: 'PowerShell',
  [EMemoSubTypeShell.FISH]: 'fish',
  [EMemoSubTypeConfig.ENV]: '.env',
  [EMemoSubTypeConfig.JSON]: 'JSON',
  [EMemoSubTypeConfig.YAML]: 'YAML',
  [EMemoSubTypeConfig.TOML]: 'TOML',
  [EMemoSubTypeNote.PLAIN]: 'Plain',
  [EMemoSubTypeNote.MARKDOWN]: 'Markdown',
};

export const MEMO_BODY_LABELS: Record<EMemoType, string> = {
  [EMemoType.GIT]: 'COMMAND',
  [EMemoType.DATABASE]: 'QUERY',
  [EMemoType.SHELL]: 'COMMAND',
  [EMemoType.CONFIG]: 'CONFIG',
  [EMemoType.NOTE]: 'NOTE',
};

export const MEMO_OPTION_LABELS: Record<EMemoType, string> = {
  [EMemoType.GIT]: 'SCOPE',
  [EMemoType.DATABASE]: 'DATABASE',
  [EMemoType.SHELL]: 'SHELL',
  [EMemoType.CONFIG]: 'FORMAT',
  [EMemoType.NOTE]: 'STYLE',
};

export const MEMO_TITLE_PLACEHOLDERS: Record<EMemoType, string> = {
  [EMemoType.GIT]: 'squash the last 3 commits',
  [EMemoType.DATABASE]: 'find slow queries',
  [EMemoType.SHELL]: 'kill whatever holds port 3000',
  [EMemoType.CONFIG]: 'local .env',
  [EMemoType.NOTE]: 'deploy checklist',
};

export const MEMO_BODY_HINTS: Record<EMemoType, string> = {
  [EMemoType.GIT]: 'One command per line. They run in order.',
  [EMemoType.DATABASE]: 'Parameterise values rather than pasting real ones.',
  [EMemoType.SHELL]: 'One command per line. They run in order.',
  [EMemoType.CONFIG]: 'Use placeholder values, never real credentials.',
  [EMemoType.NOTE]: 'Plain text. Markdown is not rendered.',
};

export const MEMO_EXAMPLE_BODIES: Record<EMemoType, string> = {
  [EMemoType.GIT]: 'git rebase -i HEAD~3',
  [EMemoType.DATABASE]: 'SELECT query, mean_exec_time\nFROM pg_stat_statements\nORDER BY mean_exec_time DESC\nLIMIT 20;',
  [EMemoType.SHELL]: 'lsof -ti:3000 | xargs kill -9',
  [EMemoType.CONFIG]: 'DATABASE_URL=postgres://user:pass@localhost:5432/dev\nPORT=3000',
  [EMemoType.NOTE]: 'Bump version, tag, push tags, then deploy.',
};

// CSV export. toCsv() stays DOM-free so it is testable in plain node; only
// downloadCsv() touches the document.

import { DayKey, Item } from "../core/types.ts";
import { PRIORITY_LABELS, todayKey } from "../core/utils.ts";

const COLUMNS: string[] = ["text", "done", "priority", "dueDate", "updatedAt"];

// RFC 4180: quotes inside a quoted field are doubled. The text column is always
// quoted, being the only free-form one, so a comma in a task cannot shift
// columns.
function quote(value: unknown): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function toCsv(items: Item[]): string {
  const rows: (string | boolean)[][] = items.map((item) => [
    quote(item.text),
    item.done,
    PRIORITY_LABELS[item.priority],
    item.dueDate || "",
    // Blank rather than a made-up date for items predating the field.
    item.updatedAt ? new Date(item.updatedAt).toISOString() : "",
  ]);
  return [COLUMNS, ...rows].map((row) => row.join(",")).join("\r\n");
}

export function csvFilename(reference: DayKey = todayKey()): string {
  return `checklist-${reference}.csv`;
}

// A Blob rather than chrome.downloads, which would cost a new permission. The
// leading BOM is what makes Excel read the file as UTF-8.
export function downloadCsv(items: Item[]): void {
  const blob = new Blob(["﻿", toCsv(items)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFilename();
  link.click();
  URL.revokeObjectURL(url);
}

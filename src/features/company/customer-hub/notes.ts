const KEY = "kob.customerHub.notes.v1";

type NotesMap = Record<string, string>;

function read(): NotesMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as NotesMap;
  } catch {
    return {};
  }
}

function write(map: NotesMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export function getNote(customerId: string): string {
  return read()[customerId] ?? "";
}

export function setNote(customerId: string, value: string) {
  const map = read();
  if (value.trim()) map[customerId] = value;
  else delete map[customerId];
  write(map);
}

const VIEW_KEY = "kob.customerHub.view";
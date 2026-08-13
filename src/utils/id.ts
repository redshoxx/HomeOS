export function newId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 11);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function newUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString();
}

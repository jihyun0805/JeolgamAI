const listeners = new Set<() => void>();

export const coverageEvents = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(): void {
    listeners.forEach((fn) => fn());
  },
};

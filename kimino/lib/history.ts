/**
 * History management for "너의 이름은"
 *
 * Handles localStorage-based history of recommendation results.
 */

import type { HistoryItem } from "./types";

const HISTORY_KEY = "yourname-history";
const MAX_HISTORY_ITEMS = 20;

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HistoryItem[];
  } catch {
    return [];
  }
}

export function addToHistory(item: HistoryItem): void {
  if (typeof window === "undefined") return;

  try {
    const history = getHistory();
    // Add new item at the beginning
    const updated = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save to history:", error);
  }
}

export function removeFromHistory(id: string): void {
  if (typeof window === "undefined") return;

  try {
    const history = getHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to remove from history:", error);
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

// Favorites management
const FAVORITES_KEY = "yourname-favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export function toggleFavorite(name: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const favorites = getFavorites();
    const index = favorites.indexOf(name);

    if (index === -1) {
      favorites.push(name);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true; // Added
    } else {
      favorites.splice(index, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return false; // Removed
    }
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return false;
  }
}

export function isFavorite(name: string): boolean {
  const favorites = getFavorites();
  return favorites.includes(name);
}

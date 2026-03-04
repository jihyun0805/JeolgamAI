function normalizeBoolean(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function isMockDataMode(): boolean {
  const parsed = normalizeBoolean(process.env.MOCK_DATA_MODE);
  // Default to mock-first for frontend demo stability.
  return parsed ?? true;
}

export function isLiveConnectorValidationEnabled(): boolean {
  const live = normalizeBoolean(process.env.LIVE_CONNECTOR_VALIDATION) ?? false;
  return live && !isMockDataMode();
}

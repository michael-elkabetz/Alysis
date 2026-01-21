const TOOL_ICON_MAP: Record<string, string> = {
  snowflake: '/sf.png',
  postgres: '/pg.png',
  http: '/http.png',
};

export function getToolIconUrl(toolName: string | null | undefined): string | null {
  if (!toolName) return null;
  
  const normalizedName = toolName.toLowerCase();
  return TOOL_ICON_MAP[normalizedName] || null;
}

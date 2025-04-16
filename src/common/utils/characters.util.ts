export function generateUsername(name: string): string {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const username = name.trim().toLowerCase().replace(/\s+/g, '_');
  return `${username}_${randomSuffix}`;
}

export function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 5 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
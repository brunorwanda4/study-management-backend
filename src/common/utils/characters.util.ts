export function generateUsername(name: string): string {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const username = name.trim().toLowerCase().replace(/\s+/g, '_');
  return `${username}_${randomSuffix}`;
}
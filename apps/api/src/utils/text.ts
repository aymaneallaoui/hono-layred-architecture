export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'org'
}

export function defaultOrganizationName(name: string | null, email: string): string {
  const base = (name?.trim() || email.split('@')[0]).slice(0, 180)
  return `${base}'s Workspace`
}

import api from '../api';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  type: string;
  category: string;
  tags: string[];
  createdAt: string;
}

interface LibraryResource {
  id: string;
  title: string;
  description: string | null;
  resourceType: string;
  tags: string[];
  fileUrl: string;
  scope: 'PLATFORM' | 'ORGANIZATION';
  organization?: { id: string; name: string } | null;
  createdAt: string;
}

// Library resource types, shown as the category chips.
const RESOURCE_TYPES = ['GUIDE', 'WORKSHEET', 'VIDEO', 'ARTICLE', 'TEMPLATE', 'OTHER'];

const label = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

/**
 * The Resource Library: files the Upllyft team publishes (everyone) and those an
 * organisation publishes (its members). This is what admins upload from the
 * admin/org consoles; the old `/resources` endpoint read community posts instead,
 * so nothing an admin uploaded ever showed up here.
 */
export async function getResources(category?: string): Promise<Resource[]> {
  const resourceType = RESOURCE_TYPES.find((t) => label(t) === category);
  const { data } = await api.get('/library-resources', {
    params: resourceType ? { resourceType } : {},
  });
  const rows: LibraryResource[] = data?.resources ?? [];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.fileUrl,
    type: label(r.resourceType),
    category: r.scope === 'ORGANIZATION' && r.organization ? r.organization.name : 'Upllyft',
    tags: r.tags,
    createdAt: r.createdAt,
  }));
}

export async function getResourceCategories(): Promise<string[]> {
  return RESOURCE_TYPES.map(label);
}

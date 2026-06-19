import { apiClient } from '@upllyft/api-client';

export interface PreVisitTask {
  id: string;
  childId: string;
  type: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'WAIVED';
  label: string;
  dueAt?: string | null;
  completedAt?: string | null;
}

export interface SharedDocument {
  id: string;
  title?: string;
  type?: string;
  document?: { id: string; title?: string; type?: string } | null;
  createdAt?: string;
}

export async function getPreVisitTasks(childId: string): Promise<PreVisitTask[]> {
  const { data } = await apiClient.get(`/children/${childId}/pre-visit-tasks`);
  return data;
}

export async function updatePreVisitTask(
  childId: string,
  taskId: string,
  status: PreVisitTask['status'],
): Promise<PreVisitTask> {
  const { data } = await apiClient.patch(`/children/${childId}/pre-visit-tasks/${taskId}`, { status });
  return data;
}

export async function getMySharedDocuments(): Promise<SharedDocument[]> {
  const { data } = await apiClient.get('/parent/shared-documents');
  return data;
}

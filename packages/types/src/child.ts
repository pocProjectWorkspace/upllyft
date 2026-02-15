export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  gender?: string;
  conditions?: string[];
  parentId: string;
  createdAt: string;
}

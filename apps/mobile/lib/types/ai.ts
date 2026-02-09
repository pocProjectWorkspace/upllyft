export interface ClinicalInsight {
  id: string;
  query: string;
  data: any;
  createdAt: string;
}

export interface ClinicalHistory {
  id: string;
  query: string;
  createdAt: string;
}

export interface ClinicalPlan {
  id: string;
  title: string;
  steps: Array<{ step: string; details: string }>;
  createdAt: string;
}

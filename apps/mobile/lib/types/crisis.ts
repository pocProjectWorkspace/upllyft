export interface CrisisResource {
  id: string;
  name: string;
  type: string;
  category: string[];
  phoneNumber: string | null;
  whatsappNumber: string | null;
  email: string | null;
  website: string | null;
  available24x7: boolean;
  operatingHours: string | null;
  languages: string[];
  country: string;
  state: string | null;
  city: string | null;
  description: string | null;
  specialization: string[];
  isActive: boolean;
}

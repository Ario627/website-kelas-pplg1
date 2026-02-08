export interface MeResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  registrationStatus: string;
  isActive: boolean
  lasLoginAt: Date | null;
  createdAt: Date;
}

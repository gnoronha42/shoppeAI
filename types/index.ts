// Client types
export interface Client {
  id: string;
  name: string;
  ownerName: string;
  platform?: string;
  shopUrl?: string | null;
  followers?: number | null;
  rating?: number | null; // Changed from Decimal to number as usually serialized
  registrationDate?: string | Date | null;
  productCount?: number | null;
  responseRate?: number | null; // Changed from Decimal to number
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// Analysis types
export type AnalysisType = 'account' | 'ads' | 'express' | 'whatsapp-consultivo';

export interface Report {
  id: string;
  clientId: string;
  type: AnalysisType;
  createdAt: string;
  url: string;
  metrics: ReportMetric[];
}

export interface ReportMetric {
  name: string;
  value: number;
  unit?: string;
  change?: number;
  status?: 'positive' | 'negative' | 'neutral';
}

// Navigation types
export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export interface Analyst {
  id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  analyses_count: number;
  created_by?: string;
  created_by_user?: {
    name: string;
  };
}
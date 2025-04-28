// Client types
export interface Client {
  id: string;
  name: string;
  ownerName: string;
}

// Analysis types
export type AnalysisType = 'account' | 'ads';

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
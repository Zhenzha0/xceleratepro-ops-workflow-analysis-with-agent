import { apiRequest } from "./queryClient";

export interface DashboardFilters {
  scopeType: 'dataset' | 'timerange';
  datasetSize?: string;
  datasetOrder?: 'first' | 'last';
  customLimit?: number;
  activityRange?: {
    start?: number;
    end?: number;
  };
  timeRange?: {
    start?: string;
    end?: string;
  };
  equipment?: string;
  status?: string;
  caseIds?: string[];
  _timestamp?: number;
}

export interface AIQueryRequest {
  query: string;
  sessionId: string;
  contextData?: any;
  filters?: any;
}

export interface AIQueryResponse {
  response: string;
  queryType: string;
  contextData?: any;
  suggestedActions?: string[];
  visualizationHint?: string;
}

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  equipment?: string;
  caseId?: string;
}

export interface SemanticSearchResponse {
  results: Array<{
    id: string;
    description: string;
    caseId: string;
    activity: string;
    similarity: number;
  }>;
  contextualInsights: string;
  totalResults: number;
}

export interface CaseComparisonRequest {
  caseAId: string;
  caseBId: string;
}

export const api = {
  // Dashboard APIs
  async getDashboardMetrics() {
    const response = await apiRequest('GET', '/api/dashboard/metrics');
    return response.json();
  },

  async getAnomalyAlerts(limit = 10) {
    const response = await apiRequest('GET', `/api/dashboard/anomalies?limit=${limit}`);
    return response.json();
  },

  async filterDashboardData(filters: DashboardFilters) {
    const response = await apiRequest('POST', '/api/dashboard/filter', filters);
    return response.json();
  },

  // Process APIs
  async getProcessCases(filters?: { limit?: number; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);
    
    const response = await apiRequest('GET', `/api/process/cases?${params.toString()}`);
    return response.json();
  },

  async getProcessCase(caseId: string) {
    const response = await apiRequest('GET', `/api/process/case/${caseId}`);
    return response.json();
  },

  async compareCases(request: CaseComparisonRequest) {
    const response = await apiRequest('POST', '/api/process/compare', request);
    return response.json();
  },

  // AI Analysis APIs
  async analyzeAIQuery(request: AIQueryRequest): Promise<AIQueryResponse> {
    const response = await apiRequest('POST', '/api/ai/analyze', request);
    return response.json();
  },

  async getAIConversations(sessionId: string, limit = 20) {
    const response = await apiRequest('GET', `/api/ai/conversations/${sessionId}?limit=${limit}`);
    return response.json();
  },

  async generateCaseComparison(request: CaseComparisonRequest) {
    const response = await apiRequest('POST', '/api/ai/compare-cases', request);
    return response.json();
  },

  // Semantic Search APIs
  async semanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    const response = await apiRequest('POST', '/api/search/semantic', request);
    return response.json();
  },

  // Anomaly Detection APIs
  async detectAnomalies() {
    const response = await apiRequest('GET', '/api/anomalies/detect');
    return response.json();
  },

  // Data Import APIs
  async importSampleData() {
    const response = await apiRequest('POST', '/api/import-sample-data');
    return response.json();
  },

  // Health Check
  async getHealthStatus() {
    const response = await apiRequest('GET', '/api/health');
    return response.json();
  },

  // Bottleneck Analysis
  async getBottleneckAnalysis() {
    const response = await apiRequest('GET', '/api/bottlenecks');
    return response.json();
  }
};

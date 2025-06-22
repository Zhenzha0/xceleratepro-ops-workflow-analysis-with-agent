import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DashboardMetrics, AnomalyAlert, ProcessCase } from "@shared/schema";

interface DashboardFilters {
  scopeType: 'dataset' | 'timerange';
  datasetSize: string;
  datasetOrder: 'first' | 'last';
  customLimit: number;
  timeRange: { start: string; end: string };
  equipment: string;
  status: string;
  caseIds: string[];
}

export function useDashboardData(filters: DashboardFilters) {
  const queryClient = useQueryClient();

  // Dashboard metrics query
  const metricsQuery = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: () => api.getDashboardMetrics(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Anomaly alerts query
  const anomaliesQuery = useQuery({
    queryKey: ['/api/dashboard/anomalies'],
    queryFn: () => api.getAnomalyAlerts(10),
    refetchInterval: 15000, // Refetch every 15 seconds for real-time anomaly detection
  });

  // Process cases query
  const casesQuery = useQuery({
    queryKey: ['/api/process/cases'],
    queryFn: () => api.getProcessCases({ limit: 50 }),
    refetchInterval: 60000, // Refetch every minute
  });

  // Health status query
  const healthQuery = useQuery({
    queryKey: ['/api/health'],
    queryFn: () => api.getHealthStatus(),
    refetchInterval: 30000,
  });

  // Filtered data query - only runs when filters change
  const filteredDataQuery = useQuery({
    queryKey: ['/api/dashboard/filter', filters],
    queryFn: () => api.filterDashboardData(filters),
    enabled: filters.datasetSize !== 'full' || 
             filters.equipment !== 'all' || 
             filters.status !== 'all' ||
             filters.timeRange.start !== '' ||
             filters.timeRange.end !== '',
  });

  // Auto-import sample data if no data exists
  const autoImportQuery = useQuery({
    queryKey: ['/api/import-check'],
    queryFn: async () => {
      const health = await api.getHealthStatus();
      if (!health.dataImported || health.metrics?.activeCases === 0) {
        try {
          await api.importSampleData();
          // Invalidate all dashboard queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['/api/process'] });
          return { imported: true };
        } catch (error) {
          console.warn('Auto-import failed:', error);
          return { imported: false, error: error.message };
        }
      }
      return { imported: false, reason: 'Data already exists' };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isLoading = metricsQuery.isLoading || 
                   anomaliesQuery.isLoading || 
                   casesQuery.isLoading;

  const hasError = metricsQuery.isError || 
                  anomaliesQuery.isError || 
                  casesQuery.isError;

  const metrics: DashboardMetrics | undefined = metricsQuery.data;
  const anomalies: AnomalyAlert[] = anomaliesQuery.data || [];
  const cases: ProcessCase[] = casesQuery.data || [];
  const filteredData = filteredDataQuery.data;
  const healthStatus = healthQuery.data;

  // Function to manually refresh all data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['/api/process'] });
    queryClient.invalidateQueries({ queryKey: ['/api/health'] });
  };

  // Function to apply new filters
  const applyFilters = (newFilters: DashboardFilters) => {
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/filter'] });
  };

  return {
    // Data
    metrics,
    anomalies,
    cases,
    filteredData,
    healthStatus,
    
    // Loading states
    isLoading,
    hasError,
    isImporting: autoImportQuery.isLoading,
    
    // Individual query states
    metricsLoading: metricsQuery.isLoading,
    anomaliesLoading: anomaliesQuery.isLoading,
    casesLoading: casesQuery.isLoading,
    
    // Error states
    metricsError: metricsQuery.error,
    anomaliesError: anomaliesQuery.error,
    casesError: casesQuery.error,
    
    // Actions
    refreshData,
    applyFilters,
    
    // Import status
    importStatus: autoImportQuery.data,
    importError: autoImportQuery.error,
  };
}

// Hook for real-time anomaly monitoring
export function useAnomalyMonitoring() {
  return useQuery({
    queryKey: ['/api/anomalies/detect'],
    queryFn: () => api.detectAnomalies(),
    refetchInterval: 10000, // Check for new anomalies every 10 seconds
    retry: 3,
  });
}

// Hook for AI conversation history
export function useAIConversations(sessionId: string) {
  return useQuery({
    queryKey: ['/api/ai/conversations', sessionId],
    queryFn: () => api.getAIConversations(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // Consider stale after 5 minutes
  });
}

// Hook for case comparison
export function useCaseComparison(caseAId?: string, caseBId?: string) {
  return useQuery({
    queryKey: ['/api/process/compare', caseAId, caseBId],
    queryFn: () => api.compareCases({ caseAId: caseAId!, caseBId: caseBId! }),
    enabled: !!(caseAId && caseBId),
    retry: false,
  });
}

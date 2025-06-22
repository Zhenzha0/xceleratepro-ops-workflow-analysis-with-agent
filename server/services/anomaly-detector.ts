import { ProcessActivity } from '@shared/schema';

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  reason: string;
  threshold?: {
    expected: number;
    actual: number;
    deviation: number;
  };
}

export class AnomalyDetector {
  private static calculateIQR(values: number[]): { q1: number; q3: number; iqr: number; lower: number; upper: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    return {
      q1,
      q3,
      iqr,
      lower: q1 - 1.5 * iqr,
      upper: q3 + 1.5 * iqr
    };
  }

  private static calculateZScore(value: number, mean: number, stdDev: number): number {
    return Math.abs((value - mean) / stdDev);
  }

  static analyzeProcessingTimeAnomaly(
    activity: ProcessActivity,
    historicalActivities: ProcessActivity[]
  ): AnomalyResult {
    if (!activity.actualDurationS || historicalActivities.length < 10) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient data for analysis'
      };
    }

    // Filter similar activities
    const similarActivities = historicalActivities.filter(
      a => a.activity === activity.activity && 
           a.orgResource === activity.orgResource && 
           a.actualDurationS && 
           a.actualDurationS > 0
    );

    if (similarActivities.length < 5) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient similar activities for comparison'
      };
    }

    const durations = similarActivities.map(a => a.actualDurationS!);
    const stats = this.calculateIQR(durations);
    
    const isOutlier = activity.actualDurationS < stats.lower || activity.actualDurationS > stats.upper;
    
    if (isOutlier) {
      const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const zScore = this.calculateZScore(activity.actualDurationS, mean, stdDev);
      
      const deviationPercent = ((activity.actualDurationS - mean) / mean) * 100;
      
      return {
        isAnomaly: true,
        score: zScore,
        reason: activity.actualDurationS > stats.upper ? 
          `Processing time exceeded expected range by ${Math.abs(deviationPercent).toFixed(1)}%` :
          `Processing time below expected range by ${Math.abs(deviationPercent).toFixed(1)}%`,
        threshold: {
          expected: mean,
          actual: activity.actualDurationS,
          deviation: deviationPercent
        }
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Processing time within normal range'
    };
  }

  static detectEquipmentUtilizationAnomaly(
    resource: string,
    recentActivities: ProcessActivity[],
    historicalBaseline: ProcessActivity[]
  ): AnomalyResult {
    const recentResourceActivities = recentActivities.filter(
      a => a.orgResource === resource && a.actualDurationS
    );
    
    const baselineResourceActivities = historicalBaseline.filter(
      a => a.orgResource === resource && a.actualDurationS
    );

    if (recentResourceActivities.length < 5 || baselineResourceActivities.length < 20) {
      return {
        isAnomaly: false,
        score: 0,
        reason: 'Insufficient data for equipment utilization analysis'
      };
    }

    const recentAvg = recentResourceActivities.reduce((sum, a) => sum + a.actualDurationS!, 0) / 
                     recentResourceActivities.length;
    
    const baselineAvg = baselineResourceActivities.reduce((sum, a) => sum + a.actualDurationS!, 0) / 
                       baselineResourceActivities.length;

    const performanceRatio = recentAvg / baselineAvg;
    const deviationThreshold = 0.2; // 20% deviation threshold

    if (Math.abs(performanceRatio - 1) > deviationThreshold) {
      const efficiency = (1 / performanceRatio) * 100;
      
      return {
        isAnomaly: true,
        score: Math.abs(performanceRatio - 1),
        reason: performanceRatio > 1 ? 
          `Equipment efficiency decreased to ${efficiency.toFixed(1)}% of baseline` :
          `Equipment efficiency increased to ${efficiency.toFixed(1)}% of baseline`,
        threshold: {
          expected: baselineAvg,
          actual: recentAvg,
          deviation: (performanceRatio - 1) * 100
        }
      };
    }

    return {
      isAnomaly: false,
      score: 0,
      reason: 'Equipment utilization within normal range'
    };
  }

  static identifyBottlenecks(activities: ProcessActivity[]): {
    resource: string;
    activity: string;
    avgWaitTime: number;
    queueLength: number;
    severity: 'low' | 'medium' | 'high';
  }[] {
    // Group activities by resource and calculate wait times
    const resourceGroups = new Map<string, ProcessActivity[]>();
    
    activities.forEach(activity => {
      if (activity.orgResource) {
        if (!resourceGroups.has(activity.orgResource)) {
          resourceGroups.set(activity.orgResource, []);
        }
        resourceGroups.get(activity.orgResource)!.push(activity);
      }
    });

    const bottlenecks: {
      resource: string;
      activity: string;
      avgWaitTime: number;
      queueLength: number;
      severity: 'low' | 'medium' | 'high';
    }[] = [];

    resourceGroups.forEach((resourceActivities, resource) => {
      // Sort by scheduled time to calculate wait times between activities
      const sortedActivities = resourceActivities
        .filter(a => a.scheduledTime && a.startTime)
        .sort((a, b) => a.scheduledTime!.getTime() - b.scheduledTime!.getTime());

      if (sortedActivities.length < 2) return;

      let totalWaitTime = 0;
      let waitCount = 0;

      for (let i = 1; i < sortedActivities.length; i++) {
        const prev = sortedActivities[i - 1];
        const curr = sortedActivities[i];
        
        if (prev.completeTime && curr.scheduledTime) {
          const waitTime = (curr.startTime!.getTime() - prev.completeTime.getTime()) / 1000;
          if (waitTime > 0) {
            totalWaitTime += waitTime;
            waitCount++;
          }
        }
      }

      if (waitCount > 0) {
        const avgWaitTime = totalWaitTime / waitCount;
        const queueLength = Math.ceil(avgWaitTime / 60); // Rough estimate
        
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (avgWaitTime > 300) severity = 'high'; // 5+ minutes
        else if (avgWaitTime > 120) severity = 'medium'; // 2+ minutes

        if (avgWaitTime > 60) { // Only report if wait time > 1 minute
          bottlenecks.push({
            resource,
            activity: resourceActivities[0].activity,
            avgWaitTime,
            queueLength,
            severity
          });
        }
      }
    });

    return bottlenecks.sort((a, b) => b.avgWaitTime - a.avgWaitTime);
  }

  static analyzeTemporalPatterns(activities: ProcessActivity[]): {
    hourlyFailureDistribution: Map<number, number>;
    dailyAnomalyCount: Map<string, number>;
    equipmentFailureFrequency: Map<string, number>;
  } {
    const hourlyFailures = new Map<number, number>();
    const dailyAnomalies = new Map<string, number>();
    const equipmentFailures = new Map<string, number>();

    activities.forEach(activity => {
      if (activity.startTime) {
        const hour = activity.startTime.getHours();
        const day = activity.startTime.toISOString().split('T')[0];
        
        // Track failures by hour
        if (activity.status === 'failed') {
          hourlyFailures.set(hour, (hourlyFailures.get(hour) || 0) + 1);
          
          if (activity.orgResource) {
            equipmentFailures.set(
              activity.orgResource, 
              (equipmentFailures.get(activity.orgResource) || 0) + 1
            );
          }
        }
        
        // Track anomalies by day
        if (activity.isAnomaly) {
          dailyAnomalies.set(day, (dailyAnomalies.get(day) || 0) + 1);
        }
      }
    });

    return {
      hourlyFailureDistribution: hourlyFailures,
      dailyAnomalyCount: dailyAnomalies,
      equipmentFailureFrequency: equipmentFailures
    };
  }
}

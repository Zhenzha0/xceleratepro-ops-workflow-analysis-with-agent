import { db } from "../db";
import { processActivities, processEvents } from "@shared/schema";
import { eq, sql, and, between, desc, asc } from "drizzle-orm";

export interface TrendAnalysisResult {
  period: string;
  failureRate: number;
  avgProcessingTime: number;
  totalActivities: number;
  totalFailures: number;
  changeFromPrevious: number;
}

export interface ActivityTrendResult {
  activity: string;
  periods: {
    period: string;
    avgProcessingTime: number;
    failureRate: number;
    totalExecutions: number;
  }[];
  trend: 'improving' | 'deteriorating' | 'stable';
  trendScore: number;
}

export interface EmergingFailureResult {
  failureDescription: string;
  recentCount: number;
  historicalCount: number;
  emergenceScore: number;
  firstSeen: Date;
  latestSeen: Date;
}

export class TrendAnalyzer {
  /**
   * Analyze failure rate trends over time
   */
  static async analyzeFailureRateTrends(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily', filters?: any): Promise<TrendAnalysisResult[]> {
    try {
      const dateFormat = {
        daily: "YYYY-MM-DD",
        weekly: "YYYY-\"W\"WW",
        monthly: "YYYY-MM"
      }[timeframe];

      const trendsQuery = sql`
        WITH period_stats AS (
          SELECT 
            TO_CHAR(timestamp, ${dateFormat}) as period,
            COUNT(*) as total_activities,
            COUNT(CASE WHEN status = 'failure' THEN 1 END) as total_failures,
            AVG(duration) as avg_processing_time,
            ROUND((COUNT(CASE WHEN status = 'failure' THEN 1 END) * 100.0 / COUNT(*)), 2) as failure_rate
          FROM process_activities
          WHERE timestamp >= NOW() - INTERVAL '30 days'
          GROUP BY TO_CHAR(timestamp, ${dateFormat})
          ORDER BY period
        ),
        with_changes AS (
          SELECT 
            *,
            LAG(failure_rate) OVER (ORDER BY period) as prev_failure_rate,
            failure_rate - LAG(failure_rate) OVER (ORDER BY period) as change_from_previous
          FROM period_stats
        )
        SELECT * FROM with_changes
      `;

      const results = await db.execute(trendsQuery);
      
      return results.map((r: any) => ({
        period: r.period,
        failureRate: r.failure_rate,
        avgProcessingTime: Math.round(r.avg_processing_time * 100) / 100,
        totalActivities: r.total_activities,
        totalFailures: r.total_failures,
        changeFromPrevious: r.change_from_previous || 0
      }));
    } catch (error) {
      console.error('Error analyzing failure rate trends:', error);
      return [];
    }
  }

  /**
   * Analyze activity performance trends
   */
  static async analyzeActivityTrends(filters?: any): Promise<ActivityTrendResult[]> {
    try {
      const activityTrendsQuery = sql`
        WITH weekly_activity_stats AS (
          SELECT 
            activity,
            TO_CHAR(timestamp, 'YYYY-"W"WW') as week,
            AVG(duration) as avg_processing_time,
            COUNT(*) as total_executions,
            COUNT(CASE WHEN status = 'failure' THEN 1 END) as failures,
            ROUND((COUNT(CASE WHEN status = 'failure' THEN 1 END) * 100.0 / COUNT(*)), 2) as failure_rate
          FROM process_activities
          WHERE timestamp >= NOW() - INTERVAL '8 weeks'
          GROUP BY activity, TO_CHAR(timestamp, 'YYYY-"W"WW')
          HAVING COUNT(*) >= 5
        ),
        activity_trends AS (
          SELECT 
            activity,
            COUNT(*) as weeks_with_data,
            CORR(ROW_NUMBER() OVER (PARTITION BY activity ORDER BY week), avg_processing_time) as time_trend,
            CORR(ROW_NUMBER() OVER (PARTITION BY activity ORDER BY week), failure_rate) as failure_trend,
            ARRAY_AGG(
              JSON_BUILD_OBJECT(
                'period', week,
                'avgProcessingTime', avg_processing_time,
                'failureRate', failure_rate,
                'totalExecutions', total_executions
              ) ORDER BY week
            ) as periods
          FROM weekly_activity_stats
          GROUP BY activity
          HAVING COUNT(*) >= 3
        )
        SELECT 
          activity,
          periods,
          CASE 
            WHEN time_trend < -0.3 AND failure_trend < -0.3 THEN 'improving'
            WHEN time_trend > 0.3 OR failure_trend > 0.3 THEN 'deteriorating'
            ELSE 'stable'
          END as trend,
          COALESCE(time_trend, 0) + COALESCE(failure_trend, 0) as trend_score
        FROM activity_trends
        ORDER BY trend_score ASC
      `;

      const results = await db.execute(activityTrendsQuery);
      return results.map((r: any) => ({
        activity: r.activity,
        periods: r.periods,
        trend: r.trend,
        trendScore: Math.round((r.trend_score || 0) * 100) / 100
      }));
    } catch (error) {
      console.error('Error analyzing activity trends:', error);
      return [];
    }
  }

  /**
   * Identify emerging failure types
   */
  static async identifyEmergingFailures(filters?: any): Promise<EmergingFailureResult[]> {
    try {
      const emergingFailuresQuery = sql`
        WITH recent_failures AS (
          SELECT 
            unsatisfied_condition_description,
            COUNT(*) as recent_count,
            MIN(timestamp) as first_seen,
            MAX(timestamp) as latest_seen
          FROM process_events
          WHERE lifecycle_state = 'failure' 
            AND timestamp >= NOW() - INTERVAL '14 days'
            AND unsatisfied_condition_description IS NOT NULL
          GROUP BY unsatisfied_condition_description
        ),
        historical_failures AS (
          SELECT 
            unsatisfied_condition_description,
            COUNT(*) as historical_count
          FROM process_events
          WHERE lifecycle_state = 'failure' 
            AND timestamp < NOW() - INTERVAL '14 days'
            AND unsatisfied_condition_description IS NOT NULL
          GROUP BY unsatisfied_condition_description
        )
        SELECT 
          rf.unsatisfied_condition_description as failure_description,
          rf.recent_count,
          COALESCE(hf.historical_count, 0) as historical_count,
          rf.first_seen,
          rf.latest_seen,
          CASE 
            WHEN COALESCE(hf.historical_count, 0) = 0 THEN rf.recent_count * 10
            ELSE ROUND((rf.recent_count * 1.0 / hf.historical_count), 2)
          END as emergence_score
        FROM recent_failures rf
        LEFT JOIN historical_failures hf ON rf.unsatisfied_condition_description = hf.unsatisfied_condition_description
        WHERE rf.recent_count >= 2
        ORDER BY emergence_score DESC
        LIMIT 10
      `;

      const results = await db.execute(emergingFailuresQuery);
      return results.map((r: any) => ({
        failureDescription: r.failure_description,
        recentCount: r.recent_count,
        historicalCount: r.historical_count,
        emergenceScore: r.emergence_score,
        firstSeen: new Date(r.first_seen),
        latestSeen: new Date(r.latest_seen)
      }));
    } catch (error) {
      console.error('Error identifying emerging failures:', error);
      return [];
    }
  }

  /**
   * Analyze correlation between failure types and processing times
   */
  static async analyzeFailureTimeCorrelation(filters?: any): Promise<any[]> {
    try {
      const correlationQuery = sql`
        WITH failure_activities AS (
          SELECT 
            pa.activity,
            pa.duration,
            pe.unsatisfied_condition_description,
            CASE 
              WHEN pe.unsatisfied_condition_description LIKE '%inventory%' OR pe.unsatisfied_condition_description LIKE '%workpiece%' THEN 'inventory_issue'
              WHEN pe.unsatisfied_condition_description LIKE '%state%' OR pe.unsatisfied_condition_description LIKE '%ready%' THEN 'equipment_state'
              WHEN pe.unsatisfied_condition_description LIKE '%light_barrier%' OR pe.unsatisfied_condition_description LIKE '%sensor%' THEN 'sensor_issue'
              ELSE 'other'
            END as failure_category
          FROM process_activities pa
          JOIN process_events pe ON pa.case_id = pe.case_id 
            AND pa.activity = pe.activity
            AND pe.lifecycle_state = 'failure'
        )
        SELECT 
          failure_category,
          COUNT(*) as failure_count,
          AVG(duration) as avg_duration,
          MIN(duration) as min_duration,
          MAX(duration) as max_duration,
          STDDEV(duration) as duration_stddev,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_duration
        FROM failure_activities
        GROUP BY failure_category
        ORDER BY avg_duration DESC
      `;

      const results = await db.execute(correlationQuery);
      return results.map((r: any) => ({
        failureCategory: r.failure_category,
        failureCount: r.failure_count,
        avgDuration: Math.round(r.avg_duration * 100) / 100,
        minDuration: Math.round(r.min_duration * 100) / 100,
        maxDuration: Math.round(r.max_duration * 100) / 100,
        durationStddev: Math.round((r.duration_stddev || 0) * 100) / 100,
        medianDuration: Math.round(r.median_duration * 100) / 100
      }));
    } catch (error) {
      console.error('Error analyzing failure-time correlation:', error);
      return [];
    }
  }

  /**
   * Find upstream activities that lead to failures
   */
  static async analyzeUpstreamFailurePatterns(filters?: any): Promise<any[]> {
    try {
      const upstreamQuery = sql`
        WITH failure_sequences AS (
          SELECT 
            fa.case_id,
            fa.activity as failure_activity,
            fa.timestamp as failure_time,
            pa.activity as upstream_activity,
            pa.timestamp as upstream_time,
            ROW_NUMBER() OVER (PARTITION BY fa.case_id, fa.activity ORDER BY pa.timestamp DESC) as sequence_order
          FROM process_activities fa
          JOIN process_activities pa ON fa.case_id = pa.case_id
          WHERE fa.status = 'failure'
            AND pa.timestamp < fa.timestamp
            AND pa.timestamp >= fa.timestamp - INTERVAL '1 hour'
        )
        SELECT 
          upstream_activity,
          failure_activity,
          COUNT(*) as occurrence_count,
          AVG(EXTRACT(EPOCH FROM (failure_time - upstream_time))) as avg_time_to_failure,
          COUNT(DISTINCT case_id) as affected_cases,
          ROUND((COUNT(*) * 100.0 / (
            SELECT COUNT(*) FROM process_activities WHERE activity = fs.upstream_activity
          )), 2) as failure_correlation_rate
        FROM failure_sequences fs
        WHERE sequence_order <= 3
        GROUP BY upstream_activity, failure_activity
        HAVING COUNT(*) >= 3
        ORDER BY failure_correlation_rate DESC
        LIMIT 20
      `;

      const results = await db.execute(upstreamQuery);
      return results.map((r: any) => ({
        upstreamActivity: r.upstream_activity,
        failureActivity: r.failure_activity,
        occurrenceCount: r.occurrence_count,
        avgTimeToFailure: Math.round(r.avg_time_to_failure * 100) / 100,
        affectedCases: r.affected_cases,
        correlationRate: r.failure_correlation_rate
      }));
    } catch (error) {
      console.error('Error analyzing upstream failure patterns:', error);
      return [];
    }
  }
}
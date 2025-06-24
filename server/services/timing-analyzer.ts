import { db } from "../db";
import { processActivities, processEvents } from "@shared/schema";
import { eq, sql, and, between, desc, asc } from "drizzle-orm";

export interface TimingAnalysisResult {
  activityName: string;
  avgProcessingTime: number;
  minTime: number;
  maxTime: number;
  stdDev: number;
  totalExecutions: number;
  anomalousExecutions: number;
}

export interface TransitionAnalysisResult {
  fromActivity: string;
  toActivity: string;
  avgTransitionTime: number;
  minTransitionTime: number;
  maxTransitionTime: number;
  occurrences: number;
  anomalousTransitions: number;
}

export interface TimePatternResult {
  hour: number;
  day: string;
  avgProcessingTime: number;
  failureCount: number;
  totalActivities: number;
  failureRate: number;
}

export class TimingAnalyzer {
  /**
   * Analyze processing times for all activities
   */
  static async analyzeProcessingTimes(filters?: any): Promise<TimingAnalysisResult[]> {
    try {
      const results = await db
        .select({
          activityName: processActivities.activity,
          avgTime: sql<number>`AVG(${processActivities.duration})`,
          minTime: sql<number>`MIN(${processActivities.duration})`,
          maxTime: sql<number>`MAX(${processActivities.duration})`,
          stdDev: sql<number>`STDDEV(${processActivities.duration})`,
          totalExecutions: sql<number>`COUNT(*)`,
          anomalousCount: sql<number>`COUNT(CASE WHEN ${processActivities.isAnomaly} = true THEN 1 END)`
        })
        .from(processActivities)
        .groupBy(processActivities.activity)
        .orderBy(desc(sql`AVG(${processActivities.duration})`));

      return results.map(r => ({
        activityName: r.activityName,
        avgProcessingTime: Math.round(r.avgTime * 100) / 100,
        minTime: Math.round(r.minTime * 100) / 100,
        maxTime: Math.round(r.maxTime * 100) / 100,
        stdDev: Math.round((r.stdDev || 0) * 100) / 100,
        totalExecutions: r.totalExecutions,
        anomalousExecutions: r.anomalousCount
      }));
    } catch (error) {
      console.error('Error analyzing processing times:', error);
      return [];
    }
  }

  /**
   * Analyze transition times between activities
   */
  static async analyzeTransitionTimes(filters?: any): Promise<TransitionAnalysisResult[]> {
    try {
      // Get sequential activities within each case to analyze transitions
      const transitionQuery = sql`
        WITH activity_transitions AS (
          SELECT 
            a1.activity as from_activity,
            a2.activity as to_activity,
            EXTRACT(EPOCH FROM (a2.timestamp - a1.timestamp)) as transition_time
          FROM process_activities a1
          JOIN process_activities a2 ON a1.case_id = a2.case_id
          WHERE a2.timestamp > a1.timestamp
            AND EXTRACT(EPOCH FROM (a2.timestamp - a1.timestamp)) BETWEEN 1 AND 3600
            AND a1.activity != a2.activity
        )
        SELECT 
          from_activity,
          to_activity,
          AVG(transition_time) as avg_transition_time,
          MIN(transition_time) as min_transition_time,
          MAX(transition_time) as max_transition_time,
          COUNT(*) as occurrences,
          COUNT(CASE WHEN transition_time > (AVG(transition_time) + 2 * STDDEV(transition_time)) THEN 1 END) as anomalous_transitions
        FROM activity_transitions
        GROUP BY from_activity, to_activity
        HAVING COUNT(*) >= 3
        ORDER BY avg_transition_time DESC
        LIMIT 20
      `;

      const results = await db.execute(transitionQuery);
      
      return results.map((r: any) => ({
        fromActivity: r.from_activity,
        toActivity: r.to_activity,
        avgTransitionTime: Math.round(r.avg_transition_time * 100) / 100,
        minTransitionTime: Math.round(r.min_transition_time * 100) / 100,
        maxTransitionTime: Math.round(r.max_transition_time * 100) / 100,
        occurrences: r.occurrences,
        anomalousTransitions: r.anomalous_transitions || 0
      }));
    } catch (error) {
      console.error('Error analyzing transition times:', error);
      return [];
    }
  }

  /**
   * Analyze temporal patterns (time of day, day of week)
   */
  static async analyzeTemporalPatterns(filters?: any): Promise<TimePatternResult[]> {
    try {
      const results = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${processActivities.timestamp})`,
          day: sql<string>`TO_CHAR(${processActivities.timestamp}, 'Day')`,
          avgTime: sql<number>`AVG(${processActivities.duration})`,
          failureCount: sql<number>`COUNT(CASE WHEN ${processActivities.status} = 'failure' THEN 1 END)`,
          totalActivities: sql<number>`COUNT(*)`,
          failureRate: sql<number>`ROUND((COUNT(CASE WHEN ${processActivities.status} = 'failure' THEN 1 END) * 100.0 / COUNT(*)), 2)`
        })
        .from(processActivities)
        .groupBy(sql`EXTRACT(HOUR FROM ${processActivities.timestamp})`, sql`TO_CHAR(${processActivities.timestamp}, 'Day')`)
        .orderBy(sql`EXTRACT(HOUR FROM ${processActivities.timestamp})`);

      return results.map(r => ({
        hour: r.hour,
        day: r.day.trim(),
        avgProcessingTime: Math.round(r.avgTime * 100) / 100,
        failureCount: r.failureCount,
        totalActivities: r.totalActivities,
        failureRate: r.failureRate
      }));
    } catch (error) {
      console.error('Error analyzing temporal patterns:', error);
      return [];
    }
  }

  /**
   * Find cases with abnormal durations
   */
  static async findAbnormalDurationCases(filters?: any): Promise<any[]> {
    try {
      const abnormalCasesQuery = sql`
        WITH case_durations AS (
          SELECT 
            case_id,
            SUM(duration) as total_duration,
            COUNT(*) as activity_count,
            AVG(duration) as avg_activity_duration
          FROM process_activities
          GROUP BY case_id
        ),
        duration_stats AS (
          SELECT 
            AVG(total_duration) as mean_duration,
            STDDEV(total_duration) as stddev_duration
          FROM case_durations
        )
        SELECT 
          cd.case_id,
          cd.total_duration,
          cd.activity_count,
          cd.avg_activity_duration,
          ds.mean_duration,
          ds.stddev_duration,
          ABS(cd.total_duration - ds.mean_duration) / ds.stddev_duration as z_score
        FROM case_durations cd, duration_stats ds
        WHERE ABS(cd.total_duration - ds.mean_duration) / ds.stddev_duration > 2
        ORDER BY z_score DESC
        LIMIT 20
      `;

      const results = await db.execute(abnormalCasesQuery);
      return results;
    } catch (error) {
      console.error('Error finding abnormal duration cases:', error);
      return [];
    }
  }

  /**
   * Analyze wait times before/after specific activity
   */
  static async analyzeWaitTimes(activityName: string, filters?: any): Promise<any> {
    try {
      const waitTimeQuery = sql`
        WITH activity_waits AS (
          SELECT 
            a1.case_id,
            a1.activity as target_activity,
            a1.timestamp as target_timestamp,
            LAG(a1.timestamp) OVER (PARTITION BY a1.case_id ORDER BY a1.timestamp) as prev_timestamp,
            LEAD(a1.timestamp) OVER (PARTITION BY a1.case_id ORDER BY a1.timestamp) as next_timestamp
          FROM process_activities a1
          WHERE a1.activity = ${activityName}
        )
        SELECT 
          AVG(EXTRACT(EPOCH FROM (target_timestamp - prev_timestamp))) as avg_wait_before,
          AVG(EXTRACT(EPOCH FROM (next_timestamp - target_timestamp))) as avg_wait_after,
          COUNT(*) as total_occurrences,
          MIN(EXTRACT(EPOCH FROM (target_timestamp - prev_timestamp))) as min_wait_before,
          MAX(EXTRACT(EPOCH FROM (target_timestamp - prev_timestamp))) as max_wait_before,
          MIN(EXTRACT(EPOCH FROM (next_timestamp - target_timestamp))) as min_wait_after,
          MAX(EXTRACT(EPOCH FROM (next_timestamp - target_timestamp))) as max_wait_after
        FROM activity_waits
        WHERE prev_timestamp IS NOT NULL AND next_timestamp IS NOT NULL
      `;

      const results = await db.execute(waitTimeQuery);
      return results[0] || {};
    } catch (error) {
      console.error('Error analyzing wait times:', error);
      return {};
    }
  }

  /**
   * Find activities with sudden spikes in processing time
   */
  static async findProcessingTimeSpikes(filters?: any): Promise<any[]> {
    try {
      const spikesQuery = sql`
        WITH daily_averages AS (
          SELECT 
            activity,
            DATE(timestamp) as activity_date,
            AVG(duration) as daily_avg_duration,
            COUNT(*) as daily_count
          FROM process_activities
          GROUP BY activity, DATE(timestamp)
          HAVING COUNT(*) >= 3
        ),
        activity_baselines AS (
          SELECT 
            activity,
            AVG(daily_avg_duration) as baseline_avg,
            STDDEV(daily_avg_duration) as baseline_stddev
          FROM daily_averages
          GROUP BY activity
        )
        SELECT 
          da.activity,
          da.activity_date,
          da.daily_avg_duration,
          da.daily_count,
          ab.baseline_avg,
          ab.baseline_stddev,
          (da.daily_avg_duration - ab.baseline_avg) / ab.baseline_stddev as spike_score
        FROM daily_averages da
        JOIN activity_baselines ab ON da.activity = ab.activity
        WHERE (da.daily_avg_duration - ab.baseline_avg) / ab.baseline_stddev > 2
        ORDER BY spike_score DESC
        LIMIT 20
      `;

      const results = await db.execute(spikesQuery);
      return results;
    } catch (error) {
      console.error('Error finding processing time spikes:', error);
      return [];
    }
  }
}
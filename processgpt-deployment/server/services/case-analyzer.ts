import { db } from "../db";
import { processActivities, processEvents, processCases } from "@shared/schema";
import { eq, sql, and, like, desc, asc, inArray } from "drizzle-orm";

export interface CaseAnalysisResult {
  caseId: string;
  totalDuration: number;
  activityCount: number;
  failureCount: number;
  anomalyCount: number;
  status: string;
  sequence: string[];
  failureReasons: string[];
  startTime: Date;
  endTime: Date;
}

export interface FailureSearchResult {
  caseId: string;
  activity: string;
  timestamp: Date;
  failureDescription: string;
  duration: number;
  sequence: string[];
}

export interface MaintenanceRecommendation {
  equipment: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  failureCount: number;
  avgTimeBetweenFailures: number;
  recommendation: string;
  affectedActivities: string[];
}

export class CaseAnalyzer {
  /**
   * Get detailed analysis for a specific case
   */
  static async analyzeCaseById(caseId: string): Promise<CaseAnalysisResult | null> {
    try {
      const caseData = await db
        .select()
        .from(processCases)
        .where(eq(processCases.caseId, caseId))
        .limit(1);

      if (caseData.length === 0) {
        return null;
      }

      const activities = await db
        .select()
        .from(processActivities)
        .where(eq(processActivities.caseId, caseId))
        .orderBy(asc(processActivities.timestamp));

      const failureEvents = await db
        .select()
        .from(processEvents)
        .where(and(
          eq(processEvents.caseId, caseId),
          eq(processEvents.lifecycleState, 'failure')
        ));

      const totalDuration = activities.reduce((sum, act) => sum + act.duration, 0);
      const failureCount = activities.filter(act => act.status === 'failure').length;
      const anomalyCount = activities.filter(act => act.isAnomaly).length;
      
      const sequence = activities.map(act => act.activity);
      const failureReasons = failureEvents
        .filter(event => event.unsatisfiedConditionDescription)
        .map(event => event.unsatisfiedConditionDescription!);

      return {
        caseId: caseData[0].caseId,
        totalDuration: Math.round(totalDuration * 100) / 100,
        activityCount: activities.length,
        failureCount,
        anomalyCount,
        status: caseData[0].status,
        sequence,
        failureReasons,
        startTime: activities[0]?.timestamp || caseData[0].startTime,
        endTime: activities[activities.length - 1]?.timestamp || caseData[0].endTime
      };
    } catch (error) {
      console.error('Error analyzing case by ID:', error);
      return null;
    }
  }

  /**
   * Search for cases with specific failure keywords
   */
  static async searchFailuresByKeyword(keyword: string, limit: number = 20): Promise<FailureSearchResult[]> {
    try {
      const searchQuery = sql`
        SELECT DISTINCT
          pe.case_id,
          pe.activity,
          pe.timestamp,
          pe.unsatisfied_condition_description as failure_description,
          pa.duration,
          ARRAY_AGG(pa2.activity ORDER BY pa2.timestamp) as sequence
        FROM process_events pe
        JOIN process_activities pa ON pe.case_id = pa.case_id AND pe.activity = pa.activity
        JOIN process_activities pa2 ON pe.case_id = pa2.case_id
        WHERE pe.lifecycle_state = 'failure'
          AND pe.unsatisfied_condition_description ILIKE ${`%${keyword}%`}
        GROUP BY pe.case_id, pe.activity, pe.timestamp, pe.unsatisfied_condition_description, pa.duration
        ORDER BY pe.timestamp DESC
        LIMIT ${limit}
      `;

      const results = await db.execute(searchQuery);
      return results.map((r: any) => ({
        caseId: r.case_id,
        activity: r.activity,
        timestamp: new Date(r.timestamp),
        failureDescription: r.failure_description,
        duration: Math.round(r.duration * 100) / 100,
        sequence: r.sequence
      }));
    } catch (error) {
      console.error('Error searching failures by keyword:', error);
      return [];
    }
  }

  /**
   * Analyze failure summary for recent cases
   */
  static async getRecentFailureSummary(caseCount: number = 100): Promise<any> {
    try {
      const summaryQuery = sql`
        WITH recent_cases AS (
          SELECT case_id, start_time
          FROM process_cases
          ORDER BY start_time DESC
          LIMIT ${caseCount}
        ),
        failure_stats AS (
          SELECT 
            COUNT(DISTINCT pe.case_id) as cases_with_failures,
            COUNT(*) as total_failures,
            STRING_AGG(DISTINCT 
              CASE 
                WHEN pe.unsatisfied_condition_description LIKE '%inventory%' OR pe.unsatisfied_condition_description LIKE '%workpiece%' THEN 'Inventory Management'
                WHEN pe.unsatisfied_condition_description LIKE '%state%' OR pe.unsatisfied_condition_description LIKE '%ready%' THEN 'Equipment State'
                WHEN pe.unsatisfied_condition_description LIKE '%light_barrier%' OR pe.unsatisfied_condition_description LIKE '%sensor%' THEN 'Sensor/Detection'
                WHEN pe.unsatisfied_condition_description LIKE '%network%' OR pe.unsatisfied_condition_description LIKE '%connection%' THEN 'Network/Communication'
                ELSE 'Other Technical Issues'
              END, ', '
            ) as failure_categories,
            MODE() WITHIN GROUP (ORDER BY pe.activity) as most_failing_activity,
            AVG(pa.duration) as avg_failure_duration
          FROM recent_cases rc
          JOIN process_events pe ON rc.case_id = pe.case_id
          JOIN process_activities pa ON pe.case_id = pa.case_id AND pe.activity = pa.activity
          WHERE pe.lifecycle_state = 'failure'
        ),
        activity_failures AS (
          SELECT 
            pe.activity,
            COUNT(*) as failure_count,
            ROUND((COUNT(*) * 100.0 / ${caseCount}), 2) as failure_rate
          FROM recent_cases rc
          JOIN process_events pe ON rc.case_id = pe.case_id
          WHERE pe.lifecycle_state = 'failure'
          GROUP BY pe.activity
          ORDER BY failure_count DESC
          LIMIT 5
        )
        SELECT 
          fs.*,
          ${caseCount} as total_cases_analyzed,
          ROUND((fs.cases_with_failures * 100.0 / ${caseCount}), 2) as case_failure_rate,
          ARRAY_AGG(af.activity || ': ' || af.failure_count || ' failures (' || af.failure_rate || '%)') as top_failing_activities
        FROM failure_stats fs, activity_failures af
        GROUP BY fs.cases_with_failures, fs.total_failures, fs.failure_categories, fs.most_failing_activity, fs.avg_failure_duration
      `;

      const results = await db.execute(summaryQuery);
      return results[0] || {};
    } catch (error) {
      console.error('Error getting recent failure summary:', error);
      return {};
    }
  }

  /**
   * Generate maintenance recommendations based on failure patterns
   */
  static async generateMaintenanceRecommendations(): Promise<MaintenanceRecommendation[]> {
    try {
      const maintenanceQuery = sql`
        WITH equipment_failures AS (
          SELECT 
            CASE 
              WHEN activity LIKE '%hbw%' THEN 'High Bay Warehouse (HBW)'
              WHEN activity LIKE '%vgr%' THEN 'Visual Guided Robot (VGR)'
              WHEN activity LIKE '%wt%' THEN 'Workstation Table (WT)'
              WHEN activity LIKE '%ov%' THEN 'Oven (OV)'
              WHEN activity LIKE '%pm%' THEN 'Punch Mill (PM)'
              WHEN activity LIKE '%sort%' THEN 'Sorting Station'
              ELSE 'Other Equipment'
            END as equipment,
            activity,
            COUNT(*) as failure_count,
            AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY activity ORDER BY timestamp)))) as avg_time_between_failures
          FROM process_events
          WHERE lifecycle_state = 'failure'
            AND timestamp >= NOW() - INTERVAL '30 days'
          GROUP BY equipment, activity
          HAVING COUNT(*) >= 3
        ),
        equipment_summary AS (
          SELECT 
            equipment,
            SUM(failure_count) as total_failures,
            ARRAY_AGG(activity) as affected_activities,
            AVG(avg_time_between_failures) as avg_failure_interval,
            CASE 
              WHEN SUM(failure_count) >= 15 THEN 'high'
              WHEN SUM(failure_count) >= 8 THEN 'medium'
              ELSE 'low'
            END as priority
          FROM equipment_failures
          GROUP BY equipment
        )
        SELECT 
          equipment,
          priority,
          total_failures,
          affected_activities,
          avg_failure_interval,
          CASE 
            WHEN priority = 'high' THEN 'Immediate maintenance required - frequent failures indicate critical issues'
            WHEN priority = 'medium' THEN 'Schedule preventive maintenance - moderate failure frequency'
            ELSE 'Monitor closely - low but notable failure pattern'
          END as reason,
          CASE 
            WHEN equipment LIKE '%Warehouse%' THEN 'Check inventory management system, sensor calibration, and storage mechanisms'
            WHEN equipment LIKE '%Robot%' THEN 'Inspect vision system, gripper mechanism, and movement calibration'
            WHEN equipment LIKE '%Workstation%' THEN 'Verify transport mechanism, positioning sensors, and workpiece handling'
            WHEN equipment LIKE '%Oven%' THEN 'Check temperature control, heating elements, and door mechanisms'
            WHEN equipment LIKE '%Mill%' THEN 'Inspect cutting tools, material handling, and precision mechanisms'
            ELSE 'Perform general equipment inspection and sensor verification'
          END as recommendation
        FROM equipment_summary
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            ELSE 3 
          END,
          total_failures DESC
      `;

      const results = await db.execute(maintenanceQuery);
      return results.map((r: any) => ({
        equipment: r.equipment,
        priority: r.priority,
        reason: r.reason,
        failureCount: r.total_failures,
        avgTimeBetweenFailures: Math.round((r.avg_failure_interval || 0) / 3600 * 100) / 100, // Convert to hours
        recommendation: r.recommendation,
        affectedActivities: r.affected_activities
      }));
    } catch (error) {
      console.error('Error generating maintenance recommendations:', error);
      return [];
    }
  }

  /**
   * Find cases with similar failure sequences
   */
  static async findSimilarFailureSequences(targetCaseId: string): Promise<any[]> {
    try {
      // Get the failure sequence for the target case
      const targetSequence = await db
        .select({ activity: processActivities.activity })
        .from(processActivities)
        .where(and(
          eq(processActivities.caseId, targetCaseId),
          eq(processActivities.status, 'failure')
        ))
        .orderBy(asc(processActivities.timestamp));

      if (targetSequence.length === 0) {
        return [];
      }

      const targetActivities = targetSequence.map(s => s.activity);

      // Find other cases with similar failure patterns
      const similarCasesQuery = sql`
        WITH case_failure_sequences AS (
          SELECT 
            case_id,
            ARRAY_AGG(activity ORDER BY timestamp) as failure_sequence,
            COUNT(*) as failure_count
          FROM process_activities
          WHERE status = 'failure'
            AND case_id != ${targetCaseId}
          GROUP BY case_id
          HAVING COUNT(*) > 0
        )
        SELECT 
          case_id,
          failure_sequence,
          failure_count,
          (
            SELECT COUNT(*)
            FROM unnest(failure_sequence) as activity
            WHERE activity = ANY(${JSON.stringify(targetActivities)})
          ) as common_failures,
          ROUND(
            (SELECT COUNT(*) FROM unnest(failure_sequence) as activity WHERE activity = ANY(${JSON.stringify(targetActivities)})) * 100.0 / 
            GREATEST(${targetActivities.length}, array_length(failure_sequence, 1)), 2
          ) as similarity_score
        FROM case_failure_sequences
        WHERE failure_count >= ${Math.max(1, targetActivities.length - 1)}
        ORDER BY similarity_score DESC, common_failures DESC
        LIMIT 10
      `;

      const results = await db.execute(similarCasesQuery);
      return results.map((r: any) => ({
        caseId: r.case_id,
        failureSequence: r.failure_sequence,
        failureCount: r.failure_count,
        commonFailures: r.common_failures,
        similarityScore: r.similarity_score
      }));
    } catch (error) {
      console.error('Error finding similar failure sequences:', error);
      return [];
    }
  }
}
import { storage } from '../storage';

export interface FailurePattern {
  description: string;
  count: number;
  percentage: number;
  affectedCases: string[];
  affectedEquipment: string[];
  examples: string[];
}

export interface FailureAnalysisResult {
  totalFailures: number;
  totalActivities: number;
  failureRate: number;
  commonPatterns: FailurePattern[];
  equipmentFailures: Record<string, number>;
  timeDistribution: Record<string, number>;
}

export class EnhancedFailureAnalyzer {
  /**
   * Analyze actual failure causes from unsatisfied_condition_description
   */
  static async analyzeFailureCauses(filters?: any): Promise<FailureAnalysisResult> {
    let events = await storage.getProcessEvents();
    
    // Apply filters if provided
    if (filters) {
      if (filters.equipment && filters.equipment !== 'all') {
        events = events.filter(e => e.orgResource === filters.equipment);
      }
      if (filters.caseIds && Array.isArray(filters.caseIds) && filters.caseIds.length > 0) {
        events = events.filter(e => filters.caseIds.includes(e.caseId));
      }
    }

    // Get all failure events
    const allFailureEvents = events.filter(event => event.lifecycleState === 'failure');
    
    // Get failure events with descriptions for root cause analysis
    const failureEventsWithDescriptions = allFailureEvents.filter(event => 
      event.unsatisfiedConditionDescription && event.unsatisfiedConditionDescription.trim()
    );

    console.log(`Found ${allFailureEvents.length} total failure events, ${failureEventsWithDescriptions.length} with root cause descriptions`);

    // Analyze actual failure causes from descriptions
    const failureCauses = EnhancedFailureAnalyzer.categorizeFailureCauses(failureEventsWithDescriptions);
    
    // Create patterns prioritizing failure causes over activities
    const causePatterns = Object.entries(failureCauses)
      .map(([cause, data]) => ({
        description: cause,
        count: data.count,
        percentage: failureEventsWithDescriptions.length > 0 ? 
          (data.count / failureEventsWithDescriptions.length) * 100 : 0,
        affectedCases: Array.from(data.cases),
        affectedEquipment: Array.from(data.equipment),
        examples: data.examples
      }))
      .sort((a, b) => b.count - a.count);

    // If no root causes found, fall back to activity analysis
    const activityPatterns = EnhancedFailureAnalyzer.getActivityFailurePatterns(allFailureEvents);
    
    // Prioritize root causes, but include activity patterns if no causes available
    const allPatterns = causePatterns.length > 0 ? causePatterns : activityPatterns;

    // Calculate equipment failures
    const equipmentFailures: Record<string, number> = {};
    allFailureEvents.forEach(event => {
      if (event.orgResource) {
        equipmentFailures[event.orgResource] = (equipmentFailures[event.orgResource] || 0) + 1;
      }
    });

    return {
      totalFailures: allFailureEvents.length,
      totalActivities: events.length,
      failureRate: (allFailureEvents.length / events.length) * 100,
      commonPatterns: allPatterns.slice(0, 10),
      equipmentFailures,
      timeDistribution: { 'Total failures': allFailureEvents.length }
    };
  }

  /**
   * Categorize failure causes from unsatisfied_condition_description
   */
  static categorizeFailureCauses(failureEvents: any[]): Record<string, {
    count: number;
    cases: Set<string>;
    equipment: Set<string>;
    examples: string[];
  }> {
    const causes: Record<string, {
      count: number;
      cases: Set<string>;
      equipment: Set<string>;
      examples: string[];
    }> = {};

    failureEvents.forEach(event => {
      if (!event.unsatisfiedConditionDescription) return;

      const description = event.unsatisfiedConditionDescription;
      let causeCategory = 'Unknown Error';

      // Categorize different types of failures based on actual content analysis
      if (description.includes('High Bay Warehouse does not contain any workpiece')) {
        causeCategory = 'Inventory Management - Missing Workpiece in High Bay Warehouse';
      } else if (description.includes('ConnectionRefusedError') || description.includes('connection refused')) {
        causeCategory = 'Network Connectivity - Service Connection Refused';
      } else if (description.includes('light_barrier') && description.includes('interrupted')) {
        if (description.includes('"interrupted", "required_value": "true"')) {
          causeCategory = 'Sensor Failure - Light Barrier Not Interrupted (Missing Detection)';
        } else if (description.includes('"interrupted", "required_value": "false"')) {
          causeCategory = 'Sensor Failure - Light Barrier Incorrectly Interrupted (False Detection)';
        } else {
          causeCategory = 'Sensor Failure - Light Barrier Status Issues';
        }
      } else if (description.includes('nfc_read_content') && description.includes('business_key')) {
        causeCategory = 'RFID/NFC - Business Key Read Failure';
      } else if (description.includes('state_of_resource') && description.includes('ready')) {
        causeCategory = 'Equipment Status - Resource Not Ready';
      } else if (description.includes('ValueError')) {
        causeCategory = 'Data Validation - Invalid Parameter Values';
      } else if (description.includes('timeout') || description.includes('Timeout')) {
        causeCategory = 'System Performance - Operation Timeout';
      } else if (description.includes('satisfied": False')) {
        // Extract more specific condition failures
        if (description.includes('hbw') && description.includes('state')) {
          causeCategory = 'Equipment Status - High Bay Warehouse Not Ready';
        } else if (description.includes('nfc') && description.includes('business_key')) {
          causeCategory = 'RFID/NFC - Business Key Validation Failed';
        } else {
          causeCategory = 'System Condition - Unsatisfied Operational Requirements';
        }
      } else {
        // Try to extract meaningful parts for complex errors
        if (description.length > 100) {
          causeCategory = `Complex Error - ${description.substring(0, 80)}...`;
        } else {
          causeCategory = description;
        }
      }

      if (!causes[causeCategory]) {
        causes[causeCategory] = {
          count: 0,
          cases: new Set(),
          equipment: new Set(),
          examples: []
        };
      }

      causes[causeCategory].count++;
      causes[causeCategory].cases.add(event.caseId);
      if (event.orgResource) {
        causes[causeCategory].equipment.add(event.orgResource);
      }
      if (causes[causeCategory].examples.length < 3) {
        causes[causeCategory].examples.push(event.caseId);
      }
    });

    return causes;
  }

  /**
   * Get activity-based failure patterns as fallback
   */
  static getActivityFailurePatterns(failureEvents: any[]): FailurePattern[] {
    const activityGroups: Record<string, {
      count: number;
      cases: Set<string>;
      equipment: Set<string>;
      examples: string[];
    }> = {};

    failureEvents.forEach(event => {
      const key = `Activity failure: ${event.activity} on ${event.orgResource || 'unknown equipment'}`;
      
      if (!activityGroups[key]) {
        activityGroups[key] = {
          count: 0,
          cases: new Set(),
          equipment: new Set(),
          examples: []
        };
      }
      
      activityGroups[key].count++;
      activityGroups[key].cases.add(event.caseId);
      if (event.orgResource) {
        activityGroups[key].equipment.add(event.orgResource);
      }
      if (activityGroups[key].examples.length < 3) {
        activityGroups[key].examples.push(event.caseId);
      }
    });

    return Object.entries(activityGroups)
      .map(([description, data]) => ({
        description,
        count: data.count,
        percentage: (data.count / failureEvents.length) * 100,
        affectedCases: Array.from(data.cases),
        affectedEquipment: Array.from(data.equipment),
        examples: data.examples
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get a natural language summary of failure analysis
   */
  static async getFailureSummary(filters?: any): Promise<string> {
    const analysis = await this.analyzeFailureCauses(filters);
    
    if (analysis.totalFailures === 0) {
      return "No failures detected in the analyzed dataset.";
    }

    const topCause = analysis.commonPatterns[0];
    const failureRate = analysis.failureRate.toFixed(2);
    
    let summary = `Analysis of ${analysis.totalFailures} failures (${failureRate}% failure rate):\n\n`;
    
    if (topCause && !topCause.description.startsWith('Activity failure:')) {
      summary += `**Primary Root Cause**: ${topCause.description}\n`;
      summary += `- Occurred ${topCause.count} times (${topCause.percentage.toFixed(1)}% of failures)\n`;
      summary += `- Affected ${topCause.affectedCases.length} cases\n`;
      summary += `- Equipment involved: ${topCause.affectedEquipment.join(', ')}\n\n`;
      
      summary += "**Other Common Causes**:\n";
      analysis.commonPatterns.slice(1, 4).forEach((pattern, index) => {
        if (!pattern.description.startsWith('Activity failure:')) {
          summary += `${index + 2}. ${pattern.description}: ${pattern.count} occurrences\n`;
        }
      });
    } else {
      summary += "**Most Affected Activities**:\n";
      analysis.commonPatterns.slice(0, 5).forEach((pattern, index) => {
        summary += `${index + 1}. ${pattern.description}: ${pattern.count} failures (${pattern.percentage.toFixed(1)}%)\n`;
      });
    }
    
    return summary;
  }
}
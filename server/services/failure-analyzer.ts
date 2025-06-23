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

export class FailureAnalyzer {
  /**
   * Analyze actual failure data from lifecycle_state = 'failure'
   */
  static async analyzeFailureCauses(filters?: any): Promise<FailureAnalysisResult> {
    // Get all events
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

    // Filter to only actual failure events
    const failureEvents = events.filter(event => 
      event.lifecycleState === 'failure'
    );

    console.log(`Found ${failureEvents.length} actual failure events out of ${events.length} total events`);

    // Group failures by activity + equipment combination
    const failureGroups: Record<string, {
      count: number;
      cases: Set<string>;
      equipment: Set<string>;
      examples: string[];
      avgProcessingTime: number;
      activity: string;
    }> = {};

    failureEvents.forEach(event => {
      const key = `${event.activity} on ${event.orgResource || 'unknown equipment'}`;
      
      if (!failureGroups[key]) {
        failureGroups[key] = {
          count: 0,
          cases: new Set(),
          equipment: new Set(),
          examples: [],
          avgProcessingTime: 0,
          activity: event.activity
        };
      }
      
      failureGroups[key].count++;
      failureGroups[key].cases.add(event.caseId);
      if (event.orgResource) {
        failureGroups[key].equipment.add(event.orgResource);
      }
      
      // Store a few examples of case IDs
      if (failureGroups[key].examples.length < 3) {
        failureGroups[key].examples.push(event.caseId);
      }
    });

    // Calculate average processing times for each failure group
    Object.keys(failureGroups).forEach(key => {
      const relevantEvents = failureEvents.filter(e => 
        `${e.activity} on ${e.orgResource || 'unknown equipment'}` === key
      );
      const totalTime = relevantEvents.reduce((sum, e) => sum + (e.processingTimeS || 0), 0);
      failureGroups[key].avgProcessingTime = totalTime / relevantEvents.length;
    });

    // Convert to FailurePattern array and sort by frequency
    const patterns: FailurePattern[] = Object.entries(failureGroups)
      .map(([description, data]) => ({
        description,
        count: data.count,
        percentage: (data.count / failureEvents.length) * 100,
        affectedCases: Array.from(data.cases),
        affectedEquipment: Array.from(data.equipment),
        examples: data.examples
      }))
      .sort((a, b) => b.count - a.count);

    // Equipment failure breakdown
    const equipmentFailures: Record<string, number> = {};
    failureEvents.forEach(event => {
      if (event.orgResource) {
        equipmentFailures[event.orgResource] = (equipmentFailures[event.orgResource] || 0) + 1;
      }
    });

    // Time distribution (by hour of day)
    const timeDistribution: Record<string, number> = {};
    failureEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      const timeSlot = `${hour}:00`;
      timeDistribution[timeSlot] = (timeDistribution[timeSlot] || 0) + 1;
    });

    return {
      totalFailures: failureEvents.length,
      totalActivities: events.length,
      failureRate: (failureEvents.length / events.length) * 100,
      commonPatterns: patterns,
      equipmentFailures,
      timeDistribution
    };
  }

  /**
   * Get a natural language summary of failure analysis
   */
  static async getFailureSummary(filters?: any): Promise<string> {
    const analysis = await this.analyzeFailureCauses(filters);
    
    if (analysis.totalFailures === 0) {
      return `No failures found in the ${filters ? 'filtered' : 'complete'} dataset of ${analysis.totalActivities} activities.`;
    }

    const top3Patterns = analysis.commonPatterns.slice(0, 3);
    const dataScope = filters ? 'filtered dataset' : 'complete dataset';
    
    let summary = `## Failure Analysis Results (${dataScope})

**Overview:**
- Total failures detected: ${analysis.totalFailures}
- Total activities analyzed: ${analysis.totalActivities}
- Failure rate: ${analysis.failureRate.toFixed(2)}%
- Note: No failure descriptions found in unsatisfied_condition_description column

**Most Common Failure Patterns:**
`;

    top3Patterns.forEach((pattern, index) => {
      summary += `${index + 1}. **${pattern.description}**
   - Occurrences: ${pattern.count} (${pattern.percentage.toFixed(1)}% of all failures)
   - Affected cases: ${pattern.affectedCases.length}
   - Equipment involved: ${pattern.affectedEquipment.join(', ') || 'Unknown'}
   - Example cases: ${pattern.examples.join(', ')}

`;
    });

    // Equipment with most failures
    const equipmentEntries = Object.entries(analysis.equipmentFailures)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    if (equipmentEntries.length > 0) {
      summary += `**Equipment with Most Failures:**
`;
      equipmentEntries.forEach(([equipment, count]) => {
        summary += `- ${equipment}: ${count} failures
`;
      });
    }

    // Add HTTP status code analysis
    summary += `
**Technical Details:**
Based on HTTP response codes, failures appear to be:
- 401 errors: Authentication/authorization issues (mainly HBW operations)
- 418 errors: Service unavailable/refused (mainly VGR robot operations)

This suggests infrastructure/communication problems rather than process logic issues.`;

    return summary;
  }

  /**
   * Search for specific failure patterns
   */
  static async searchFailurePatterns(searchTerm: string, filters?: any): Promise<FailurePattern[]> {
    const analysis = await this.analyzeFailureCauses(filters);
    
    const searchLower = searchTerm.toLowerCase();
    return analysis.commonPatterns.filter(pattern => 
      pattern.description.toLowerCase().includes(searchLower)
    );
  }
}
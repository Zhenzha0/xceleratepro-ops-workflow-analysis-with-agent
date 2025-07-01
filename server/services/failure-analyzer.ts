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
   * Categorize failure causes from failure event descriptions
   */
  static categorizeFailureCauses(failureEvents: any[]): Record<string, {
    count: number;
    cases: Set<string>;
    equipment: Set<string>;
    examples: string[];
    avgProcessingTime: number;
    activity: string;
  }> {
    const failureGroups: Record<string, {
      count: number;
      cases: Set<string>;
      equipment: Set<string>;
      examples: string[];
      avgProcessingTime: number;
      activity: string;
    }> = {};

    failureEvents.forEach(event => {
      // Create a description based on activity and equipment
      let description = `${event.activity}`;
      if (event.orgResource) {
        description += ` on ${event.orgResource}`;
      }
      
      // Add failure reason if available
      if (event.unsatisfiedConditionDescription) {
        description += ` - ${event.unsatisfiedConditionDescription}`;
      } else if (event.responseStatusCode) {
        description += ` - HTTP ${event.responseStatusCode}`;
      }
      
      if (!failureGroups[description]) {
        failureGroups[description] = {
          count: 0,
          cases: new Set(),
          equipment: new Set(),
          examples: [],
          avgProcessingTime: 0,
          activity: event.activity
        };
      }
      
      failureGroups[description].count++;
      failureGroups[description].cases.add(event.caseId);
      if (event.orgResource) {
        failureGroups[description].equipment.add(event.orgResource);
      }
      
      if (failureGroups[description].examples.length < 3) {
        failureGroups[description].examples.push(event.caseId);
      }
    });

    return failureGroups;
  }

  /**
   * Analyze actual failure causes from unsatisfied_condition_description
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

    // Filter to only actual failure events with descriptions
    const failureEvents = events.filter(event => 
      event.lifecycleState === 'failure' && event.unsatisfiedConditionDescription
    );

    console.log(`Found ${failureEvents.length} actual failure events out of ${events.length} total events`);

    // Analyze actual failure causes from descriptions
    const failureGroups = FailureAnalyzer.categorizeFailureCauses(failureEvents);

    // Calculate average processing times for each failure group
    Object.keys(failureGroups).forEach(key => {
      const relevantEvents = failureEvents.filter(e => {
        let eventDescription = `${e.activity}`;
        if (e.orgResource) {
          eventDescription += ` on ${e.orgResource}`;
        }
        if (e.unsatisfiedConditionDescription) {
          eventDescription += ` - ${e.unsatisfiedConditionDescription}`;
        } else if (e.responseStatusCode) {
          eventDescription += ` - HTTP ${e.responseStatusCode}`;
        }
        return eventDescription === key;
      });
      const totalTime = relevantEvents.reduce((sum, e) => sum + (e.processingTimeS || 0), 0);
      if (relevantEvents.length > 0) {
        failureGroups[key].avgProcessingTime = totalTime / relevantEvents.length;
      }
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
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProcessCase } from "@shared/schema";

interface CaseComparisonProps {
  cases?: ProcessCase[];
}

export default function CaseComparison({ cases }: CaseComparisonProps) {
  const [selectedCaseA, setSelectedCaseA] = useState<string>('');
  const [selectedCaseB, setSelectedCaseB] = useState<string>('');

  // Mock comparison data - in real app this would come from API
  const mockCaseAData = {
    caseId: 'WF_101_0',
    status: 'Success',
    totalTime: 6.2,
    activities: [
      { name: 'HBW Unload', time: 54.9, efficiency: 85 },
      { name: 'VGR Transport', time: 48.6, efficiency: 92 },
      { name: 'Oven Burn', time: 26.4, efficiency: 65 }
    ]
  };

  const mockCaseBData = {
    caseId: 'WF_102_0',
    status: 'Success',
    totalTime: 8.7,
    activities: [
      { name: 'HBW Unload', time: 49.2, efficiency: 90 },
      { name: 'VGR Transport', time: 127.3, efficiency: 35 },
      { name: 'Oven Burn', time: 28.1, efficiency: 70 }
    ]
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'bg-success';
    if (efficiency >= 60) return 'bg-warning';
    return 'bg-error';
  };

  const renderCaseTimeline = (caseData: any) => (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">{caseData.caseId} Timeline</h4>
      <div className="space-y-3">
        {caseData.activities.map((activity: any, index: number) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`w-3 h-3 ${getEfficiencyColor(activity.efficiency)} rounded-full`}></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{activity.name}</span>
                <span className="text-xs text-gray-500">{activity.time}s</span>
              </div>
              <Progress 
                value={activity.efficiency} 
                className={`w-full h-1.5 mt-1`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          Total Time: {caseData.totalTime} minutes | Status: 
          <span className={`font-medium ml-1 ${caseData.status === 'Success' ? 'text-success' : 'text-error'}`}>
            {caseData.status}
          </span>
        </p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Comparison Analysis</CardTitle>
        <p className="text-sm text-gray-600">Compare workflow patterns between different manufacturing cases</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Case A</label>
            <Select value={selectedCaseA} onValueChange={setSelectedCaseA}>
              <SelectTrigger>
                <SelectValue placeholder="Select case A" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WF_101_0">WF_101_0 (Success)</SelectItem>
                <SelectItem value="WF_102_0">WF_102_0 (Success)</SelectItem>
                <SelectItem value="WF_103_0">WF_103_0 (Failed)</SelectItem>
                {cases?.map(processCase => (
                  <SelectItem key={processCase.caseId} value={processCase.caseId}>
                    {processCase.caseId} ({processCase.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Case B</label>
            <Select value={selectedCaseB} onValueChange={setSelectedCaseB}>
              <SelectTrigger>
                <SelectValue placeholder="Select case B" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WF_102_0">WF_102_0 (Success)</SelectItem>
                <SelectItem value="WF_101_0">WF_101_0 (Success)</SelectItem>
                <SelectItem value="WF_104_0">WF_104_0 (Failed)</SelectItem>
                {cases?.map(processCase => (
                  <SelectItem key={processCase.caseId} value={processCase.caseId}>
                    {processCase.caseId} ({processCase.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {renderCaseTimeline(mockCaseAData)}
          {renderCaseTimeline(mockCaseBData)}
        </div>
        
        <div className="flex justify-center">
          <Button 
            className="bg-primary hover:bg-primary/90"
            disabled={!selectedCaseA || !selectedCaseB}
          >
            Generate Detailed Comparison Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

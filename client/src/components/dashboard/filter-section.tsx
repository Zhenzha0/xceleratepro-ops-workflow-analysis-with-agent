import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DashboardMetrics } from "@shared/schema";

interface FilterSectionProps {
  filters: {
    scopeType: 'dataset' | 'timerange';
    datasetSize: string;
    datasetOrder: 'first' | 'last';
    customLimit: number;
    activityRange: { start: number; end: number };
    timeRange: { start: string; end: string };
    equipment: string;
    status: string;
    caseIds: string[];
  };
  onFiltersChange: (filters: any) => void;
  metrics?: DashboardMetrics;
}

export default function FilterSection({ filters, onFiltersChange, metrics }: FilterSectionProps) {
  const [availableCases, setAvailableCases] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [totalCaseCount, setTotalCaseCount] = useState<number>(0);
  
  // Fetch available cases and equipment for dropdowns
  useEffect(() => {
    // Fetch all cases without limit to get the total count
    fetch('/api/process/cases?limit=1000')
      .then(res => res.json())
      .then(cases => {
        setAvailableCases(cases.map((c: any) => c.caseId));
        setTotalCaseCount(cases.length);
      })
      .catch(() => {
        setAvailableCases([]);
        setTotalCaseCount(0);
      });
    
    // Extract equipment from process activities
    fetch('/api/process/activities')
      .then(res => res.json())
      .then(activities => {
        const equipment = Array.from(new Set(activities.map((a: any) => a.resource).filter(Boolean))) as string[];
        setAvailableEquipment(equipment);
      })
      .catch(() => setAvailableEquipment([]));
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleApplyFilters = async () => {
    try {
      // Show visual feedback
      const button = document.querySelector('button[type="button"]:last-child') as HTMLButtonElement;
      if (button) {
        button.textContent = 'Applying...';
        button.disabled = true;
      }
      
      // Apply the filter changes - this will trigger anomaly detection and all analysis to re-run
      onFiltersChange({ ...filters });
      
      // Reset button after a delay
      setTimeout(() => {
        if (button) {
          button.textContent = 'Apply Filters';
          button.disabled = false;
        }
      }, 1500);
      
    } catch (error) {
      console.error('Failed to apply filters:', error);
    }
  };

  const addCaseId = (caseId: string) => {
    if (caseId && !filters.caseIds.includes(caseId)) {
      handleFilterChange('caseIds', [...filters.caseIds, caseId]);
    }
  };

  const removeCaseId = (caseId: string) => {
    handleFilterChange('caseIds', filters.caseIds.filter(id => id !== caseId));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Data Scope Configuration
          <Badge variant="outline" className="text-xs">
            Two-Layer Filtering
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={filters.scopeType} onValueChange={(value) => handleFilterChange('scopeType', value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dataset">Dataset Size</TabsTrigger>
            <TabsTrigger value="timerange">Time Range</TabsTrigger>
          </TabsList>
          
          {/* Primary Data Scope - Dataset Size */}
          <TabsContent value="dataset" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="datasetSize">Dataset Size</Label>
                <Select value={filters.datasetSize} onValueChange={(value) => handleFilterChange('datasetSize', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Dataset (All {totalCaseCount || 301} cases)</SelectItem>
                    <SelectItem value="1000">First/Last 1000 Activities</SelectItem>
                    <SelectItem value="500">First/Last 500 Activities</SelectItem>
                    <SelectItem value="range">Activity Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {filters.datasetSize !== 'full' && (
                <div>
                  <Label htmlFor="datasetOrder">Order</Label>
                  <Select value={filters.datasetOrder} onValueChange={(value) => handleFilterChange('datasetOrder', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First Activities</SelectItem>
                      <SelectItem value="last">Last Activities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {filters.datasetSize === 'range' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startActivity">Start Activity Position</Label>
                  <Input
                    type="number"
                    value={filters.activityRange?.start || 1}
                    onChange={(e) => handleFilterChange('activityRange', { 
                      ...filters.activityRange, 
                      start: parseInt(e.target.value) || 1 
                    })}
                    placeholder="Activity #1"
                    min="1"
                    max="3157"
                  />
                </div>
                <div>
                  <Label htmlFor="endActivity">End Activity Position</Label>
                  <Input
                    type="number"
                    value={filters.activityRange?.end || 100}
                    onChange={(e) => handleFilterChange('activityRange', { 
                      ...filters.activityRange, 
                      end: parseInt(e.target.value) || 100 
                    })}
                    placeholder="Activity #100"
                    min="1"
                    max="3157"
                  />
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Primary Data Scope - Time Range */}
          <TabsContent value="timerange" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  type="date"
                  value={filters.timeRange.start}
                  onChange={(e) => handleFilterChange('timeRange', { ...filters.timeRange, start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  value={filters.timeRange.end}
                  onChange={(e) => handleFilterChange('timeRange', { ...filters.timeRange, end: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Secondary Filters */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
            Secondary Filters
            <Badge variant="secondary" className="text-xs">
              Applied to Scoped Data
            </Badge>
          </h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="equipment">Equipment/Station</Label>
              <Select value={filters.equipment} onValueChange={(value) => handleFilterChange('equipment', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {availableEquipment.map(equipment => (
                    <SelectItem key={equipment} value={equipment}>{equipment}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="inProgress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Case Filter */}
          <div>
            <Label htmlFor="caseFilter">Case Filter</Label>
            <div className="flex gap-2 mb-2">
              <Select onValueChange={addCaseId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select cases to filter" />
                </SelectTrigger>
                <SelectContent>
                  {availableCases.filter(caseId => !filters.caseIds.includes(caseId)).map(caseId => (
                    <SelectItem key={caseId} value={caseId}>{caseId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {filters.caseIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.caseIds.map(caseId => (
                  <Badge key={caseId} variant="outline" className="cursor-pointer" onClick={() => removeCaseId(caseId)}>
                    {caseId} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleApplyFilters} className="w-full mt-6">
          Apply Filters & Regenerate Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardMetrics } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface FilterSectionProps {
  filters: {
    datasetSize: string;
    timeRange: { start: string; end: string };
    equipment: string;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
  metrics?: DashboardMetrics;
}

export default function FilterSection({ filters, onFiltersChange, metrics }: FilterSectionProps) {
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
      
      // Apply the filter changes
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Data Scope Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dataset Size</label>
            <Select 
              value={filters.datasetSize} 
              onValueChange={(value) => handleFilterChange('datasetSize', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dataset size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Dataset (9,473 records)</SelectItem>
                <SelectItem value="last_1000">Last 1,000 records</SelectItem>
                <SelectItem value="last_500">Last 500 records</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Filter</label>
            <Select 
              value={filters.equipment} 
              onValueChange={(value) => handleFilterChange('equipment', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Equipment</SelectItem>
                <SelectItem value="hbw">High Bay Warehouse (HBW)</SelectItem>
                <SelectItem value="vgr">VGR Robot</SelectItem>
                <SelectItem value="ov">Oven (OV)</SelectItem>
                <SelectItem value="mm">Milling Machine (MM)</SelectItem>
                <SelectItem value="sm">Sorting Machine (SM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success Only</SelectItem>
                <SelectItem value="failed">Failures Only</SelectItem>
                <SelectItem value="inProgress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Active Cases: <strong>{metrics?.activeCases || 0}</strong></span>
            <span>Completed: <strong>{metrics?.completedCases || 0}</strong></span>
            <span>Failed: <strong>{metrics?.failedCases || 0}</strong></span>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

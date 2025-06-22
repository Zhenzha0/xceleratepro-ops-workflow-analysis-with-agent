import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Expand, Download, Warehouse, Bot, Flame, Cog, Shuffle } from "lucide-react";

export default function ProcessMap() {
  const processStations = [
    { id: 'hbw', name: 'HBW', icon: Warehouse, color: 'bg-blue-500', avgTime: '52s', status: 'success' },
    { id: 'vgr', name: 'VGR', icon: Bot, color: 'bg-green-500', avgTime: '46s', status: 'success' },
    { id: 'oven', name: 'Oven', icon: Flame, color: 'bg-red-500', avgTime: '3.7min', status: 'warning' },
    { id: 'milling', name: 'Milling', icon: Cog, color: 'bg-purple-500', avgTime: '15s', status: 'success' },
    { id: 'sorting', name: 'Sorting', icon: Shuffle, color: 'bg-indigo-500', avgTime: '12s', status: 'success' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-error';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manufacturing Process Flow</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Expand size={16} className="mr-1" />
              Fullscreen
            </Button>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
          <div className="text-center w-full">
            {/* Top Row - Main Process Flow */}
            <div className="grid grid-cols-5 gap-8 items-center mb-8">
              {processStations.slice(0, 3).map((station, index) => {
                const Icon = station.icon;
                return (
                  <div key={station.id} className="flex flex-col items-center">
                    {/* Station */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-16 h-16 ${station.color} rounded-lg flex items-center justify-center shadow-lg`}>
                        <Icon className="text-white" size={24} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{station.name}</span>
                      <span className="text-xs text-gray-500">Avg: {station.avgTime}</span>
                      <div className={`w-2 h-2 ${getStatusColor(station.status)} rounded-full`}></div>
                    </div>
                    
                    {/* Arrow (not for last item in first row) */}
                    {index < 2 && (
                      <div className="absolute translate-x-20 flex items-center">
                        <div className="w-16 h-0.5 bg-gray-400"></div>
                        <div className="w-0 h-0 border-l-4 border-gray-400 border-t-2 border-b-2 border-t-transparent border-b-transparent"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Bottom Row - Final Processing Steps */}
            <div className="grid grid-cols-3 gap-12 items-center justify-center">
              {processStations.slice(3).map((station, index) => {
                const Icon = station.icon;
                return (
                  <div key={station.id} className="flex flex-col items-center">
                    {/* Station */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-16 h-16 ${station.color} rounded-lg flex items-center justify-center shadow-lg`}>
                        <Icon className="text-white" size={24} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{station.name}</span>
                      <span className="text-xs text-gray-500">Avg: {station.avgTime}</span>
                      <div className={`w-2 h-2 ${getStatusColor(station.status)} rounded-full`}></div>
                    </div>
                    
                    {/* Arrow (not for last item) */}
                    {index < 1 && (
                      <div className="absolute translate-x-24 flex items-center">
                        <div className="w-20 h-0.5 bg-gray-400"></div>
                        <div className="w-0 h-0 border-l-4 border-gray-400 border-t-2 border-b-2 border-t-transparent border-b-transparent"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-8 flex justify-center space-x-6 text-xs text-gray-600">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                <span>Normal Operation</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-warning rounded-full mr-2"></div>
                <span>Performance Warning</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-error rounded-full mr-2"></div>
                <span>Critical Issue</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

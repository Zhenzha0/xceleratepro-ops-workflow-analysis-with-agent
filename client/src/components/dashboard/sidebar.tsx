import { Factory, BarChart3, AlertTriangle, Bot, Search, Clock, GitBranch, Filter, Download, Network } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const mainNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'process-maps', label: 'Process Maps', icon: GitBranch },
    { id: 'case-clustering', label: 'Case Clustering', icon: Network },
    { id: 'anomaly-detection', label: 'Anomaly Detection', icon: AlertTriangle },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'semantic-search', label: 'Semantic Search', icon: Search },
    { id: 'timeline-analysis', label: 'Timeline Analysis', icon: Clock },
    { id: 'case-comparison', label: 'Case Comparison', icon: GitBranch },
  ];

  const settingsItems = [
    { id: 'data-filters', label: 'Data Filters', icon: Filter },
    { id: 'export-data', label: 'Export Data', icon: Download },
  ];

  return (
    <div className="bg-white shadow-lg w-64 flex-shrink-0 border-r border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Factory className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ProcessMiner</h1>
            <p className="text-sm text-gray-500">Manufacturing Analytics</p>
          </div>
        </div>
      </div>
      
      {/* Main Navigation */}
      <nav className="mt-6">
        <div className="px-4">
          <div className="space-y-2">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-blue-50 text-primary border-r-2 border-primary" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon size={16} className="mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
        
        {/* Settings Section */}
        <div className="mt-8 px-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Settings
          </h3>
          <div className="space-y-2">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start ${
                    isActive 
                      ? "bg-blue-50 text-primary" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon size={16} className="mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

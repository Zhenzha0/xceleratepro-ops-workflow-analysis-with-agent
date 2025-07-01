import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, Clock, Database, Eye, Info, Search, Target, Timer, Wrench, Zap } from "lucide-react";
import { useState } from "react";

interface SearchResult {
  id: string;
  type: 'event' | 'activity';
  caseId: string;
  activity: string;
  description: string;
  currentTask: string;
  timestamp: string;
  operationEndTime?: string;
  orgResource: string;
  lifecycleState?: string;
  lifecycleTransition?: string;
  processModelId?: string;
  requestedServiceUrl?: string;
  plannedOperationTime?: string;
  responseStatusCode?: number;
  completeServiceTime?: string;
  humanWorkstationGreenButtonPressed?: number;
  processingTimeS?: number;
  isAnomaly: number;
  parameters?: string;
  eventId?: number;
  identifierId?: string;
  subProcessId?: string;
  caseConceptName?: string;
  scheduledTime?: string;
  startTime?: string;
  completeTime?: string;
  plannedDurationS?: number;
  actualDurationS?: number;
  status?: string;
  anomalyScore?: number;
  matchedField: 'unsatisfied_condition' | 'current_task' | 'failure_description';
  matchedContent: string;
}

interface SearchSummary {
  totalResults: number;
  eventMatches: number;
  activityMatches: number;
  uniqueCases: number;
  uniqueActivities: number;
  searchQuery: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
}

const DetailedActivityView = ({ result }: { result: SearchResult }) => {
  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Section */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h3 className="text-lg font-semibold text-blue-700">{result.activity}</h3>
        <p className="text-sm text-gray-600">Case: {result.caseId} • Type: {result.type}</p>
      </div>

      {/* Key Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-500">Resource:</span>
              <p className="text-sm">{result.orgResource || 'N/A'}</p>
            </div>
            {result.type === 'event' && result.processModelId && (
              <div>
                <span className="text-xs font-medium text-gray-500">Process Model:</span>
                <p className="text-sm">{result.processModelId}</p>
              </div>
            )}
            {result.type === 'event' && result.lifecycleState && (
              <div>
                <span className="text-xs font-medium text-gray-500">Lifecycle State:</span>
                <Badge variant="outline" className="text-xs">
                  {result.lifecycleState} / {result.lifecycleTransition}
                </Badge>
              </div>
            )}
            {result.isAnomaly === 1 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-700 font-medium">Anomaly Detected</span>
                {result.anomalyScore && (
                  <Badge variant="destructive" className="text-xs">
                    Score: {result.anomalyScore.toFixed(2)}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timing Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-xs font-medium text-gray-500">Timestamp:</span>
              <p className="text-sm">{formatDateTime(result.timestamp)}</p>
            </div>
            
            {result.type === 'activity' && (
              <>
                {result.scheduledTime && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Scheduled:</span>
                    <p className="text-sm">{formatDateTime(result.scheduledTime)}</p>
                  </div>
                )}
                {result.startTime && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Started:</span>
                    <p className="text-sm">{formatDateTime(result.startTime)}</p>
                  </div>
                )}
                {result.completeTime && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Completed:</span>
                    <p className="text-sm">{formatDateTime(result.completeTime)}</p>
                  </div>
                )}
              </>
            )}

            {result.type === 'event' && result.operationEndTime && (
              <div>
                <span className="text-xs font-medium text-gray-500">Operation End:</span>
                <p className="text-sm">{formatDateTime(result.operationEndTime)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duration & Performance */}
        {result.type === 'activity' && (result.plannedDurationS || result.actualDurationS) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Duration & Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.plannedDurationS && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Planned Duration:</span>
                  <p className="text-sm">{formatDuration(result.plannedDurationS)}</p>
                </div>
              )}
              {result.actualDurationS && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Actual Duration:</span>
                  <p className="text-sm">{formatDuration(result.actualDurationS)}</p>
                </div>
              )}
              {result.plannedDurationS && result.actualDurationS && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Variance:</span>
                  <p className={`text-sm font-medium ${
                    result.actualDurationS > result.plannedDurationS ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {result.actualDurationS > result.plannedDurationS ? '+' : ''}
                    {formatDuration(result.actualDurationS - result.plannedDurationS)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event-specific Information */}
        {result.type === 'event' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.plannedOperationTime && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Planned Operation Time:</span>
                  <p className="text-sm">{result.plannedOperationTime}</p>
                </div>
              )}
              {result.processingTimeS && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Processing Time:</span>
                  <p className="text-sm">{formatDuration(result.processingTimeS)}</p>
                </div>
              )}
              {result.responseStatusCode && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Response Status:</span>
                  <Badge variant={result.responseStatusCode === 200 ? "secondary" : "destructive"} className="text-xs">
                    {result.responseStatusCode}
                  </Badge>
                </div>
              )}
              {result.humanWorkstationGreenButtonPressed === 1 && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700">Green Button Pressed</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Technical Details */}
      {(result.requestedServiceUrl || result.parameters || result.eventId) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.requestedServiceUrl && (
              <div>
                <span className="text-xs font-medium text-gray-500">Service URL:</span>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                  {result.requestedServiceUrl}
                </p>
              </div>
            )}
            {result.parameters && (
              <div>
                <span className="text-xs font-medium text-gray-500">Parameters:</span>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                  {result.parameters}
                </p>
              </div>
            )}
            {result.eventId && (
              <div>
                <span className="text-xs font-medium text-gray-500">Event ID:</span>
                <p className="text-sm">{result.eventId}</p>
              </div>
            )}
            {result.identifierId && (
              <div>
                <span className="text-xs font-medium text-gray-500">Identifier:</span>
                <p className="text-sm font-mono">{result.identifierId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content that Matched */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4 text-orange-600" />
            Matched Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <span className="text-xs font-medium text-gray-500 capitalize">
              {result.matchedField.replace('_', ' ')}:
            </span>
            <p className="text-sm bg-yellow-100 p-2 rounded mt-1 border-l-4 border-yellow-400">
              {result.matchedContent}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getMatchedFieldColor = (field: string) => {
    switch (field) {
      case 'unsatisfied_condition':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'current_task':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'failure_description':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMatchedFieldLabel = (field: string) => {
    switch (field) {
      case 'unsatisfied_condition':
        return 'Condition Issue';
      case 'current_task':
        return 'Current Task';
      case 'failure_description':
        return 'Failure Description';
      default:
        return field.replace('_', ' ');
    }
  };

  const getMatchedFieldBadge = (field: string) => {
    switch (field) {
      case 'unsatisfied_condition':
        return <Badge className={getMatchedFieldColor(field)}>Condition Issue</Badge>;
      case 'current_task':
        return <Badge className={getMatchedFieldColor(field)}>Current Task</Badge>;
      case 'failure_description':
        return <Badge className={getMatchedFieldColor(field)}>Failure Description</Badge>;
      default:
        return <Badge className={getMatchedFieldColor(field)}>{field.replace('_', ' ')}</Badge>;
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting search for:', query.trim());
      
      const response = await fetch('/api/search/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 20
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', errorText);
        throw new Error(`Search failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      setResults(data.results || []);
      setTotalResults(data.totalResults || 0);
      
      if (!data.results || data.results.length === 0) {
        setError('No results found for your search query.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(`Search failed: ${err instanceof Error ? err.message : 'Please try again.'}`);
      setResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Semantic Search</h2>
          <p className="text-gray-600">
            Search through unsatisfaction conditions, current tasks, and failure descriptions
          </p>
        </div>

          {/* Search Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search for barrier, fault, delay, failure, etc..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
            <Button 
              onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Searching...
              </div>
            ) : (
              'Search'
              )}
            </Button>
          </div>

        {/* Results Summary */}
        {totalResults > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Found {totalResults} result{totalResults !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{results.filter(r => r.type === 'event').length} events</span>
            <span>•</span>
            <span>{results.filter(r => r.type === 'activity').length} activities</span>
          </div>
        )}
              </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
          )}
          
          {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
              ))}
            </div>
          )}
          
      {/* Results */}
          {results.length > 0 && (
        <div className="space-y-4">
              {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {result.type === 'event' ? <Activity className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900">{result.activity}</h3>
                        {getMatchedFieldBadge(result.matchedField)}
                        {result.isAnomaly === 1 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Anomaly
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span>Case: <span className="font-medium">{result.caseId}</span></span>
                          <span>Resource: <span className="font-medium">{result.orgResource}</span></span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(result.timestamp)}
                          </span>
                        </div>
                      </div>

                      {result.matchedContent && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-300 p-2 rounded">
                          <p className="text-sm text-gray-700">{result.matchedContent}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {result.type === 'event' ? <Activity className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                          Activity Details: {result.activity}
                        </DialogTitle>
                        <DialogDescription>
                          Comprehensive information for {result.type} in case {result.caseId}
                        </DialogDescription>
                      </DialogHeader>
                      <Separator />
                      <DetailedActivityView result={result} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
              ))}
            </div>
          )}
          
      {/* No Results State */}
      {!isLoading && !error && query && results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-4">
              No activities or events match your search query "{query}"
            </p>
            <p className="text-sm text-gray-500">
              Try searching for terms like "barrier", "fault", "delay", or "failure"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

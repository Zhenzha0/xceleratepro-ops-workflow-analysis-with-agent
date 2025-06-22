import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface SearchResult {
  id: string;
  description: string;
  caseId: string;
  activity: string;
  similarity: number;
}

interface SearchResponse {
  results: SearchResult[];
  contextualInsights: string;
  totalResults: number;
}

export default function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [insights, setInsights] = useState<string>('');

  const searchMutation = useMutation({
    mutationFn: (searchQuery: string) => api.semanticSearch({
      query: searchQuery,
      limit: 5
    }),
    onSuccess: (response: SearchResponse) => {
      setResults(response.results);
      setInsights(response.contextualInsights);
    },
    onError: (error) => {
      console.error('Search error:', error);
      setResults([]);
      setInsights('Search failed. Please try again.');
    }
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMutation.mutate(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-success';
    if (similarity >= 0.8) return 'text-warning';
    return 'text-gray-600';
  };

  return (
    <div className="p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Search size={18} />
          <span>Semantic Search</span>
        </CardTitle>
        <p className="text-sm text-gray-600">Search for similar failure descriptions and patterns</p>
      </CardHeader>
      
      <CardContent className="px-0">
        <div className="space-y-3">
          {/* Search Input */}
          <div className="flex space-x-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search failure descriptions..."
              className="flex-1"
              disabled={searchMutation.isPending}
            />
            <Button 
              onClick={handleSearch}
              disabled={!query.trim() || searchMutation.isPending}
              size="sm"
            >
              {searchMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search size={16} />
              )}
            </Button>
          </div>

          {/* Contextual Insights */}
          {insights && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                <p className="text-sm text-blue-800">{insights}</p>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {searchMutation.isPending && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}
          
          {/* Search Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => (
                <div key={result.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm mb-1">
                        {result.description.length > 100 
                          ? `${result.description.substring(0, 100)}...` 
                          : result.description
                        }
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <span>Case: {result.caseId}</span>
                        {result.activity && (
                          <>
                            <span>•</span>
                            <span>{result.activity}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getSimilarityColor(result.similarity)}`}
                    >
                      Similarity: {(result.similarity * 100).toFixed(0)}%
                    </Badge>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-primary text-xs p-0 h-auto"
                    >
                      View Details
                      <ExternalLink size={12} className="ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* No Results */}
          {!searchMutation.isPending && results.length === 0 && query && searchMutation.isSuccess && (
            <div className="text-center py-4 text-gray-500">
              <AlertCircle className="mx-auto mb-2" size={24} />
              <p className="text-sm">No similar failures found.</p>
              <p className="text-xs mt-1">Try adjusting your search terms or check for typos.</p>
            </div>
          )}
          
          {/* Initial State */}
          {!query && results.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <Search className="mx-auto mb-2" size={24} />
              <p className="text-sm">Enter a failure description to find similar cases</p>
              <p className="text-xs mt-1">Use natural language to describe equipment issues or error conditions</p>
            </div>
          )}
        </div>
      </CardContent>
    </div>
  );
}

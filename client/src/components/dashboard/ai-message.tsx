import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';

interface AIMessageProps {
  content: string;
  timestamp: Date;
}

export function AIMessage({ content, timestamp }: AIMessageProps) {
  const formatResponse = (text: string) => {
    const sections = text.split('##').filter(section => section.trim());
    
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      
      if (title === 'Executive Summary') {
        return (
          <Card key={index} className="mb-4 border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{content}</p>
            </CardContent>
          </Card>
        );
      }
      
      if (title === 'Key Performance Metrics') {
        const metrics = content.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
        return (
          <Card key={index} className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Key Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {metrics.map((metric, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {metric.replace(/^[•\-]\s*/, '')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      }
      
      if (title === 'Critical Issues Identified') {
        const issues = content.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
        return (
          <Card key={index} className="mb-4 border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-red-700">Critical Issues Identified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-red-700 text-sm">{issue.replace(/^[•\-]\s*/, '')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      }
      
      if (title === 'Recommendations') {
        const recommendations = content.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
        return (
          <Card key={index} className="mb-4 border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-700">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-green-700 text-sm">{rec.replace(/^[•\-]\s*/, '')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      }
      
      // Default formatting for other sections
      return (
        <Card key={index} className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-gray-700">{content}</div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="space-y-4">
      {formatResponse(content)}
      <div className="text-xs text-gray-500 mt-2">
        {timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
}
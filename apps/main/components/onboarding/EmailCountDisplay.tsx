'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Mail, Clock } from 'lucide-react';

interface EmailCountDisplayProps {
  totalEmails?: number;
  estimatedMinutes?: number;
}

export function EmailCountDisplay({ totalEmails, estimatedMinutes }: EmailCountDisplayProps) {
  const formatEmailCount = (count?: number) => {
    if (count === undefined || count === null) return "...";
    return count.toLocaleString();
  };

  const formatEstimatedTime = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return "calculating...";
    
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <Mail className="h-6 w-6 text-blue-600" />
          Emails Found
        </CardTitle>
        <CardDescription>
          We're analyzing your email account
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold text-blue-600">
              {formatEmailCount(totalEmails)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              emails to analyze
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Estimated time: {formatEstimatedTime(estimatedMinutes)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useTRPC } from '@/trpc/client';
import { Button } from '@workspace/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@workspace/ui/components/card';

export function EmailManager() {
  const [refreshResult, setRefreshResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trpc = useTRPC();

  const mutation = useMutation(trpc.emails.refresh.mutationOptions(
    {
      onSuccess: (data) => {
        setRefreshResult(data?.message || "Emails refreshed successfully");
      },
      onError: (err) => {
        if (err instanceof TRPCClientError) {
          setError(err.message || "Failed to refresh emails");
        } else {
          setError("An error occurred while refreshing emails");
        }
      }
    }
  ));
  const handleRefresh = () => {
    setError(null);
    setRefreshResult(null);
    mutation.mutate({
      userId: "123",
    });
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Email Management</CardTitle>
        <CardDescription>View and manage your connected emails</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {refreshResult && (
          <div className="p-4 bg-green-50 text-green-700 rounded-md">
            {refreshResult}
          </div>
        )}

      </CardContent>
      <CardFooter className="flex gap-2">
        <Button 
          onClick={handleRefresh} 
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Refreshing...' : 'Refresh Emails'}
        </Button>
      </CardFooter>
    </Card>
  );
} 
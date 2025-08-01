---
description: 
globs: 
alwaysApply: true
---
 ```tsx
  import { prefetch, HydrateClient, trpc } from "@/trpc/server";
  import { Suspense } from "react";
  import { TransactionsDataTable } from "./data-table";

  export default function TransactionsPage() {
    prefetch(trpc.transactions.list.queryOptions({
      pageSize: 10,
      page: 1,
    }));
    return (
      <HydrateClient>
        <div className="flex flex-col gap-4 p-4">
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <Suspense fallback={<div>Loading...</div>}>
            <TransactionsDataTable />
          </Suspense>
        </div>
      </HydrateClient>
    );
  }
```


```tsx 
'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { trpc } from '~/trpc/client';
export function ClientGreeting() {
  const trpc = useTRPC();
  const [data] = useSuspenseQuery(trpc.hello.queryOptions());
  return <div>{data.greeting}</div>;
}

```
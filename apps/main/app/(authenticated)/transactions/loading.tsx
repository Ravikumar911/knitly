import { Skeleton } from "@workspace/ui/components/skeleton"

export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-4 p-8">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-[250px]" />
          <Skeleton className="h-9 w-[180px]" />
        </div>
        
        <div className="rounded-md border">
          <div className="h-10 border-b px-4">
            <div className="flex h-full items-center gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-[100px]" />
              ))}
            </div>
          </div>
          
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-[100px]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-[250px]" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-[70px]" />
            <Skeleton className="h-8 w-[70px]" />
          </div>
        </div>
      </div>
    </div>
  )
} 
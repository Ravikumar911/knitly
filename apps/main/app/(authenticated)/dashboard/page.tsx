import { DataStatusChecker } from '@/components/onboarding';

export default function Page() {
  return (
    <DataStatusChecker>
      {/* Dashboard content for users with synced data */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your financial insights.
          </p>
        </div>
        
        {/* Placeholder for dashboard content */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Total Transactions</h3>
            <p className="text-2xl font-bold">Loading...</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">This Month</h3>
            <p className="text-2xl font-bold">Loading...</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Top Merchant</h3>
            <p className="text-2xl font-bold">Loading...</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Average Order</h3>
            <p className="text-2xl font-bold">Loading...</p>
          </div>
        </div>
      </div>
    </DataStatusChecker>
  );
}

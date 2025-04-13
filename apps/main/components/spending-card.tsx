import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { IndianRupee } from "lucide-react";

interface SpendingCardProps {
  totalSpending: number;
  title?: string;
  subtitle?: string;
}

export function SpendingCard({ totalSpending, title = "Total Spending", subtitle }: SpendingCardProps) {
  // Format number to Indian currency format
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(totalSpending);

  return (
    <Card className="hover:bg-accent/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <IndianRupee className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedAmount}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
} 
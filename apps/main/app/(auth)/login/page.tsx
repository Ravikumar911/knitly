import { Metadata } from "next"
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'

export const metadata: Metadata = {
  title: "Local Mode - Slash",
  description: "Local development mode",
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Slash (Local Mode)</h1>
        <p className="text-muted-foreground mt-2">Google login is disabled. Continue directly to the dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No login required</CardTitle>
          <CardDescription>
            This local setup uses a single local user and local PostgreSQL data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

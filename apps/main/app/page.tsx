import { HydrateClient } from "@/trpc/server";
import { ClientGreeting } from "@/components/client-greeting";

// Adding export config for static rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function Home() {
  return (
    <HydrateClient>
      <ClientGreeting />
    </HydrateClient>
  );
} 
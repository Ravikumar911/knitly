import { HydrateClient } from "@/trpc/server";
import { ClientGreeting } from "@/components/client-greeting";

export default function Home() {
  return (
    <HydrateClient>
      <ClientGreeting />
    </HydrateClient>
  );
} 
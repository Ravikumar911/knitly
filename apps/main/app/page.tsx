import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ClientGreeting } from "@/components/client-greeting";

export default async function Home() {
  prefetch(
    trpc.hello.queryOptions({
      text: 'server',
    }),
  );  

  
  return (
    <HydrateClient>
      <ClientGreeting />
    </HydrateClient>
  );
} 
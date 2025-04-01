import { dehydrate, HydrationBoundary, queryOptions } from '@tanstack/react-query';
import { getQueryClient, trpc } from "@/trpc/server";
import { ClientGreeting } from "@/components/client-greeting";

export default async function Home() {
  const queryClient = getQueryClient();
  const result = await trpc.hello({
    text: 'server',
  })
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div>{result.greeting}</div>
      <ClientGreeting />
    </HydrationBoundary>
  );
} 
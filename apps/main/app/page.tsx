import { HydrateClient } from "@/trpc/server";
import { ClientGreeting } from "@/components/client-greeting";
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
  return (
    <HydrateClient>
      <ClientGreeting />
    </HydrateClient>
  );
}

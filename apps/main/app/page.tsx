import { redirect } from "next/navigation";
import { isOnboardComplete } from "@/lib/onboard/complete";

export default async function Home() {
  if (!(await isOnboardComplete())) {
    redirect("/onboard");
  }
  redirect("/dashboard");
}

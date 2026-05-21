import { redirect } from "next/navigation";

/** Legacy URL — email connectors live at /connectors */
export default function SwiggyRedirectPage() {
  redirect("/connectors");
}

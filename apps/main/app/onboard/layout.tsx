export const dynamic = "force-dynamic";

/**
 * Incomplete installs are forced here from the authenticated layout.
 * The Ready screen is allowed to render after an in-session pipeline finish.
 */
export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground">{children}</div>
  );
}

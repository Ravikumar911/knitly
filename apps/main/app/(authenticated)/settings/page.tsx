import { ManualSyncCard } from "@/components/settings/manual-sync-card";

export default function SettingsPage() {
  // Mock data status for settings - user already has synced before
  const settingsDataStatus = {
    hasEmails: true,
    hasInitialSync: true,
    emailCount: 0, // Not used for manual sync
    needsSync: false
  };

  return (
    <div className="container px-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="max-w-2xl">
        <ManualSyncCard />
      </div>

      {/* Future settings sections can be added here */}
      {/* 
      <section className="mt-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Account Preferences</h2>
          <p className="text-muted-foreground mt-1">
            Configure your account preferences and notifications
          </p>
        </div>
      </section>
      */}
    </div>
  );
} 
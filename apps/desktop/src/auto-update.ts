import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

const GATEKEEPER_UPDATE_NOTE =
  "slash.cash ships unsigned in v1. After an update, macOS Gatekeeper may prompt again — right-click the app and choose Open if needed.";

let manualCheckInFlight = false;
let loggingWired = false;

/** Packaged builds only — skip electron-updater in `electron .` / vitest. */
export function shouldCheckForUpdates(isPackaged = app.isPackaged): boolean {
  return isPackaged;
}

export function configureAboutPanelGatekeeperNote(): void {
  app.setAboutPanelOptions({
    applicationName: "slash.cash",
    applicationVersion: app.getVersion(),
    credits: GATEKEEPER_UPDATE_NOTE,
  });
}

/**
 * Quiet launch check: notifies when an update is available/downloaded.
 * No-op outside packaged builds.
 */
export function checkForUpdatesOnLaunch(): void {
  if (!shouldCheckForUpdates()) {
    return;
  }

  wireUpdaterLogging();
  void autoUpdater.checkForUpdatesAndNotify().catch((error: unknown) => {
    console.error("Launch update check failed:", error);
  });
}

/**
 * Menu-driven check. Explains Gatekeeper on the up-to-date path; surfaces errors.
 */
export async function checkForUpdatesFromMenu(): Promise<void> {
  if (!shouldCheckForUpdates()) {
    await dialog.showMessageBox({
      type: "info",
      title: "Check for Updates",
      message: "Update checks run only in packaged builds.",
      detail:
        "Install a GitHub Release build to use auto-update from this menu.",
    });
    return;
  }

  if (manualCheckInFlight) {
    return;
  }

  manualCheckInFlight = true;
  wireUpdaterLogging();

  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        autoUpdater.off("update-available", onAvailable);
        autoUpdater.off("update-not-available", onNotAvailable);
        autoUpdater.off("error", onError);
      };

      const onAvailable = (info: { version: string }) => {
        cleanup();
        void dialog
          .showMessageBox({
            type: "info",
            title: "Update available",
            message: `Version ${info.version} is available (you have ${app.getVersion()}).`,
            detail: `Downloading in the background. ${GATEKEEPER_UPDATE_NOTE}`,
          })
          .then(async () => {
            try {
              await autoUpdater.downloadUpdate();
            } catch (error: unknown) {
              console.error("Update download failed:", error);
            }
            resolve();
          });
      };

      const onNotAvailable = () => {
        cleanup();
        void dialog
          .showMessageBox({
            type: "info",
            title: "Check for Updates",
            message: `slash.cash ${app.getVersion()} is up to date.`,
            detail: GATEKEEPER_UPDATE_NOTE,
          })
          .then(() => resolve());
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      autoUpdater.once("update-available", onAvailable);
      autoUpdater.once("update-not-available", onNotAvailable);
      autoUpdater.once("error", onError);

      // Menu path uses checkForUpdates (not AndNotify) so we own the dialogs.
      void autoUpdater.checkForUpdates().catch((error: unknown) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  } catch (error: unknown) {
    console.error("Manual update check failed:", error);
    await dialog.showMessageBox({
      type: "error",
      title: "Update check failed",
      message: "Could not check GitHub Releases for updates.",
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    manualCheckInFlight = false;
  }
}

function wireUpdaterLogging(): void {
  if (loggingWired) {
    return;
  }
  loggingWired = true;

  autoUpdater.on("error", (error) => {
    console.error("electron-updater error:", error);
  });
  autoUpdater.on("update-downloaded", (info) => {
    console.info(`Update ${info.version} downloaded; will install on quit.`);
  });
}

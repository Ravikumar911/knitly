import cron from "node-cron";

export function startPlaceholderCron() {
  const task = cron.schedule("0 0 1 1 *", () => undefined, {
    scheduled: false,
  });

  return {
    stop() {
      task.stop();
    },
  };
}

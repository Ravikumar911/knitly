export type JobHandler = () => Promise<void>;

const jobs = new Map<string, JobHandler>();

export function registerJob(id: string, handler: JobHandler) {
  jobs.set(id, handler);
}

export function getJob(id: string) {
  return jobs.get(id) ?? null;
}

export async function runJob(id: string) {
  const job = getJob(id);
  if (!job) {
    throw new Error(`Unknown job: ${id}`);
  }
  await job();
}

export function listJobs() {
  return [...jobs.keys()].sort();
}

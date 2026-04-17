export type Progress = {
  start(label: string): void;
  update(line: string): void;
  done(): void;
  fail(error: string): void;
};

export function createProgress(): Progress {
  const isTty = process.stderr.isTTY;
  let label = "";
  let started = 0;
  let lastWrite = 0;

  function write(line: string, force = false) {
    const now = Date.now();
    if (!force && !isTty && now - lastWrite < 250) return;
    lastWrite = now;

    if (isTty) {
      process.stderr.write(`\r${line.padEnd(90).slice(0, 90)}`);
      return;
    }

    process.stderr.write(`${line}\n`);
  }

  return {
    start(nextLabel) {
      label = nextLabel;
      started = Date.now();
      write(`- ${label} ...`, true);
    },
    update(line) {
      write(`- ${label}: ${line}`);
    },
    done() {
      const elapsed = Date.now() - started;
      write(`- ${label} done (${elapsed}ms)`, true);
      if (isTty) process.stderr.write("\n");
    },
    fail(error) {
      write(`- ${label} failed: ${error}`, true);
      if (isTty) process.stderr.write("\n");
    },
  };
}

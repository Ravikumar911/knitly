type DatabaseModule = typeof import("@workspace/database");

let loadedDatabase: Promise<DatabaseModule> | undefined;

export async function loadDatabase(): Promise<DatabaseModule> {
  loadedDatabase ??= import("@workspace/database").then((mod) => {
    const databaseModule = mod as Partial<DatabaseModule> & { default?: DatabaseModule };
    return (databaseModule.ensureLocalDatabase ? databaseModule : databaseModule.default ?? mod) as DatabaseModule;
  });

  return loadedDatabase;
}

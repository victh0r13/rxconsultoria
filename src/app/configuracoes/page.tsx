import { dbFilePath, listBackups, DATA_DIR } from "@/lib/db";
import { SettingsView } from "./SettingsView";

export const metadata = { title: "Ajustes" };

export default async function ConfiguracoesPage() {
  const backups = await listBackups();
  return <SettingsView dataFile={dbFilePath()} dataDir={DATA_DIR} backups={backups.slice(0, 5)} backupCount={backups.length} />;
}

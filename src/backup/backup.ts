import { Directory, File, Paths } from 'expo-file-system';

import { DATABASE_VERSION, db, kvGet, kvSet, pendingRestoreFile, tableNames } from '@/db/client';
import {
  backupFileName,
  backupsToDelete,
  buildBackup,
  isBackupDue,
  parseBackup,
  type Backup,
  type BackupRow,
  type ParsedBackup,
} from '@/logic/backup';
import { dayKey } from '@/logic/dates';
import { useSettings } from '@/store/settings';

/** kv: content URI of the folder picked for automatic copies (Android keeps the permission across restarts). */
const BACKUP_DIR_KEY = 'backupDir';
/** kv: result of the last automatic copy, for the Settings status line. */
const BACKUP_STATUS_KEY = 'backupStatus';
/** Copies always kept inside the app (included in Android Auto Backup). */
const INTERNAL_KEEP = 3;
const MIME = 'application/json';

export interface BackupStatus {
  /** Day of the last automatic copy (it runs once a day). */
  day: string | null;
  at: number | null;
  /** Writing into the chosen folder failed (e.g. its permission was revoked). */
  folderError: string | null;
}

const internalDir = () => new Directory(Paths.document, 'backups');

/** JSON snapshot of the whole database. */
export async function createSnapshot(now: number = Date.now()): Promise<string> {
  // Fold the WAL into the main file first, so Android Auto Backup of the .db file is complete too.
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  const tables: Record<string, BackupRow[]> = {};
  for (const name of await tableNames()) tables[name] = await db.getAllAsync<BackupRow>(`SELECT * FROM "${name}"`);
  return JSON.stringify(buildBackup(tables, DATABASE_VERSION, now));
}

/** Writes `name` into a directory, replacing a file of that name (SAF would otherwise add " (1)"). */
async function writeInto(dir: Directory, name: string, text: string): Promise<void> {
  for (const entry of dir.list()) if (entry instanceof File && entry.name === name) entry.delete();
  const file = dir.createFile(name, MIME);
  await file.write(text);
}

function prune(dir: Directory, keep: number): void {
  const files = dir.list().filter((e): e is File => e instanceof File);
  const remove = new Set(
    backupsToDelete(
      files.map((f) => f.name),
      keep,
    ),
  );
  for (const f of files) if (remove.has(f.name)) f.delete();
}

async function writeInternal(name: string, text: string): Promise<void> {
  const dir = internalDir();
  if (!dir.exists) dir.create({ intermediates: true });
  await writeInto(dir, name, text);
}

/** Saves a copy into a folder the user picks now; returns the folder name, or null if cancelled. */
export async function exportToFolder(): Promise<string | null> {
  const saved = await kvGet<string>(BACKUP_DIR_KEY);
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync(saved ?? undefined);
  } catch {
    return null; // cancelled
  }
  await writeInto(dir, backupFileName(dayKey()), await createSnapshot());
  return dir.name;
}

/** Lets the user pick a backup file and validates it (null if cancelled). */
export async function pickBackupFile(): Promise<ParsedBackup | null> {
  const picked = await File.pickFileAsync({ mimeTypes: [MIME, '*/*'] });
  if (picked.canceled) return null;
  return parseBackup(await picked.result.text(), DATABASE_VERSION);
}

/**
 * Schedules `backup` to replace all data on the next start (see `migrate`). The current data is saved first as
 * `before-restore.json` in the internal backups folder.
 */
export async function requestRestore(backup: Backup): Promise<void> {
  await writeInternal('before-restore.json', await createSnapshot());
  const file = pendingRestoreFile();
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(backup));
}

/** Picks the folder for automatic copies; returns its name, or null if cancelled. */
export async function pickBackupFolder(): Promise<string | null> {
  try {
    const dir = await Directory.pickDirectoryAsync((await kvGet<string>(BACKUP_DIR_KEY)) ?? undefined);
    await kvSet(BACKUP_DIR_KEY, dir.uri);
    await kvSet(BACKUP_STATUS_KEY, { ...(await getBackupStatus()), day: null, folderError: null });
    return dir.name;
  } catch {
    return null;
  }
}

export async function getBackupFolderName(): Promise<string | null> {
  const uri = await kvGet<string>(BACKUP_DIR_KEY);
  if (!uri) return null;
  try {
    return new Directory(uri).name;
  } catch {
    return uri;
  }
}

export async function getBackupStatus(): Promise<BackupStatus> {
  return (await kvGet<BackupStatus>(BACKUP_STATUS_KEY)) ?? { day: null, at: null, folderError: null };
}

let running = false;
/**
 * The daily automatic copy (startup and foreground): always into the internal folder (last 3), and into the chosen
 * folder when «Автокопия в папку» is on (last `autoBackupKeep`). Errors are recorded, never thrown.
 */
export async function runAutoBackup(now: number = Date.now()): Promise<void> {
  if (running) return;
  running = true;
  try {
    const today = dayKey(new Date(now));
    const status = await getBackupStatus();
    if (!isBackupDue(status.day, today)) return;
    const { autoBackupEnabled, autoBackupKeep } = useSettings.getState();
    const text = await createSnapshot(now);
    const name = backupFileName(today);
    await writeInternal(name, text);
    prune(internalDir(), INTERNAL_KEEP);
    let folderError: string | null = null;
    const uri = await kvGet<string>(BACKUP_DIR_KEY);
    if (autoBackupEnabled && uri) {
      try {
        const dir = new Directory(uri);
        await writeInto(dir, name, text);
        prune(dir, autoBackupKeep);
      } catch (e) {
        folderError = String(e);
      }
    }
    await kvSet(BACKUP_STATUS_KEY, { day: today, at: now, folderError } satisfies BackupStatus);
  } catch (e) {
    console.warn('Auto backup failed', e);
  } finally {
    running = false;
  }
}

/** Folds the WAL into the database file (app going to background), so Android Auto Backup copies a complete file. */
export async function checkpoint(): Promise<void> {
  try {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    // Busy: the next one will do.
  }
}

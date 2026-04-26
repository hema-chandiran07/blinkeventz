/**
 * Prisma Migration Script with Logging
 * 
 * Features:
 * - Pre-migration backup
 * - Detailed success/failure logs
 * - Automatic rollback on failure
 * - Colored console output
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const BACKUP_DIR = path.join(__dirname, '../../backups');
const LOG_FILE = path.join(__dirname, '../../logs/migration.log');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(`${color}${logMessage}${colors.reset}`);
  appendToLogFile(logMessage);
}

function appendToLogFile(message: string) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

function executeCommand(command: string): string {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.stderr || error.message}`);
  }
}

async function createBackup(): Promise<string | null> {
  log('Creating database backup...', colors.blue);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
  
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Extract database name from URL
    const dbNameMatch = databaseUrl.match(/\/([^\/?]+)(\?|$)/);
    if (!dbNameMatch) {
      throw new Error('Could not extract database name from DATABASE_URL');
    }
    const dbName = dbNameMatch[1];
    
    // Create backup using pg_dump
    const pgDumpCommand = `pg_dump "${databaseUrl}" > "${backupFile}"`;
    execSync(pgDumpCommand, { shell: 'sh' });
    
    log(`Backup created: ${backupFile}`, colors.green);
    return backupFile;
  } catch (error: any) {
    log(`Backup failed: ${error.message}`, colors.red);
    return null;
  }
}

async function rollback(backupFile: string): Promise<void> {
  log('Starting rollback...', colors.yellow);
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Restore from backup
    const restoreCommand = `psql "${databaseUrl}" < "${backupFile}"`;
    execSync(restoreCommand, { shell: 'sh' });
    
    log('Rollback completed successfully', colors.green);
  } catch (error: any) {
    log(`Rollback failed: ${error.message}`, colors.red);
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  log('Running Prisma migrations...', colors.blue);
  
  try {
    const output = executeCommand('npx prisma migrate deploy');
    log(output, colors.green);
    log('Migrations completed successfully', colors.green);
  } catch (error: any) {
    log(`Migration failed: ${error.message}`, colors.red);
    throw error;
  }
}

async function generateMigrationClient(): Promise<void> {
  log('Generating Prisma Client...', colors.blue);
  
  try {
    const output = executeCommand('npx prisma generate');
    log(output, colors.green);
    log('Prisma Client generated successfully', colors.green);
  } catch (error: any) {
    log(`Prisma Client generation failed: ${error.message}`, colors.red);
    throw error;
  }
}

async function confirmRollback(backupFile: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question(`${colors.yellow}Migration failed. Do you want to rollback to the backup? (y/n): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  log('========================================', colors.cyan);
  log('Starting Prisma Migration with Logging', colors.cyan);
  log('========================================', colors.cyan);
  
  let backupFile: string | null = null;
  
  try {
    // Step 1: Create backup
    backupFile = await createBackup();
    
    // Step 2: Generate Prisma Client
    await generateMigrationClient();
    
    // Step 3: Run migrations
    await runMigrations();
    
    log('========================================', colors.green);
    log('Migration completed successfully! ✅', colors.green);
    log('========================================', colors.green);
    
    if (backupFile) {
      log(`Backup saved at: ${backupFile}`, colors.blue);
    }
    
    process.exit(0);
  } catch (error: any) {
    log('========================================', colors.red);
    log('Migration failed! ❌', colors.red);
    log('========================================', colors.red);
    log(`Error: ${error.message}`, colors.red);
    
    // Attempt rollback if backup exists
    if (backupFile) {
      const shouldRollback = await confirmRollback(backupFile);
      if (shouldRollback) {
        try {
          await rollback(backupFile);
          log('Rollback completed. Database restored to previous state.', colors.green);
        } catch (rollbackError: any) {
          log(`Rollback failed: ${rollbackError.message}`, colors.red);
          log('MANUAL INTERVENTION REQUIRED: Database may be in inconsistent state', colors.red);
        }
      } else {
        log('Rollback skipped. Database may be in inconsistent state.', colors.yellow);
      }
    } else {
      log('No backup available for rollback', colors.red);
    }
    
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// File: scripts/cleanup-dead-code.ts
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${prompt} (y/n): `);
  rl.close();
  return answer.toLowerCase() === 'y';
}

function runTsPrune(): string[] {
  try {
    const output = execSync('npx ts-prune', { encoding: 'utf8' });
    const results = output
      .split('\n')
      .filter(line => line.includes('is never used'))
      .map(line => line.split(' ')[0]);
    console.log('🧪 ts-prune results:', results);
    return results;
  } catch (err) {
    console.error('❌ ts-prune failed', err);
    return [];
  }
}

function runDepcheck(): { unused: string[]; missing: string[] } {
  try {
    const result = execSync('npx depcheck --json', { encoding: 'utf8' });
    const parsed = JSON.parse(result);
    return {
      unused: parsed.dependencies || [],
      missing: Object.keys(parsed.missing || {})
    };
  } catch (err) {
    console.error('❌ depcheck failed', err);
    return { unused: [], missing: [] };
  }
}

function deleteExport(file: string): void {
  try {
    const filePath = path.resolve(file);
    fs.unlinkSync(filePath);
    console.log(`🧹 Deleted: ${filePath}`);
  } catch (err) {
    console.warn(`⚠️ Could not delete ${file}:`, err.message);
  }
}

function uninstallDeps(deps: string[]): void {
  if (deps.length === 0) return;
  const cmd = `npm uninstall ${deps.join(' ')}`;
  console.log(`📦 Uninstalling: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

async function main(): Promise<void> {
  console.log('🔍 Running ts-prune...');
  const deadExports = runTsPrune();
  if (deadExports.length === 0) console.log('✅ No unused exports detected.');

  console.log('🔍 Running depcheck...');
  const { unused: deadDeps, missing: missingDeps } = runDepcheck();

  if (deadExports.length > 0 && (await confirm('Remove unused exports?'))) {
    deadExports.forEach(deleteExport);
  }

  if (
    deadDeps.length > 0 &&
    (await confirm('Uninstall unused dependencies?'))
  ) {
    uninstallDeps(deadDeps);
  }

  if (missingDeps.length > 0) {
    console.warn('⚠️ Missing dependencies detected:', missingDeps);
  }
}

main().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});

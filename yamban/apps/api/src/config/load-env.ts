import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The monorepo keeps one .env at the root. Load it whether the process
 * starts from the repo root or from apps/api. Variables already set win.
 */
export function loadRootEnv(): void {
  for (const candidate of ['.env', '../../.env']) {
    const file = resolve(process.cwd(), candidate);
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return;
    }
  }
}

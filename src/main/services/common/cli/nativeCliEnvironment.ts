import { homedir } from 'os';
import { delimiter, join } from 'path';

/** Add standard CLI installation folders to the inherited POSIX PATH without changing its priority. */
export function nativeCliEnvironment(): NodeJS.ProcessEnv {
    if (process.platform === 'win32') return process.env;
    const userHome = homedir();
    const directories = [
        ...(process.env.PATH ?? '').split(delimiter).filter(Boolean),
        join(process.env.BUN_INSTALL || join(userHome, '.bun'), 'bin'),
        join(userHome, '.opencode', 'bin'),
        join(userHome, '.local', 'bin'),
        '/opt/homebrew/bin',
        '/usr/local/bin',
    ];
    return { ...process.env, PATH: [...new Set(directories)].join(delimiter) };
}

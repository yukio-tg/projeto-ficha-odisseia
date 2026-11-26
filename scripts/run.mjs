// Roda um comando garantindo que o Java e o node_modules/.bin estejam no PATH.
// Uso: node scripts/run.mjs firebase emulators:start ...
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, delimiter, resolve } from 'node:path';

const env = { ...process.env };
const jdk = join(homedir(), '.local', 'jdk', 'current');
if (existsSync(join(jdk, 'bin', 'java'))) {
  env.JAVA_HOME = jdk;
  env.PATH = join(jdk, 'bin') + delimiter + env.PATH;
}
env.PATH = resolve('node_modules', '.bin') + delimiter + env.PATH;

const [cmd, ...args] = process.argv.slice(2);
const child = spawn(cmd, args, { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 1));

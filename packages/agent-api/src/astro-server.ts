import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

export class AstroDevServer {
  private process: ChildProcess | null = null;
  private ready = false;
  private websiteDir: string;

  constructor(websiteDir: string) {
    this.websiteDir = websiteDir;
  }

  async start(): Promise<void> {
    if (this.process) return;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Astro dev server timed out after 30s'));
      }, 30_000);

      this.process = spawn('npx', ['astro', 'dev'], {
        cwd: this.websiteDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[astro] ${output.trimEnd()}`);
        if (output.includes('localhost:4321') || output.includes('4321')) {
          this.ready = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error(`[astro:err] ${data.toString().trimEnd()}`);
      });

      this.process.on('error', (err) => {
        clearTimeout(timeout);
        this.ready = false;
        reject(err);
      });

      this.process.on('exit', (code) => {
        this.ready = false;
        this.process = null;
        if (code !== 0 && code !== null) {
          console.error(`[astro] exited with code ${code}`);
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    this.process.kill('SIGTERM');
    this.process = null;
    this.ready = false;
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  isReady(): boolean {
    return this.ready;
  }
}

export function createAstroServer(): AstroDevServer {
  const websiteDir = path.resolve(
    new URL('.', import.meta.url).pathname,
    '../../website',
  );
  return new AstroDevServer(websiteDir);
}

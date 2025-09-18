import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');
const docsAssetsDir = join(rootDir, 'docs', 'assets');

async function copyRecursive(sourceDir, destinationDir) {
  await mkdir(destinationDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = join(sourceDir, entry.name);
      const destinationPath = join(destinationDir, entry.name);

      if (entry.isDirectory()) {
        await copyRecursive(sourcePath, destinationPath);
        return;
      }

      const entryStat = await stat(sourcePath);
      if (!entryStat.isFile()) {
        return;
      }

      await copyFile(sourcePath, destinationPath);
    }),
  );
}

await copyRecursive(srcDir, docsAssetsDir);

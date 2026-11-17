/*
 * Vercel entrypoint: exports an Express app instead of calling listen().
 *
 * Vercel's filesystem is read-only except /tmp, and Juice Shop writes to several
 * relative paths (logs/, ftp/, i18n/, frontend/dist/.../uploads, uploads/). On a
 * cold start the writable parts are copied to /tmp and the working directory is
 * switched there before the server is loaded. State (in-memory SQLite DB, files)
 * is therefore ephemeral and rebuilt on every cold start.
 */
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'

async function bootstrap () {
  if (process.env.VERCEL) {
    const source = __dirname
    const target = '/tmp/juice-shop'
    for (const entry of ['config', 'data', 'encryptionkeys', 'frontend/dist', 'ftp', 'i18n', 'uploads', 'views', '.well-known', 'infrastructure', 'swagger.yml', 'ctf.key', 'package.json']) {
      const from = path.join(source, entry)
      if (fs.existsSync(from)) {
        fs.cpSync(from, path.join(target, entry), { recursive: true })
      }
    }
    // copies keep the read-only mode of the deployment bundle, so make them writable
    fs.chmodSync(target, 0o755)
    for (const entry of fs.readdirSync(target, { recursive: true, withFileTypes: true })) {
      const full = path.join(entry.parentPath, entry.name)
      fs.chmodSync(full, entry.isDirectory() ? 0o755 : 0o644)
    }
    fs.mkdirSync(path.join(target, 'logs'), { recursive: true })
    fs.mkdirSync(path.join(target, 'uploads/complaints'), { recursive: true })
    process.chdir(target)
  }
  const { createApp } = await import('./server')
  const { app } = await createApp({ inMemoryDb: true })
  return app
}

const ready = bootstrap()

const app = express()
app.use((req, res, next) => {
  ready.then(inner => inner(req, res, next), next)
})

export default app

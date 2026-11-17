/*
 * Vercel entrypoint: exports an Express app instead of calling listen().
 * State lives in an in-memory SQLite DB and is rebuilt on every cold start.
 */
import express from 'express'
import { createApp } from './server'

const ready = createApp({ inMemoryDb: true }).then(({ app }) => app)

const app = express()
app.use((req, res, next) => {
  ready.then(inner => inner(req, res, next), next)
})

export default app

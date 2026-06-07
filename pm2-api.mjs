import express from 'express'
import pm2 from 'pm2'

const app = express()
const PORT = 3001
let connected = false

function connect() {
  return new Promise((resolve, reject) => {
    if (connected) return resolve()
    pm2.connect(false, (err) => {
      if (err) return reject(err)
      connected = true
      resolve()
    })
  })
}

app.get('/api/pm2', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    await connect()
    pm2.list((err, list) => {
      if (err) {
        connected = false
        return res.status(500).json({ error: err.message })
      }
      const procs = list.map((p) => ({
        name: p.name,
        status: p.pm2_env?.status ?? 'unknown',
        cpu: p.monit?.cpu ?? 0,
        memory: p.monit?.memory ?? 0,
        uptime: p.pm2_env?.pm_uptime ?? null,
        restarts: p.pm2_env?.restart_time ?? 0,
        pid: p.pid,
        version: p.pm2_env?.version ?? null,
      }))
      res.json({ procs, ts: Date.now() })
    })
  } catch (err) {
    connected = false
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`PM2 stats API running on http://127.0.0.1:${PORT}/api/pm2`)
})

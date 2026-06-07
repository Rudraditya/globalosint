const express = require('express')
const pm2 = require('pm2')

const app = express()
const PORT = 3001
let connected = false

function connect(cb) {
  if (connected) return cb(null)
  pm2.connect(false, (err) => {
    if (err) return cb(err)
    connected = true
    cb(null)
  })
}

app.get('/api/pm2', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  connect((err) => {
    if (err) {
      connected = false
      return res.status(500).json({ error: err.message })
    }
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
      }))
      res.json({ procs, ts: Date.now() })
    })
  })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`PM2 stats API running on http://127.0.0.1:${PORT}/api/pm2`)
})

/* 本地验证：模拟 gh-pages 的目录结构
   /land-rights-prototype/        -> PC 产物（dist）
   /land-rights-prototype/farmer/ -> 农户端 H5 产物（dist/build/h5）
*/
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5190
const ROOT = 'D:/code/land_rights_prototype/pc/dist'
const FARMER = 'D:/code/land_rights_prototype/farmer/dist/build/h5'
const PREFIX = '/land-rights-prototype'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
}

function serve(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('404 Not Found: ' + filePath)
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  })
}

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0])
    if (!urlPath.startsWith(PREFIX)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('outside prefix')
      return
    }
    const rel = urlPath.slice(PREFIX.length)

    // 农户端：/land-rights-prototype/farmer/...
    if (rel === '/farmer' || rel.startsWith('/farmer/')) {
      let sub = rel.slice('/farmer'.length) || '/'
      if (sub.endsWith('/')) sub += 'index.html'
      const target = path.join(FARMER, sub)
      if (!fs.existsSync(target) && !sub.includes('.')) {
        return serve(res, path.join(FARMER, 'index.html'))
      }
      return serve(res, target)
    }

    // PC 端根路径
    let sub = rel || '/'
    if (sub.endsWith('/')) sub += 'index.html'
    const target = path.join(ROOT, sub)
    if (!fs.existsSync(target) && !path.extname(sub)) {
      return serve(res, path.join(ROOT, 'index.html'))
    }
    return serve(res, target)
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log('READY http://127.0.0.1:' + PORT + PREFIX + '/')
    console.log('  PC     -> ' + ROOT)
    console.log('  Farmer -> ' + FARMER)
  })

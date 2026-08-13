const fs = require('fs');
const data = fs.readFileSync('assets/icon.b64', 'utf8').trim();
fs.writeFileSync('assets/icon.png', Buffer.from(data, 'base64'));
console.log('HomeOS icon prepared');

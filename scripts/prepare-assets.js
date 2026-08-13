const fs = require('fs');
const zlib = require('zlib');

const width = 1024;
const height = 1024;
const bg = [22, 60, 42];
const fg = [245, 247, 243];
const raw = Buffer.alloc((width * 3 + 1) * height);

function isRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  if (x >= left + radius && x <= right - radius) return true;
  if (y >= top + radius && y <= bottom - radius) return true;
  const cx = x < left + radius ? left + radius : right - radius;
  const cy = y < top + radius ? top + radius : bottom - radius;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

for (let y = 0; y < height; y++) {
  const row = y * (width * 3 + 1);
  raw[row] = 0;
  for (let x = 0; x < width; x++) {
    let color = bg;

    const roofHalf = y >= 230 && y <= 470 ? ((y - 230) * 292) / 240 : -1;
    const inRoof = roofHalf >= 0 && Math.abs(x - 512) <= roofHalf;
    const inBody = isRoundedRect(x, y, 285, 440, 739, 790, 70);
    const inDoor = isRoundedRect(x, y, 458, 585, 566, 790, 32);
    const inLeftWindow = isRoundedRect(x, y, 360, 550, 430, 620, 20);
    const inRightWindow = isRoundedRect(x, y, 594, 550, 664, 620, 20);
    const knobDx = x - 544;
    const knobDy = y - 689;
    const inKnob = knobDx * knobDx + knobDy * knobDy <= 81;

    if (inRoof || inBody) color = fg;
    if (inDoor || inLeftWindow || inRightWindow) color = bg;
    if (inKnob) color = fg;

    const i = row + 1 + x * 3;
    raw[i] = color[0];
    raw[i + 1] = color[1];
    raw[i + 2] = color[2];
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 2;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND'),
]);

fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/icon.png', png);
fs.writeFileSync('assets/adaptive-icon.png', png);
console.log(`HomeOS icon prepared (${png.length} bytes)`);

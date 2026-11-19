import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const CREAM: RGB = [244, 239, 228];
const INK: RGB = [18, 18, 18];
const NAVY: RGB = [31, 42, 68];
const RED: RGB = [179, 35, 42];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [90, 92, 96];
const LIGHTBLUE: RGB = [207, 224, 232];
const TAN: RGB = [217, 196, 138];
const DARKTAN: RGB = [150, 128, 80];
const GOLD: RGB = [212, 175, 55];
const SKY: RGB = [168, 205, 225];
const DARKNIGHT: RGB = [22, 30, 58];
const GREEN: RGB = [46, 110, 70];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
}
function outlineRect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c); fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c); fillRect(x + w - t, y, t, h, c);
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r * r) setPx(x, y, c);
  }
}
function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (let n = 0; n < 4000; n++) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
function fillPoly(pts: [number, number][], c: RGB): void {
  let minY = H, maxY = 0;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = xs[k]; x <= xs[k + 1]; x++) setPx(x, y, c);
    }
  }
}

// ---- bitmap font 5x7 ----
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
};
function textWidth(t: string, s: number): number {
  if (t.length === 0) return 0;
  return t.length * (6 * s) - s;
}
function drawText(x: number, y: number, t: string, s: number, c: RGB, bold = false): void {
  const up = t.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = FONT[up[ci]] || FONT[" "];
    const ox = x + ci * 6 * s;
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") {
        fillRect(ox + col * s, y + r * s, s, s, c);
        if (bold) fillRect(ox + col * s + 1, y + r * s, s, s, c);
      }
    }
  }
}
function drawTextCentered(cx: number, y: number, t: string, s: number, c: RGB, bold = false): void {
  drawText(cx - Math.floor(textWidth(t, s) / 2), y, t, s, c, bold);
}
function wrapText(t: string, maxW: number, s: number): string[] {
  const words = t.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, s) <= maxW) cur = trial;
    else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, t: string, s: number, c: RGB, maxW: number, lineH: number, bold = false): number {
  const lines = wrapText(t, maxW, s);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lineH, lines[i], s, c, bold);
  return y + lines.length * lineH;
}

// ---- PNG encoder ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(buf.subarray(y * W * 3, (y + 1) * W * 3)).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- scenes ----
function flagUS(x: number, y: number, w: number, h: number): void {
  for (let i = 0; i < 7; i++) fillRect(x, y + Math.floor(i * h / 7), w, Math.ceil(h / 7), i % 2 === 0 ? RED : WHITE);
  fillRect(x, y, Math.floor(w * 0.4), Math.floor(h * 0.55), NAVY);
  for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) fillRect(x + 2 + cc * 6, y + 2 + r * 5, 2, 2, WHITE);
}
function flagCN(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, RED);
  fillCircle(x + 8, y + 8, 4, GOLD);
  fillCircle(x + 20, y + 5, 2, GOLD); fillCircle(x + 24, y + 10, 2, GOLD); fillCircle(x + 20, y + 15, 2, GOLD);
}
function flagRU(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, Math.ceil(h / 3), WHITE);
  fillRect(x, y + Math.floor(h / 3), w, Math.ceil(h / 3), NAVY);
  fillRect(x, y + Math.floor(2 * h / 3), w, h - Math.floor(2 * h / 3), RED);
}
function drawLeader(x: number, y: number, shirt: RGB, skin: RGB): void {
  fillCircle(x + 10, y, 9, skin);
  fillRect(x + 2, y + 9, 16, 16, shirt);
}
function lead1(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + h - 18, w, 18, [120, 90, 60]);
  fillRect(x + 30, y + h - 34, w - 60, 16, [90, 65, 40]);
  flagUS(x + 28, y + 6, 44, 26);
  flagCN(x + w / 2 - 22, y + 6, 44, 26);
  flagRU(x + w - 72, y + 6, 44, 26);
  drawLeader(x + 32, y + 48, NAVY, [230, 190, 150]);
  drawLeader(x + w / 2 - 10, y + 48, RED, [235, 200, 160]);
  drawLeader(x + w - 52, y + 48, [60, 60, 80], [225, 185, 145]);
}
function lead2(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, DARKNIGHT);
  for (let i = 0; i < 40; i++) {
    const sx = x + ((i * 53) % w), sy = y + ((i * 29) % 30);
    fillRect(sx, sy, 2, 2, WHITE);
  }
  const bw = [46, 62, 40, 70, 52, 58];
  let bx = x + 8;
  for (let i = 0; i < 6; i++) {
    const bh = 34 + ((i * 17) % 30);
    fillRect(bx, y + h - bh - 12, bw[i], bh, [40, 52, 90]);
    for (let wy = 0; wy < 3; wy++) fillRect(bx + 6, y + h - bh + 4 + wy * 10, 6, 5, GOLD);
    bx += bw[i] + 4;
  }
  drawText(x + w - 78, y + 8, "VI", 4, [255, 80, 200]);
  fillRect(x + 18, y + h - 26, 66, 16, [30, 30, 34]);
  fillCircle(x + 30, y + h - 18, 5, RED); fillCircle(x + 70, y + h - 18, 5, WHITE);
  fillRect(x + 44, y + h - 24, 14, 4, WHITE);
}
function lead3(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [214, 226, 232]);
  fillPoly([[x + 20, y + 30], [x + w / 2, y + 6], [x + w - 20, y + 30]], NAVY);
  fillRect(x + 30, y + 30, w - 60, 8, NAVY);
  for (let i = 0; i < 4; i++) fillRect(x + 40 + i * 62, y + 38, 12, 34, WHITE);
  fillRect(x + 24, y + 72, w - 48, 8, NAVY);
  const cx = x + w / 2;
  drawLine(cx, y + 18, cx, y + 62, INK);
  drawLine(cx - 26, y + 26, cx + 26, y + 26, INK);
  fillPoly([[cx - 34, y + 26], [cx - 18, y + 26], [cx - 26, y + 44]], GOLD);
  fillPoly([[cx + 18, y + 26], [cx + 34, y + 26], [cx + 26, y + 44]], GOLD);
  fillRect(cx - 3, y + 62, 6, 8, INK);
}

// featured icons: each draws in (x,y,w=240,h=40)
function iconSpace(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, DARKNIGHT);
  for (let i = 0; i < 18; i++) fillRect(x + ((i * 37) % w), y + ((i * 23) % h), 2, 2, WHITE);
  const cx = x + w / 2;
  fillRect(cx - 4, y + 8, 8, 18, WHITE);
  fillPoly([[cx - 4, y + 8], [cx + 4, y + 8], [cx, y + 1]], RED);
  fillPoly([[cx - 4, y + 20], [cx - 11, y + 28], [cx - 4, y + 26]], RED);
  fillPoly([[cx + 4, y + 20], [cx + 11, y + 28], [cx + 4, y + 26]], RED);
  fillCircle(cx, y + 31, 4, GOLD);
  fillCircle(x + 26, y + 12, 4, GOLD);
}
function iconCyclone(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + h - 12, w, 12, TAN);
  fillCircle(x + w / 2, y + h / 2, 16, WHITE);
  fillCircle(x + w / 2, y + h / 2, 11, SKY);
  fillCircle(x + w / 2, y + h / 2, 6, WHITE);
  fillCircle(x + w / 2, y + h / 2, 2, NAVY);
}
function iconTank(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [226, 214, 180]);
  drawLine(x, y + h - 8, x + w, y + h - 8, INK);
  fillRect(x + 60, y + 12, 90, 12, [70, 80, 60]);
  fillRect(x + 130, y + 15, 60, 5, [70, 80, 60]);
  fillRect(x + 55, y + 24, 100, 10, [90, 100, 80]);
  for (let i = 0; i < 5; i++) fillCircle(x + 65 + i * 18, y + h - 12, 5, INK);
}
function iconStamp(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, WHITE);
  outlineRect(x + 50, y + 4, 140, h - 8, RED, 3);
  drawText(x + 62, y + 13, "SANCTION", 2, RED, true);
}
function iconCapitol(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  const cx = x + w / 2;
  fillPoly([[cx - 16, y + 18], [cx - 14, y + 8], [cx - 8, y + 3], [cx, y + 1], [cx + 8, y + 3], [cx + 14, y + 8], [cx + 16, y + 18]], WHITE);
  fillRect(cx - 16, y + 18, 32, 6, WHITE);
  for (let i = 0; i < 5; i++) fillRect(cx - 44 + i * 20, y + 24, 8, 14, WHITE);
  fillRect(cx - 52, y + 36, 104, 4, WHITE);
}
function iconEuro(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, NAVY);
  fillCircle(x + w / 2, y + h / 2, 16, GOLD);
  drawText(x + w / 2 - 5, y + h / 2 - 7, "E", 2, NAVY, true);
  drawText(x + 14, y + 12, "45BN", 2, WHITE, true);
}
function iconHandshake(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [220, 232, 240]);
  flagUS(x + 16, y + 4, 40, 22);
  fillRect(x + w - 56, y + 4, 40, 22, [0, 56, 168]);
  fillRect(x + w - 56, y + 4, 40, 7, WHITE);
  fillCircle(x + w - 36, y + 15, 4, GOLD);
  fillRect(x + 70, y + 26, 50, 10, [230, 190, 150]);
  fillRect(x + 120, y + 26, 50, 10, [200, 160, 120]);
}
function iconFlags2(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x + 30, y + 5, 56, 30, [255, 153, 51]);
  fillRect(x + 30, y + 15, 56, 10, WHITE);
  fillRect(x + 30, y + 25, 56, 10, [19, 136, 8]);
  fillCircle(x + 58, y + 20, 5, NAVY);
  fillRect(x + w - 86, y + 5, 56, 30, WHITE);
  fillCircle(x + w - 58, y + 20, 9, RED);
  fillRect(x + 60, y + 36, w - 120, 4, [90, 65, 40]);
}
function iconHeli(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  for (let i = 0; i < 5; i++) fillRect(x + 10 + i * 46, y + h - 12, 30, 12, [120, 130, 145]);
  drawLine(x + 60, y + 8, x + 180, y + 8, INK);
  fillRect(x + 80, y + 12, 80, 14, RED);
  fillRect(x + 150, y + 16, 30, 6, RED);
  fillCircle(x + 95, y + 19, 4, WHITE);
  drawLine(x + 90, y + 26, x + 80, y + 34, INK);
  drawLine(x + 140, y + 26, x + 150, y + 34, INK);
}
function iconWarn(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [235, 235, 235]);
  fillPoly([[x + w / 2, y + 3], [x + w / 2 - 20, y + 36], [x + w / 2 + 20, y + 36]], GOLD);
  outlineRect(x + w / 2 - 2, y + 12, 4, 14, INK);
  fillRect(x + w / 2 - 2, y + 29, 4, 4, INK);
  drawText(x + 12, y + 12, "AI", 2, RED, true);
}
function iconPin(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, LIGHTBLUE);
  fillPoly([[x + 20, y + 8], [x + 90, y + 4], [x + 130, y + 14], [x + 200, y + 6], [x + 220, y + 30], [x + 120, y + 34], [x + 60, y + 30], [x + 20, y + 8]], TAN);
  fillCircle(x + w / 2, y + 16, 9, RED);
  fillPoly([[x + w / 2 - 6, y + 22], [x + w / 2 + 6, y + 22], [x + w / 2, y + 36]], RED);
  fillCircle(x + w / 2, y + 16, 3, WHITE);
}
function iconBallot(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [230, 228, 220]);
  fillRect(x + 80, y + 12, 80, 24, NAVY);
  fillRect(x + 95, y + 18, 50, 3, WHITE);
  const sx = x + w / 2;
  fillRect(sx - 2, y + 2, 4, 10, GOLD);
  fillRect(sx - 6, y + 5, 12, 4, GOLD);
}

// ---- world map ----
function project(lon: number, lat: number, mx: number, my: number, mw: number, mh: number): [number, number] {
  const x = mx + ((lon + 180) / 360) * mw;
  const y = my + ((90 - lat) / 150) * mh;
  return [Math.round(x), Math.round(y)];
}
function drawMap(mx: number, my: number, mw: number, mh: number): void {
  fillRect(mx, my, mw, mh, LIGHTBLUE);
  outlineRect(mx, my, mw, mh, INK, 2);
  const continents: [number, number][][] = [
    [[-168, 66], [-140, 70], [-120, 72], [-95, 80], [-80, 73], [-60, 60], [-55, 47], [-70, 42], [-75, 35], [-80, 26], [-85, 20], [-95, 18], [-105, 20], [-115, 28], [-125, 40], [-125, 50], [-150, 60], [-168, 66]],
    [[-80, 10], [-60, 8], [-50, 0], [-40, -5], [-35, -10], [-40, -20], [-50, -30], [-60, -40], [-70, -55], [-75, -35], [-80, -20], [-80, 0]],
    [[-10, 36], [0, 40], [10, 44], [20, 45], [30, 40], [30, 36], [20, 38], [10, 38], [0, 44], [-5, 48], [-10, 50], [-5, 55], [5, 58], [10, 60], [20, 70], [30, 70], [40, 68], [30, 60], [20, 55], [10, 55]],
    [[-17, 15], [-10, 30], [0, 35], [10, 37], [20, 32], [30, 31], [35, 28], [43, 12], [51, 11], [48, 0], [40, -10], [35, -20], [30, -30], [20, -35], [15, -30], [12, -18], [13, -5], [9, 4], [-8, 5], [-17, 15]],
    [[40, 70], [60, 70], [80, 73], [110, 76], [140, 72], [170, 66], [180, 65], [160, 60], [140, 50], [130, 42], [127, 35], [120, 30], [110, 20], [108, 10], [100, 8], [95, 15], [90, 22], [80, 15], [75, 8], [70, 20], [60, 25], [50, 30], [40, 36], [40, 45], [50, 60], [40, 70]],
    [[113, -22], [130, -12], [142, -11], [150, -20], [153, -27], [146, -39], [140, -38], [130, -32], [115, -35], [113, -22]],
  ];
  for (const cont of continents) {
    const pts = cont.map(([lo, la]) => project(lo, la, mx, my, mw, mh));
    fillPoly(pts, TAN);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      drawLine(a[0], a[1], b[0], b[1], DARKTAN);
    }
  }
  const dots: [number, number, number][] = [
    [114, 22.5, 1], [-74, 40, 2], [4.3, 52.1, 3], [-118, 34, 4], [80, 16, 5],
    [34.5, 31.5, 6], [149, -35, 7], [-77, 39, 8], [4.35, 50.85, 9], [121, 14.6, 10],
    [139.7, 35.7, 11], [-66.9, 10.5, 12], [-73, 38, 13], [45.3, 2, 14], [-150, 64, 15],
  ];
  const offsets: Record<number, [number, number]> = {
    1: [-14, -9], 2: [-17, -11], 3: [-17, -7], 8: [-13, 11], 9: [11, 5], 10: [13, 7], 13: [15, 9],
  };
  for (const [lo, la, n] of dots) {
    const [px, py] = project(lo, la, mx, my, mw, mh);
    const off = offsets[n] || [0, 0];
    const dx = px + off[0], dy = py + off[1];
    fillCircle(dx, dy, 9, RED);
    const s = String(n);
    drawText(dx - Math.floor(textWidth(s, 1) / 2), dy - 3, s, 1, WHITE);
  }
}

// ---- build page ----
fillRect(0, 0, W, H, CREAM);
// masthead
fillRect(0, 0, W, 115, NAVY);
drawText(16, 14, "THE WORLD IN ONE DAY", 2, WHITE);
const rightTop = "35 STORIES - 6 CONTINENTS - ONE DAY";
drawText(W - 16 - textWidth(rightTop, 2), 14, rightTop, 2, WHITE);
drawTextCentered(W / 2, 46, "THURSDAY 19 NOVEMBER 2026", 6, WHITE, true);
fillRect(0, 111, W, 4, RED);

// leads
type Lead = { kicker: string; head: string; deck: string; scene: (x: number, y: number, w: number, h: number) => void };
const leads: Lead[] = [
  { kicker: "ASIA - DIPLOMACY", head: "TRUMP, XI AND PUTIN MEET IN SHENZHEN", deck: "FIRST-EVER TRILATERAL; NUCLEAR ARMS ON THE TABLE AS NEW START LAPSES", scene: lead1 },
  { kicker: "CULTURE - GAMING", head: "GTA VI LAUNCHES WORLDWIDE TO A 99 SCORE", deck: "13 YEARS AFTER GTA V; 17M COPIES SOLD BEFORE LAUNCH DAY", scene: lead2 },
  { kicker: "LAW - JUSTICE", head: "WORLD COURT RULES ON MYANMAR GENOCIDE CASE", deck: "ICJ DELIVERS VERDICT IN GAMBIA'S ROHINGYA CASE AFTER SEVEN YEARS", scene: lead3 },
];
const leadY = 122, leadH = 236, leadW = 322;
leads.forEach((L, i) => {
  const x = 16 + i * (leadW + 12);
  outlineRect(x, leadY, leadW, leadH, INK, 2);
  L.scene(x + 2, leadY + 2, leadW - 4, 78);
  drawText(x + 8, leadY + 88, String(i + 1), 2, RED, true);
  drawText(x + 24, leadY + 88, L.kicker, 2, RED, true);
  drawWrapped(x + 8, leadY + 108, L.head, 3, INK, leadW - 16, 21, true);
  const deckLines = wrapText(L.deck, leadW - 16, 2);
  const deckY = leadY + 108 + wrapText(L.head, leadW - 16, 3).length * 21 + 5;
  for (let d = 0; d < deckLines.length; d++) drawText(x + 8, deckY + d * 15, deckLines[d], 2, GREY);
});

// featured grid
type Feat = { n: number; kicker: string; head: string; deck: string; icon: (x: number, y: number, w: number, h: number) => void };
const feats: Feat[] = [
  { n: 4, kicker: "SCIENCE - SPACE", head: "VOYAGER 1 NOW A LIGHT-DAY FROM EARTH", deck: "NASA CONFIRMS THE MILESTONE; A SIGNAL TAKES A DAY TO REACH IT", icon: iconSpace },
  { n: 5, kicker: "ASIA - WEATHER", head: "CYCLONE AKVAN BEARS DOWN ON INDIA", deck: "VERY SEVERE STORM DUE ASHORE FRIDAY; SCHOOLS SHUT IN SIX DISTRICTS", icon: iconCyclone },
  { n: 6, kicker: "MIDDLE EAST - GAZA", head: "ISRAEL SENDS TANKS INTO CENTRAL GAZA", deck: "FIRST GROUND OPERATION SINCE THE CEASEFIRE; THREE KILLED, MEDICS SAY", icon: iconTank },
  { n: 7, kicker: "AUSTRALIA - SANCTIONS", head: "AUSTRALIA SANCTIONS SETTLER LEADER WEISS", deck: "THREE PEOPLE, FOUR ENTITIES HIT OVER WEST BANK EXPANSION", icon: iconStamp },
  { n: 8, kicker: "US - POLITICS", head: "DEMOCRATS NOMINATE JEFFRIES FOR SPEAKER", deck: "251-11 VOTE PUTS HIM IN LINE AS FIRST BLACK SPEAKER", icon: iconCapitol },
  { n: 9, kicker: "EUROPE - UKRAINE AID", head: "EU PROPOSES 45BN LOAN FOR UKRAINE", deck: "TWO-THIRDS OF KYIV'S 2027 GAP; REPAID ONLY BY RUSSIA", icon: iconEuro },
  { n: 10, kicker: "TRADE - ASIA", head: "TRUMP CLAIMS 'VERY BIG' PHILIPPINES DEAL", deck: "ANNOUNCED IN MANILA; NO DETAILS GIVEN", icon: iconHandshake },
  { n: 11, kicker: "ASIA - DEFENCE", head: "INDIA AND JAPAN HOLD 2+2 TALKS IN TOKYO", deck: "SINGH AND JAISHANKAR MEET KOIZUMI AND MOTEGI", icon: iconFlags2 },
  { n: 12, kicker: "AMERICAS - VENEZUELA", head: "HEGSETH VISITS CARACAS AFTER MADURO'S FALL", deck: "US AND VENEZUELA TO HUNT NARCOTERRORISTS TOGETHER", icon: iconHeli },
  { n: 13, kicker: "US - SECURITY", head: "SENATORS WARN AI CYBER THREATS OUTPACE DEFENCES", deck: "WHITE HOUSE TOLD ATTACKS ARE OUTRUNNING PROTECTIONS", icon: iconWarn },
  { n: 14, kicker: "AFRICA - DIPLOMACY", head: "SOMALIA ACCUSES UAE OF SECRET BASES", deck: "MOGADISHU SAYS UAE BUILT BASES WITHOUT APPROVAL", icon: iconPin },
  { n: 15, kicker: "US - ELECTIONS", head: "PELTOLA WINS ALASKA; DEMOCRATS TAKE 56-44", deck: "NINTH SENATE FLIP GIVES PARTY ITS WIDEST MAJORITY SINCE 2009", icon: iconBallot },
];
const featY0 = 366, featH = 132, featW = 240;
feats.forEach((F, i) => {
  const col = i % 4, row = Math.floor(i / 4);
  const x = 16 + col * (featW + 10);
  const y = featY0 + row * (featH + 5);
  outlineRect(x, y, featW, featH, INK, 1);
  F.icon(x + 2, y + 2, featW - 4, 36);
  drawText(x + 6, y + 42, String(F.n), 1, RED, true);
  drawText(x + 6 + textWidth(String(F.n), 1) + 4, y + 42, F.kicker, 1, RED, true);
  const headLines = wrapText(F.head, featW - 12, 2);
  let cy = y + 53;
  for (let k = 0; k < headLines.length; k++) { drawText(x + 6, cy, headLines[k], 2, INK, true); cy += 15; }
  cy += 2;
  const deckLines = wrapText(F.deck, featW - 12, 1);
  for (let k = 0; k < deckLines.length; k++) { drawText(x + 6, cy, deckLines[k], 1, GREY, true); cy += 10; }
});

// bottom band
const botY = 782;
drawLine(16, botY - 6, W - 16, botY - 6, INK);
drawText(16, botY, "WHERE IT HAPPENED", 2, INK, true);
drawText(502, botY, "ALSO ON THURSDAY 19 NOVEMBER", 2, INK, true);
drawMap(16, botY + 22, 470, 132);
drawText(16, botY + 160, "NUMBERED DOTS MARK STORIES 1-15.", 1, GREY);

const alsoLeft: string[] = [
  "16. US: NSA COMMS SYSTEM GOES DOWN",
  "17. DEUTSCHE BANK, $582M EPSTEIN DEALS",
  "18. TOUGHER GREEN-CARD RULES PROPOSED",
  "19. ISLAM SET TO BE LARGEST FAITH BY 2035",
  "20. LPG TANKER SUNK OFF BULGARIA",
  "21. SAUDI ARABIA SAYS DANGER PASSED",
  "22. LIBYA: COCAINE AND PILLS SEIZED",
  "23. CANADA SEEKS US DEAL, ADJUSTS CHINA",
  "24. MELENCHON COULD WIN PRESIDENCY",
  "25. RUSSIA ACCUSES FRANCE ON UKRAINE",
];
const alsoRight: string[] = [
  "26. IRAQ JAILS SIX FRENCH FOR LIFE",
  "27. INDIA: MODI MEETS PRINCE, PRINCESS",
  "28. EARTH MISSING A BILLION YEARS",
  "29. DUCKETT HITS 133 AS ENGLAND LEAD",
  "30. ATMOSPHERIC RIVER FLOODS CALIFORNIA",
  "31. FREE 150,000 TENTS AS CAMPS FLOOD",
  "32. TRUMP 'UNHAPPY VANCE ON IRAN WAR'",
  "33. MERCK LAUNCHES RABIES VACCINE",
  "34. INDIA: PANEL ON PRO LEAGUES FORMED",
  "35. GTA VI NOMINATED FOR GAME OF YEAR",
];
function drawAlsoCol(items: string[], cx: number): void {
  let cy = botY + 22;
  for (const it of items) {
    const lines = wrapText(it, 250, 1);
    for (let k = 0; k < lines.length; k++) { drawText(cx, cy, lines[k], 1, INK); cy += 9; }
    cy += 4;
  }
}
drawAlsoCol(alsoLeft, 502);
drawAlsoCol(alsoRight, 756);

// footer
drawLine(16, 984, W - 16, 984, INK);
const foot1 = "EVERY STORY HAPPENED OR WAS FIRST REPORTED ON THURSDAY 19 NOVEMBER 2026.";
const foot2 = "DISPUTED CLAIMS ARE ATTRIBUTED. SOURCES: AP, REUTERS, AFP, BBC, AL JAZEERA, UN NEWS. ORIGINAL DRAWINGS.";
drawTextCentered(W / 2, 990, foot1, 1, GREY);
drawTextCentered(W / 2, 1001, foot2, 1, GREY);

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outDir + "/entry.png", encodePNG());

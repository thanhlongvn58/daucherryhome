// Minimal mDNS responder: answers "A" queries for <name>.local with this machine's LAN IPv4 addresses,
// so phones on the home Wi-Fi can open http://<name>.local without knowing the IP. No dependencies.
import dgram from 'node:dgram';
import os from 'node:os';

const GROUP = '224.0.0.251', PORT = 5353, TTL = 120;

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) {
    if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push(a.address);
  }
  return out;
}
function encodeName(name) {
  const parts = name.split('.').filter(Boolean).map(l => { const b = Buffer.from(l, 'utf8'); return Buffer.concat([Buffer.from([b.length]), b]); });
  return Buffer.concat([...parts, Buffer.from([0])]);
}
function readName(buf, off) {
  const labels = []; let jumped = false, end = off, guard = 0;
  while (guard++ < 64) {
    const len = buf[off];
    if (len === undefined) return null;
    if (len === 0) { if (!jumped) end = off + 1; break; }
    if ((len & 0xc0) === 0xc0) { if (!jumped) end = off + 2; off = ((len & 0x3f) << 8) | buf[off + 1]; jumped = true; continue; }
    labels.push(buf.toString('utf8', off + 1, off + 1 + len)); off += 1 + len;
  }
  return { name: labels.join('.').toLowerCase(), end };
}
function answerRecords(fqdn, ips, cacheFlush) {
  const name = encodeName(fqdn);
  return ips.map(ip => {
    const rr = Buffer.alloc(10 + 4);
    rr.writeUInt16BE(1, 0);                         // TYPE A
    rr.writeUInt16BE(cacheFlush ? 0x8001 : 1, 2);   // CLASS IN (+ cache-flush bit)
    rr.writeUInt32BE(TTL, 4);
    rr.writeUInt16BE(4, 8);
    ip.split('.').forEach((p, i) => rr.writeUInt8(+p, 10 + i));
    return Buffer.concat([name, rr]);
  });
}
function packet({ id = 0, questions = [], answers = [] }) {
  const h = Buffer.alloc(12);
  h.writeUInt16BE(id, 0); h.writeUInt16BE(0x8400, 2);   // response, authoritative
  h.writeUInt16BE(questions.length, 4); h.writeUInt16BE(answers.length, 6);
  return Buffer.concat([h, ...questions, ...answers]);
}

export function startMdns(hostname, log = console.log) {
  const fqdn = `${hostname}.local`.toLowerCase();
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const announce = () => { const ips = lanAddresses(); if (ips.length) sock.send(packet({ answers: answerRecords(fqdn, ips, true) }), PORT, GROUP); };

  sock.on('message', (msg, rinfo) => {
    if (msg.length < 12 || (msg.readUInt16BE(2) & 0x8000)) return;   // ignore responses
    const qd = msg.readUInt16BE(4); let off = 12; let asked = null;
    for (let i = 0; i < qd; i++) {
      const n = readName(msg, off); if (!n) return;
      const type = msg.readUInt16BE(n.end), klass = msg.readUInt16BE(n.end + 2);
      if (n.name === fqdn && (type === 1 || type === 255)) asked = { start: off, end: n.end + 4, unicast: !!(klass & 0x8000) };
      off = n.end + 4;
    }
    if (!asked) return;
    const ips = lanAddresses(); if (!ips.length) return;
    if (rinfo.port !== PORT) {      // legacy unicast query: echo id + question, reply directly
      sock.send(packet({ id: msg.readUInt16BE(0), questions: [msg.subarray(asked.start, asked.end)], answers: answerRecords(fqdn, ips, false) }), rinfo.port, rinfo.address);
    } else if (asked.unicast) {
      sock.send(packet({ answers: answerRecords(fqdn, ips, true) }), rinfo.port, rinfo.address);
    } else {
      sock.send(packet({ answers: answerRecords(fqdn, ips, true) }), PORT, GROUP);
    }
  });
  sock.on('error', e => { log(`Không phát được tên ${fqdn} (${e.code || e.message}). Vẫn có thể mở bằng địa chỉ IP.`); try { sock.close(); } catch { /* closed */ } });
  sock.bind(PORT, () => {
    try { sock.setMulticastTTL(255); sock.setMulticastLoopback(true); } catch { /* optional */ }
    for (const ip of lanAddresses()) { try { sock.addMembership(GROUP, ip); } catch { /* interface may not support multicast */ } }
    announce(); setTimeout(announce, 1000);
  });
  const timer = setInterval(announce, 60_000); timer.unref?.();
  return { name: fqdn, addresses: lanAddresses, close: () => { clearInterval(timer); try { sock.close(); } catch { /* closed */ } } };
}

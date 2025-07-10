// scripts/gen_sample_data.js
const fs = require('fs');
const path = require('path');

const N = 500;               // total points
const deltaMs = 60_000;      // one minute between points
const startTs = Date.now() - N * deltaMs;
let value = 100;             // starting value

const out = [];
for (let i = 0; i < N; i++) {
  // simple random walk:
  value += (Math.random() - 0.5) * 2; 
  out.push({
    timestamp: startTs + i * deltaMs,
    value: Number(value.toFixed(2)),
  });
}

// write to data/sample_data.json
fs.writeFileSync(
  path.join(__dirname, '../data/sample_data.json'),
  JSON.stringify(out, null, 2)
);

console.log(`Wrote ${N} points to data/sample_data.json`);

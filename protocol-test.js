const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

// Configuration
const CHART_TYPE = "candlestick"; // Change to "line" or others as needed

// Sample data for each chart type
const chartSamples = {
  line: [
    { timestamp: 1710000000, value: 100.1 },
    { timestamp: 1710000001, value: 102.5 }
  ],
  candlestick: [
    { timestamp: 1710000000, open: 100, high: 105, low: 95, close: 102 },
    { timestamp: 1710000060, open: 102, high: 106, low: 101, close: 104 }
  ]
};

// Step 1: Format input string
const inputText = `${CHART_TYPE}\n${JSON.stringify(chartSamples[CHART_TYPE], null, 2)}`;

// Step 2: Write to data/sample_data.json
const samplePath = path.join(__dirname, "data", "sample_data.json");

fs.writeFileSync(samplePath, inputText, "utf-8");
console.log(`[test] Wrote ${CHART_TYPE} test data to sample_data.json`);

// Step 3: Run the C++ backend
exec("./backend/bin/charting-backend", (err, stdout, stderr) => {
  if (err) {
    console.error("[test] Execution failed:", err);
    return;
  }
  if (stderr) {
    console.warn("[test] stderr:", stderr);
  }

  console.log("[test] Backend response:");
  try {
    const json = JSON.parse(stdout.trim());
    console.dir(json, { depth: null });
  } catch (e) {
    console.log(stdout);
    console.error("[test] Invalid JSON response.");
  }
});

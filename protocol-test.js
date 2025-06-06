const Ajv = require("ajv");
const ajv = new Ajv();

// 1. Example drawSeries JSON
const exampleDrawSeries = {
  type: "drawSeries",
  pane: "pricePane",
  seriesId: "price",
  style: { type: "line", color: "#22ff88", thickness: 2 },
  vertices: [ -1, 0.0, -0.8, 0.1, -0.6, -0.1 ]
};

const drawSeriesSchema = {
  type: "object",
  properties: {
    type: { const: "drawSeries" },
    pane: { type: "string" },
    seriesId: { type: "string" },
    style: {
      type: "object",
      properties: {
        type: { enum: ["line", "candlestick", "histogram"] },
        color: { type: "string" },
        upColor: { type: "string" },
        downColor: { type: "string" },
        thickness: { type: "integer", minimum: 1 }
      },
      required: ["type", "thickness"],
      additionalProperties: false
    },
    vertices: {
      type: "array",
      items: { type: "number" },
      minItems: 4
    }
  },
  required: ["type", "pane", "seriesId", "style", "vertices"],
  additionalProperties: false
};

const validate = ajv.compile(drawSeriesSchema);
console.log("drawSeries valid?", validate(exampleDrawSeries));
if (!validate(exampleDrawSeries)) console.error(validate.errors);

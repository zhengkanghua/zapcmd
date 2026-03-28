"use strict";

const path = require("node:path");

const DIST_DIR = path.resolve("dist");
const VISUAL_ENTRY_DIST_PATH = path.join(DIST_DIR, "visual.html");

const SCREENSHOTS = [
  {
    id: "settings-ui-overview",
    hash: "settings-ui-overview",
    width: 1100,
    height: 900,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "settings-ui-dropdown-open",
    hash: "settings-ui-dropdown-open",
    width: 1100,
    height: 900,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "settings-ui-slider",
    hash: "settings-ui-slider",
    width: 1100,
    height: 900,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "settings-ui-hotkey-recorder",
    hash: "settings-ui-hotkey-recorder",
    width: 1100,
    height: 900,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "settings-appearance-motion-preset",
    hash: "settings-appearance-motion-preset",
    width: 1400,
    height: 1800,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "launcher-motion-surfaces-expressive",
    hash: "launcher-motion-surfaces-expressive",
    width: 1400,
    height: 1800,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  },
  {
    id: "launcher-motion-surfaces-steady-tool",
    hash: "launcher-motion-surfaces-steady-tool",
    width: 1400,
    height: 1800,
    maxDiffRatio: 0.005,
    pixelTolerance: 0,
    sampleStep: 1
  }
];

module.exports = {
  DIST_DIR,
  SCREENSHOTS,
  VISUAL_ENTRY_DIST_PATH
};

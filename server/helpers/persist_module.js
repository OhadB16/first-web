// server/helpers/persist_module.js
const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function resolveDataPath(file) {
  return path.isAbsolute(file) ? file : path.join(DATA_DIR, file);
}

/**
 * loadJSON
 * --------
 * Loads JSON data from disk asynchronously (non-blocking).
 *
 * @param {string} file - File name or path (relative to server/data if not absolute).
 * @param {*} [defaultValue=[]] - Default value to return if the file doesn’t exist or an error occurs.
 * @returns {Promise<*>} The parsed JSON data, or a copy of defaultValue.
 */
async function loadJSON(file, defaultValue = []) {
  const p = resolveDataPath(file);
  try {
    const exists = await fs.pathExists(p);
    if (!exists) return Array.isArray(defaultValue) ? [...defaultValue] : defaultValue;
    const data = await fs.readJson(p);
    return (data ?? defaultValue);
  } catch (err) {
    console.error(`❌ Failed to read ${p}:`, err);
    return Array.isArray(defaultValue) ? [...defaultValue] : defaultValue;
  }
}

/**
 * saveJSON
 * --------
 * Saves JSON data to disk asynchronously (non-blocking).
 *
 * @param {string} file - File name or path (relative to server/data if not absolute).
 * @param {*} data - The JSON-serializable data to save.
 * @returns {Promise<void>}
 */
async function saveJSON(file, data) {
  const p = resolveDataPath(file);
  try {
    await fs.ensureDir(path.dirname(p));                // Ensure parent directory exists
    await fs.writeJson(p, data, { spaces: 2 });         // Pretty-print JSON with indentation
  } catch (err) {
    console.error(`❌ Failed to write ${p}:`, err);
  }
}

module.exports = { loadJSON, saveJSON, resolveDataPath };

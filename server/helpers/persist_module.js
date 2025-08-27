// server/helpers/persist_module.js
// Small persistence utilities for JSON files under server/data.
// - Non-blocking (async) FS
// - Safe defaults on failure
// - Atomic writes to avoid partial/corrupt files
// - Optional read-modify-write helper with per-file locking

const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/** Resolve a data file path (absolute or relative to DATA_DIR). */
function resolveDataPath(file) {
  return path.isAbsolute(file) ? file : path.join(DATA_DIR, file);
}

/** Shallow-clone common default shapes so callers don't mutate shared refs. */
function cloneDefault(v) {
  if (Array.isArray(v)) return [...v];
  if (v && typeof v === 'object') return { ...v };
  return v;
}

/**
 * Load JSON from disk (non-blocking).
 * Returns `defaultValue` on: missing file, invalid JSON, or read error.
 *
 * @template T
 * @param {string} file - filename/path (relative to server/data by default)
 * @param {T} [defaultValue=[]] - value to return on failure/missing file
 * @param {{ validate?: (data:any)=>boolean }} [opts]
 *        validate: optional guard; if returns false, defaultValue is returned.
 * @returns {Promise<T>}
 */
async function loadJSON(file, defaultValue = [], opts = {}) {
  const p = resolveDataPath(file);
  try {
    const exists = await fs.pathExists(p);
    if (!exists) return cloneDefault(defaultValue);
    const data = await fs.readJson(p);
    if (opts.validate && !opts.validate(data)) {
      console.warn(`⚠️  Validation failed for ${p}. Falling back to defaultValue.`);
      return cloneDefault(defaultValue);
    }
    return data ?? cloneDefault(defaultValue);
  } catch (err) {
    console.error(`❌ Failed to read ${p}:`, err);
    return cloneDefault(defaultValue);
  }
}

/* --------------------------- Atomic write core -------------------------- */

/** In-memory write queue to serialize writes per path (prevents interleaving). */
const writeQueue = new Map();

/**
 * Atomically write JSON to disk with a per-file lock:
 * - write to a temp file
 * - move over the target (rename) with overwrite=true
 * - ensures parent dir exists
 * @param {string} absPath
 * @param {*} data
 */
async function writeJsonAtomic(absPath, data) {
  const dir = path.dirname(absPath);
  const tmp = `${absPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.ensureDir(dir);
  try {
    await fs.writeJson(tmp, data, { spaces: 2 });
    await fs.move(tmp, absPath, { overwrite: true });
  } catch (err) {
    // Attempt cleanup; ignore secondary failures.
    try { await fs.remove(tmp); } catch {}
    throw err;
  }
}

/** Acquire a per-file lock, run task, then release. */
function withWriteLock(absPath, task) {
  const prev = writeQueue.get(absPath) || Promise.resolve();
  const next = prev.then(task, task).finally(() => {
    if (writeQueue.get(absPath) === next) writeQueue.delete(absPath);
  });
  writeQueue.set(absPath, next);
  return next;
}

/**
 * Save JSON to disk (non-blocking, atomic).
 * @param {string} file
 * @param {*} data
 * @returns {Promise<void>}
 */
async function saveJSON(file, data) {
  const p = resolveDataPath(file);
  return withWriteLock(p, async () => {
    try {
      await writeJsonAtomic(p, data);
    } catch (err) {
      console.error(`❌ Failed to write ${p}:`, err);
    }
  });
}

/**
 * Read-modify-write helper (atomic).
 * Safely loads a file, lets you transform it, then writes back as a single,
 * queued operation for that file to prevent races.
 *
 * @template T
 * @param {string} file
 * @param {(current: T) => (T|Promise<T>)} updater
 * @param {T} [defaultValue=[]]
 * @returns {Promise<T>} - the updated value that was written
 */
async function updateJSON(file, updater, defaultValue = []) {
  const p = resolveDataPath(file);
  return withWriteLock(p, async () => {
    try {
      const current = await loadJSON(file, defaultValue);
      const next = await updater(current);
      await writeJsonAtomic(p, next);
      return next;
    } catch (err) {
      console.error(`❌ Failed to update ${p}:`, err);
      // On failure, return the last known good value (not written).
      return cloneDefault(defaultValue);
    }
  });
}

module.exports = {
  loadJSON,
  saveJSON,
  updateJSON,     // NEW: safe read-modify-write
  resolveDataPath
};

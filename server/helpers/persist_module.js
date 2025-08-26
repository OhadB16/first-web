// server/helpers/persist_module.js
const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function resolveDataPath(file) {
  return path.isAbsolute(file) ? file : path.join(DATA_DIR, file);
}

/**
 * טוען JSON מהדיסק בצורה לא-חוסמת.
 * @param {string} file - שם/נתיב קובץ (יחסי ל-server/data)
 * @param {*} defaultValue - ערך ברירת מחדל להחזרה בשגיאה/חוסר קובץ (ברירת מחדל: [])
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
 * שומר JSON לדיסק בצורה לא-חוסמת.
 * @param {string} file
 * @param {*} data
 */
async function saveJSON(file, data) {
  const p = resolveDataPath(file);
  try {
    await fs.ensureDir(path.dirname(p));                // ודא שהתיקיה קיימת
    await fs.writeJson(p, data, { spaces: 2 });         // שומר עם ריווח יפה
  } catch (err) {
    console.error(`❌ Failed to write ${p}:`, err);
  }
}

module.exports = { loadJSON, saveJSON, resolveDataPath };

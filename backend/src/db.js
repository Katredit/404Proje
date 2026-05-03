/**
 * Basit dosya tabanlı in-memory DB (gerçek DB olmadan çalışır)
 * Veriler backend/data/ klasöründe JSON olarak tutulur.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function loadCollection(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}

function saveCollection(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function makeRepo(name) {
  return {
    findAll: () => loadCollection(name),
    findById: (id) => loadCollection(name).find((x) => x.id === id) || null,
    findOne: (pred) => loadCollection(name).find(pred) || null,
    insert: (doc) => {
      const list = loadCollection(name);
      doc.id = doc.id || Date.now().toString();
      list.push(doc);
      saveCollection(name, list);
      return doc;
    },
    update: (id, patch) => {
      const list = loadCollection(name);
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      saveCollection(name, list);
      return list[idx];
    },
    remove: (id) => {
      const list = loadCollection(name);
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      list.splice(idx, 1);
      saveCollection(name, list);
      return true;
    },
  };
}

module.exports = {
  users: makeRepo("users"),
  stores: makeRepo("stores"),
  customOrders: makeRepo("customOrders"),
};

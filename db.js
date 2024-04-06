const { dbConfig } = require("./config");
const mysql = require("mysql");

let db;

function handleDisconnect() {
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("Erreur lors de la connexion à la base de données:", err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log("Connecté à la base de données MySQL");
    }
  });

  db.on("error", (err) => {
    console.error("Erreur de base de données:", err);

    if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "PROTOCOL_PACKETS_OUT_OF_ORDER") {
      console.log("La connexion à la base de données a été perdue. Tentative de reconnexion...");
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

const db_module = {};

db_module.insert = async function (tableName, data) {
  const columns = Object.keys(data).join(", ");
  const values = Object.values(data);

  const placeholders = values
    .map((value, index) => {
      return typeof value === "string" ? `'${value}'` : value;
    })
    .join(", ");

  const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

  try {
    const result = await db.query(query);
    return result;
  } catch (error) {
    throw error;
  }
};
module.exports = db_module;

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

db_module.exec_query = async function (query, is_row) {
	console.log(" \x1b[94m Query \x1b[0m", query);
	return new Promise(function (resolve, reject) {
		db.query(query, function (err, results) {
			if (err) {
				return reject(err);
			}
			if (is_row == "row") {
				resolve(results[0]);
			} else if (is_row == "indexed") {
				var indexed_results = {};
				db_module.foreach(results, function (i, v) {
					indexed_results[v.id] = v;
				});
				resolve(indexed_results);
			} else {
				if (results.insertId) resolve(results.insertId);
				else resolve(results);
			}
		});
	});
};

db_module.select = async function (columns, table_name, where, is_row, limit, offset) {
	limit = limit == undefined ? "" : `LIMIT ${limit}`;
	offset = offset == undefined ? "" : `OFFSET ${offset}`;
	var query = `SELECT ${columns} FROM ${table_name} ${db_module.get_where_clause(where)} ORDER BY id ASC ${limit} ${offset}`;
	return await db_module.exec_query(query, is_row);
};

db_module.insert = async function (table_name, obj, is_row) {
	var query = `INSERT INTO ${table_name} ${db_module.get_insert_clause(obj)}`;
	var last_id = await db_module.exec_query(query, is_row);
	if (is_row != "last") return last_id;
	return (test = await db_module.select("*", table_name, { id: last_id }, "row"));
};

db_module.update = async function (table_name, obj, where, is_row) {
	var query = `UPDATE ${table_name} SET ${db_module.get_set_clause(obj)} ${db_module.get_where_clause(where)}`;
	return await db_module.exec_query(query, is_row);
};

db_module.prepared_update = async function (table_name, obj, where, is_row) {
	var query = `UPDATE ${table_name} SET `;
	for (field in obj) {
		query += ` ${field} = ?, `;
	}
	query = query.slice(0, -2) + db_module.get_where_clause(where);
	let values = Object.values(obj);
	for (let v of values) {
		if (typeof values[v] == "object") {
			values[v] = JSON.stringify(values[v]);
		}
	}
	console.log(obj.content);
	console.log({ query, values });
	return new Promise(function (resolve, reject) {
		db.query(query, values, function (err, results) {
			if (err) {
				return reject(err);
			}
			if (is_row == "row") {
				resolve(results[0]);
			} else {
				resolve(results);
			}
		});
	});
};

db_module.delete = async function (table_name, where, is_row) {
	var query = `DELETE FROM ${table_name} ${db_module.get_where_clause(where)}`;
	return await db_module.exec_query(query, is_row);
};

// ADDED BY SARA
db_module.search = async function (key, table, is_row) {
	var rows = await db_module.exec_query(`SELECT * FROM ${table} WHERE name LIKE '%${key}%' AND is_deleted=0`, is_row);
	return rows;
};
db_module.search2 = async function (key, table, is_row) {
	var rows = await db_module.exec_query(`SELECT * FROM ${table} WHERE title LIKE '%${key}%' OR description LIKE '%${key}%' OR reference LIKE '%${key}%' OR tags LIKE '%${key}%'`, is_row);
	return rows;
};

db_module.DESCorderby = async function (columns, table_name, where, order, limit, offset, is_row) {
	limit = limit == undefined ? "" : `LIMIT ${limit}`;
	offset = offset == undefined ? "" : `OFFSET ${offset}`;
	var query = `SELECT ${columns} FROM ${table_name} ${db_module.get_where_clause(where)} ORDER BY ${order} DESC ${limit} ${offset}`;
	return await db_module.exec_query(query, is_row);
};
db_module.orderby = async function (columns, table_name, where, order, limit, offset, is_row) {
	limit = limit == undefined ? "" : `LIMIT ${limit}`;
	offset = offset == undefined ? "" : `OFFSET ${offset}`;
	var query = `SELECT ${columns} FROM ${table_name} ${db_module.get_where_clause(where)} ORDER BY ${order} ASC ${limit} ${offset}`;
	return await db_module.exec_query(query, is_row);
};

db_module.last_insert_id = async function () {
	var row = await db_module.exec_query("SELECT LAST_INSERT_ID();", "row");
	return row["LAST_INSERT_ID()"];
};

db_module.get_insert_clause = function (obj) {
	var columns = "";
	db_module.foreach(obj, function (index, value) {
		index = escape(index);
		if (columns != "") {
			columns += ", ";
		}
		columns += `${index}`;
	});

	var values = "";
	db_module.foreach(obj, function (index, value) {
		value = escape(value);
		if (values != "") {
			values += ", ";
		}

		if (typeof value == "number") {
			values += `${value}`;
		} else if (Array.isArray(value) || typeof value == "object") {
			values += `"${JSON.stringify(value).replace(/"/g, '\\"')}" `;
		} else {
			values += `"${value}"`;
		}
	});

	return `(${columns}) VALUES (${values})`;
};

db_module.foreach = function (obj, callback) {
	if (obj == undefined) {
		return;
	}
	if (Array.isArray(obj)) {
		obj.forEach(function (v, i) {
			callback(i, v);
		});
	}
	Object.keys(obj).forEach(function (i) {
		callback(i, obj[i]);
	});
};

db_module.get_set_clause = function (obj) {
	var txt = "";
	db_module.foreach(obj, function (index, value) {
		if (txt != "") {
			txt += ", ";
		}
		index = escape(index);
		value = escape(value);

		if (typeof value == "number") {
			txt += `${index} = ${value} `;
		} else if (Array.isArray(value) || typeof value == "object") {
			txt += `${index} = "${escape(JSON.stringify(value))}" `;
		} else {
			txt += `${index} = "${value}" `;
		}
	});
	return txt;
};

db_module.get_where_clause = function (where) {
	if (where == undefined) {
		where = [];
	}
	var txt = "";
	if (Object.keys(where).length != 0) {
		db_module.foreach(where, function (index, value) {
			if (value == undefined) {
				return true;
			}
			if (txt != "") {
				txt += ` AND `;
			}
			var negation = "";
			if (value[0] == "!") {
				negation = "!";
				value = value.replace("!", "");
			}

			if (typeof value == "number") {
				txt += `${index} ${negation}= ${value} `;
			} else {
				txt += `${index} ${negation}= "${value}" `;
			}
		});
		txt = ` WHERE ${txt} `;
	}
	return txt;
};

db_module.get_where_or_clause = function (where) {
	if (where == undefined) {
		where = [];
	}
	var txt = "";
	if (Object.keys(where).length != 0) {
		db_module.foreach(where, function (index, value) {
			if (value == undefined) {
				return true;
			}
			if (txt != "") {
				txt += ` OR `;
			}
			var negation = "";
			if (value[0] == "!") {
				negation = "!";
				value = value.replace("!", "");
			}

			if (typeof value == "number") {
				txt += `${index} ${negation}= ${value} `;
			} else {
				txt += `${index} ${negation}= "${value}" `;
			}
		});
		txt = ` WHERE ${txt} `;
	}
	return txt;
};

db_module.selectOR = async function (columns, table_name, where, is_row, limit, offset) {
	limit = limit == undefined ? "" : `LIMIT ${limit}`;
	offset = offset == undefined ? "" : `OFFSET ${offset}`;
	var query = `SELECT ${columns} FROM ${table_name} ${db_module.get_where_or_clause(where)} AND is_deleted = "0" ORDER BY id ASC ${limit} ${offset}`;
	return await db_module.exec_query(query, is_row);
};

function escape(str) {
	if (typeof str != "string") {
		return str;
	}
	return str.replace(/"/g, '\\"');
}

db_module.adv_filter = async function (date, id_speciality, is_row, limit, offset) {
	limit = limit == undefined ? "" : `LIMIT ${limit}`;
	offset = offset == undefined ? "" : `OFFSET ${offset}`;
	var query = `
  SELECT * FROM adv 
    ${date != "" ? `WHERE "${date}" BETWEEN  startDate AND endDate` : ""}
    ${id_speciality != "" ? `AND id_speciality = ${id_speciality}` : ""}
    AND is_deleted = 0
    ORDER BY id ASC ${limit} ${offset}`;
	return await db_module.exec_query(query, is_row);
};

db_module.brands_filter = async function (key, is_row, limit, offset) {
	limit = limit == undefined ? "" : `LIMIT ${limit}`;
	offset = offset == undefined ? "" : `OFFSET ${offset}`;
	var query = `
  SELECT brands.* FROM brands JOIN products ON brands.id = products.id_brand
	WHERE products.name LIKE "%${key}%" OR brands.name LIKE "%${key}%"
    AND products.is_deleted = 0 
    AND brands.is_deleted = 0
    ORDER BY brands.id ASC ${limit} ${offset}`;
	return await db_module.exec_query(query, is_row);
};

module.exports = db_module;

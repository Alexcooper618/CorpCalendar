const { DatabaseSync } = require('node:sqlite');

class Statement {
  constructor(statement) {
    this.statement = statement;
  }

  run(params) {
    const result = this.statement.run(params ?? {});
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  all(params) {
    return this.statement.all(params ?? {});
  }

  get(params) {
    return this.statement.get(params ?? {});
  }
}

class Database {
  constructor(filename) {
    this.database = new DatabaseSync(filename);
  }

  prepare(sql) {
    return new Statement(this.database.prepare(sql));
  }

  exec(sql) {
    return this.database.exec(sql);
  }

  pragma(statement) {
    return this.database.exec(`PRAGMA ${statement}`);
  }

  close() {
    return this.database.close();
  }
}

module.exports = Database;
module.exports.Database = Database;
module.exports.Statement = Statement;
module.exports.default = Database;

const native = require('msnodesqlv8/lib/sequelize');

// The native adapter reports SQL type names ('date', 'time'), whereas Sequelize's
// built-in parsers expect Tedious numeric type IDs. Normalize these two calendar
// types at the driver boundary, including raw queries, joins and OUTPUT rows.
class Request extends native.Request {
  emit(event, ...args) {
    if (event === 'row') {
      for (const column of args[0]) {
        if (!(column.value instanceof Date)) continue;
        const type = column.metadata.type.id;
        if (type === 'date') column.value = column.value.toISOString().slice(0, 10);
        if (type === 'time') column.value = column.value.toISOString().slice(11, -1).replace(/\.000$/, '');
      }
    }
    return super.emit(event, ...args);
  }
}

module.exports = { ...native, Request };

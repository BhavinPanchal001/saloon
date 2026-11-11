const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

// Sequelize 6 stores MSSQL JSON as text; preserve object values in the API.
if (sequelize.getDialect() === 'mssql') {
  sequelize.addHook('beforeDefine', (attributes) => {
    for (const [name, attribute] of Object.entries(attributes)) {
      if (attribute.type?.key !== 'JSON' && attribute.type !== Sequelize.DataTypes.JSON) continue;
      attribute.type = Sequelize.DataTypes.TEXT;
      attribute.get = function () {
        const value = this.getDataValue(name);
        return typeof value === 'string' ? JSON.parse(value) : value;
      };
      attribute.set = function (value) {
        this.setDataValue(name, value == null ? null : JSON.stringify(value));
      };
      if (attribute.defaultValue != null) attribute.defaultValue = JSON.stringify(attribute.defaultValue);
    }
  });
}

module.exports = { sequelize, Sequelize };

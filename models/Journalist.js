const sequelize = require("../config/connection");
const { Model, DataTypes, Sequelize } = require("sequelize");

class Journalist extends Model {}

Journalist.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
  },
  {
    underscored: true,
    sequelize,
    timestamps: true,
    freezeTableName: true,
    underscored: true,
    modelName: "journalist",
  }
);

module.exports = Journalist;

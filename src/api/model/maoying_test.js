//创建数据模型
const { think } = require('thinkjs');
module.exports = class extends think.Model {
  get tableName() {
    return this.tablePrefix + 'maoying_test';
  }
  // 可选：定义字段验证规则（增强数据安全性）
  get schema() {
    return {
      name: { type: 'string', required: true }, // 用户名必填
      age: { type: 'int', min: 0, max: 120 }, // 年龄范围限制
    };
  }

  // 自定义方法：获取所有用户
  async getAllUsers() {
    return this.select(); // ThinkJS Model内置方法，等价于 SELECT * FROM user
  }

  // 自定义方法：新增用户
  async addUser(userData) {
    return this.add(userData); // 等价于 INSERT INTO user (...) VALUES (...)
  }
};

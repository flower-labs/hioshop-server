const Base = require('./base.js');
module.exports = class extends Base {
  async listAction() {
    try {
      //调用自定义方法
      const userList = await this.model('maoying_test').getAllUsers();
      // 构造包含数据库数据的响应
      const response = {
        code: 200,
        message: '测试接口请求成功（已集成MySQL）',
        data: {
          timestamp: new Date().getTime(),
          server: 'ThinkJS',
          userList: userList, // 从数据库读取的用户数据
        },
      };
      return this.success(response);
    } catch (err) {
      // 捕获数据库操作异常并返回错误响应
      think.logger.error('数据库操作失败：', error);
      this.fail(500, '数据库查询失败：' + error.message);
    }
  }
};

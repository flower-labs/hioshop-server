const Base = require('./base.js');
const moment = require('moment');
module.exports = class extends Base {
  /**
   * 接口1：获取课程列表
   * 请求方式 GET
   * 参数 page 页码 pagesize 每页条数
   */
  async listAction() {
    const page = this.get('page') || 1;
    const pagesize = this.get('pagesize') || 10;

    const courseModel = this.model('course');
    const result = await courseModel.getList(page, pagesize);

    return this.success(result);
  }

  /**
   * 接口2：根据 course_id 查询课程详情
   * 请求方式 GET
   * 参数 course_id 必填
   */
  async detailAction() {
    const course_id = this.get('course_id');

    // 参数校验
    if (!course_id) {
      return this.fail(400, 'course_id 不能为空');
    }

    const courseModel = this.model('course');
    const info = await courseModel.getDetail(course_id);

    if (think.isEmpty(info)) {
      return this.fail(404, '课程不存在');
    }

    return this.success(info);
  }
};
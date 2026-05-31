module.exports = class extends think.Model {
  /**
   * 获取课程列表（支持分页）
   * @param {Number} page 页码
   * @param {Number} pagesize 每页条数
   * @returns 课程列表 + 总数
   */
  async getList(page = 1, pagesize = 10) {
    const data = await this.where({ status: 1 }) // 只查已上架
      .page(page, pagesize)
      .order('create_time DESC')
      .select();

    const total = await this.where({ status: 1 }).count();

    return {
      list: data,
      total,
      page,
      pagesize
    };
  }

  /**
   * 根据 course_id 获取单条课程
   * @param {String} course_id
   * @returns 课程详情
   */
  async getDetail(course_id) {
    return await this.where({ course_id, status: 1 }).find();
  }
};
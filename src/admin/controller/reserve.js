const Base = require('./base.js');
const moment = require('moment');
const _ = require('lodash');

/** admin端预约相关接口 */
module.exports = class extends Base {
  /**
   * 获取所有预约列表
   * @return {Promise} []
   */
  async indexAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 10;
    const model = this.model('reserve_order');
    const data = await model.order(['id DESC']).page(page, size).countSelect();
    return this.success(data);
  }

  /**
   * 更新订单预约状态
   * @return {Promise} []
   */

  async updateReserveStatusAction() {
    const id = this.post('id');
    const status = this.post('status');
    const model = this.model('reserve_order');
    const data = await model
      .where({
        id: id,
      })
      .update({
        status: Number(status),
      });

    return this.success(data);
  }
};

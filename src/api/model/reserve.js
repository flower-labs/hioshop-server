const _ = require('lodash');
module.exports = class extends think.Model {
  /**
   * 生成预约订单的编号reserve_order_sn
   * @returns {string}
   */
  generateOrderId() {
    const date = new Date();
    return (
      date.getFullYear() +
      _.padStart(date.getMonth(), 2, '0') +
      _.padStart(date.getDay(), 2, '0') +
      _.padStart(date.getHours(), 2, '0') +
      _.padStart(date.getMinutes(), 2, '0') +
      _.padStart(date.getSeconds(), 2, '0') +
      _.random(100000, 999999)
    );
  }

  async getOrderStatusText(orderId) {
    const orderInfo = await this.where({
      id: orderId,
    }).find();
    let statusText = '待付款';
    switch (orderInfo.order_status) {
      case 101:
        statusText = '待付款';
        break;
      case 102:
        statusText = '交易关闭';
        break;
      case 103:
        statusText = '交易关闭'; //到时间系统自动取消
        break;
      case 201:
        statusText = '待发货';
        break;
      case 300:
        statusText = '待发货';
        break;
      case 301:
        statusText = '已发货';
        break;
      case 401:
        statusText = '交易成功'; //到时间，未收货的系统自动收货、
        break;
    }
    return statusText;
  }

  /** 获取某个时间点剩余可预约数 */
  async getRemainPositions(timestamp, totalCount) {
    // 当前 timestamp对应的
    const reserveInfo = await this.model('reserve_order').where({ reserve_time: timestamp, is_delete: 0 }).select();
    const usedCount = reserveInfo.length;
    return totalCount - usedCount;
  }
};

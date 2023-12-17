const moment = require('moment');
const Base = require('./base.js');
module.exports = class extends Base {
  // 获取签到记录
  async indexAction() {
    const userId = this.getLoginUserId();
    const model = this.model('check_order');

    let prevCheck = false;
    let todayCheck = false;

    const data = await model
      .where({
        user_id: userId,
        is_delete: 0,
      })
      .order('id ASC')
      .select();

    // 计算今天&昨天是否签到
    const today = moment();
    const yesterday = moment().subtract(1, 'day');
    data.forEach(item => {
      const currentCheckTime = moment(Number(item.check_time) * 1000);
      if (currentCheckTime.isSame(today.format('YYYY-MM-DD'), 'day')) {
        todayCheck = true;
      }
      if (currentCheckTime.isSame(yesterday.format('YYYY-MM-DD'), 'day')) {
        prevCheck = true;
      }
    });

    // 计算当前用户总积分
    const totalPoints = data.reduce((prev, curr) => prev + curr.points_amount, 0);
    // 如果传递了当前时间，则判断当前天数，以及前一天是否签到

    return this.success({
      total_points: totalPoints,
      check_list: data,
      check_status: {
        today: todayCheck,
        yesterday: prevCheck,
      },
    });
  }

  // 新增签到
  async addAction() {
    const userId = this.getLoginUserId();
    // 使用预约提供的sn生成方法
    const checkOrderSn = this.model('reserve').generateOrderId();
    const checkType = this.post('check_type');
    const checkTime = this.post('check_time');
    const pointsAmount = this.post('points_amount');

    const newCheckTime = moment(checkTime * 1000);

    if (!newCheckTime.isValid() || newCheckTime.isAfter(moment())) {
      return this.fail('时间戳不合法，请检查后再试');
    }

    const checkOrderData = {
      user_id: userId,
      check_order_sn: checkOrderSn,
      check_type: checkType,
      check_time: checkTime,
      points_amount: pointsAmount,
      is_delete: 0,
    };

    await this.model('check_order').add(checkOrderData);
    return this.success({
      success: 1,
      messsage: '签到成功',
    });
  }
};

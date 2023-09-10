const Base = require('./base.js');
module.exports = class extends Base {
  // 获取签到记录
  async indexAction() {
    const userId = this.getLoginUserId();
    const model = this.model('check_order');

    const data = await model
      .where({
        user_id: userId,
        is_delete: 0,
      })
      .order('id ASC')
      .select();

      // 计算当前用户总积分
      const totalPoints = data.reduce((prev,curr)=> prev + curr.points_amount, 0)

    return this.success({
      total_points: totalPoints,
      check_list: data,
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

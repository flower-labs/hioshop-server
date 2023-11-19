const Base = require('./base.js');
module.exports = class extends Base {
  // 获取可预约项目列表
  async indexAction() {
    const model = this.model('reserve');
    const data = await model
      .limit(10)
      .where({
        is_delete: 0,
      })
      .order('id ASC')
      .select();

    const [today, sevenDay] = this.model('reserve').generateSevenDayTimestamp();
    const timePoints = this.generateTimestampPoints(today, sevenDay);
    // 查询最近7天的订单数据
    const reserveInfo = await this.model('reserve_order')
      .where({ reserve_time: { '>': today, '<': sevenDay }, is_delete: 0 })
      .select();

    // 生成预约页面所需动态数据
    const reserveDynamicList = data.map(item => {
      const currentId = String(item.id);
      const currentReserveRecords = reserveInfo.filter(item => item.reserve_id === String(currentId));
      const count = currentReserveRecords.length;
      // 计算最近可预约时间
      let latestTimestamp = '';
      for (let i = 0; i < timePoints.length; i++) {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (
          timePoints[i] > currentTimestamp &&
          currentReserveRecords.filter(item => item.reserve_time === timePoints[i]).length < 12
        ) {
          latestTimestamp = timePoints[i];
          break;
        }
      }

      return {
        id: currentId,
        count,
        latestTimestamp,
      };
    });

    // 遍历时间戳，找到第一个已预约的个数小于12的记录。

    return this.success({
      reserveList: data,
      reserveDynamicList,
    });
  }

  // 查询当前用户的订单信息
  async orderAction() {
    const page = this.post('page');
    const size = this.post('size');
    const userId = this.getLoginUserId();
    const model = this.model('reserve_order');
    const data = await model
      .where({
        user_id: userId,
        is_delete: 0,
      })
      .order({
        reserve_time: 'desc',
      })
      .page(page, size)
      .countSelect();

    return this.success({
      reserveOrderList: data,
    });
  }

  /**
   * 获取指定时间戳对应日期的开始时间戳
   * @param timestamp 时间戳
   * @returns 对应日期 00:00:00 的时间戳
   */
  getStartOfDay(timestamp) {
    const date = new Date(timestamp * 1000);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  /**
   * 判断给定日期是否为今天
   * @param timestamp 时间戳
   * @returns 如果给定日期为今天，则返回 true，否则返回 false
   */
  isToday(timestamp) {
    const date = new Date(timestamp * 1000);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  generateTimestampsFromNow(date) {
    const result = [];
    const endOfDay = new Date(date * 1000).setHours(24, 0, 0, 0) / 1000; // 获取今天24:00的时间戳
    const hoursTime = new Date(date * 1000).getHours();
    const minutesTime = new Date(date * 1000).getMinutes();

    if (hoursTime > 21 || (hoursTime > 20 && minutesTime > 30)) {
      return [];
    }
    for (let i = date; i < endOfDay; i++) {
      // 遍历时间戳范围内的每一秒
      const d = new Date(i * 1000);
      if (d.getHours() >= 8 && d.getHours() <= 20) {
        if (d.getMinutes() === 0 && d.getSeconds() === 0) {
          result.push(i); // 整点时间戳
        }
        if (d.getMinutes() === 30 && d.getSeconds() === 0) {
          result.push(i); // 半点时间戳
        }
      }
    }
    return result;
  }

  /** 生成指定时间区间内的时间戳list */
  generateTimestampPoints(startTime, endTime) {
    const result = [];
    // 遍历时间戳范围内的每一秒
    for (let i = startTime; i < endTime; i++) {
      const d = new Date(i * 1000);
      if (d.getHours() >= 8 && d.getHours() <= 20) {
        if (d.getMinutes() === 0 && d.getSeconds() === 0) {
          result.push(i); // 整点时间戳
        }
        if (d.getMinutes() === 30 && d.getSeconds() === 0) {
          result.push(i); // 半点时间戳
        }
      }
    }
    return result;
  }

  // 生成可预约时间列表
  async availableAction() {
    // 预定日期
    const reserveDate = this.post('reserve_date');
    // 服务类型ID
    const reserveIds = this.post('reserve_ids');
    const [today, sevenDay] = this.model('reserve').generateSevenDayTimestamp();
    // 查询最近7天订单数据
    const allReservedOrders = await this.model('reserve_order')
      .where({ reserve_time: { '>': today, '<': sevenDay }, is_delete: 0 })
      .select();
    const maxPosition = 12;
    const availableTimeList = this.generateTimestampsFromNow(reserveDate).map(item => {
      const remainCount = maxPosition - allReservedOrders.filter(record => record.reserve_time === item).length;
      return {
        time: item,
        available_position: remainCount,
        reserve_able: true,
      };
    });

    const availableReserveList = (reserveIds || []).map(item => ({
      service_id: item,
      available_list: availableTimeList,
    }));
    // 生成数据对象
    return this.success({
      availableReserveList,
    });
  }

  // 新增预约
  async addAction() {
    /**
     * 用户ID
     * 预约服务ID reserve_id
     * 手机号码 phone_number
     * 车牌号 plate_number
     * 预约时间 reserve_time
     * 状态（待确认状态）
     * 备注 remark(可选)
     */
    const userId = this.getLoginUserId();
    const reserveId = this.post('reserve_id');
    const reservePrice = this.post('reserve_price');
    const reserveTime = this.post('reserve_time');
    const phoneNumber = this.post('phone_number');
    const plateNumber = this.post('plate_number');
    const remark = this.post('remark');
    const reserveOrderSN = this.model('reserve').generateOrderId();

    // 查询reserveId对应的预约信息
    const reserveInfo = await this.model('reserve')
      .where({
        id: reserveId,
      })
      .find();

    if (think.isEmpty(reserveInfo) || reserveInfo.is_delete == 1) {
      return this.fail(400, '预约服务已下架，请返回主页重新操作');
    }

    const reserveOrderData = {
      user_id: userId,
      reserve_order_sn: reserveOrderSN,
      phone_number: phoneNumber,
      reserve_id: reserveId,
      reserve_price: reserveInfo.service_price,
      reserve_name: reserveInfo.service_name,
      order_price: reservePrice,
      reserve_time: reserveTime,
      status: 1001,
      plate_number: plateNumber,
      remark,
    };

    await this.model('reserve_order').add(reserveOrderData);
    // 生成数据对象
    return this.success({
      success: 1,
      messsage: '预约成功',
    });
  }

  // 取消预约
  async cancelAction() {
    // 根据前端传递预约订单id查询订单，需要在订单状态为 待确认|已确认 状态才可以取消预约，
    const orderId = this.post('order_id');
    // 查询reserveId对应的预约信息
    const orderInfo = await this.model('reserve_order')
      .where({
        id: orderId,
      })
      .find();

    if (think.isEmpty(orderInfo) || !(orderInfo.status === 1001 || orderInfo.status === 1002)) {
      return this.fail(400, '预约订单状态异常，请稍后再试');
    }

    const succesInfo = await this.model('reserve_order')
      .where({
        id: orderId,
      })
      .update({
        status: 1006,
      });
    return this.success(succesInfo);
  }
};

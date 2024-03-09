const Base = require('./base.js');
const uuid = require('uuid');
const moment = require('moment');

module.exports = class extends Base {
  // 获取记录列表
  async indexAction() {
    const page = this.post('page');
    const size = this.post('size');
    // const userId = this.getLoginUserId();
    const model = this.model('baby');
    const is_today = this.post('is_today');
    const todayTime = Math.floor(moment().startOf('day').valueOf() / 1000);

    let babyList = [];

    if (is_today) {
      babyList = await model
        .order({
          start_time: 'desc',
        })
        .page(page, size)
        .where({ start_time: { '>=': todayTime }, is_delete: 0 })
        .countSelect();
    } else {
      babyList = await model
        .order({
          start_time: 'desc',
        })
        .where({ start_time: { '<': todayTime }, is_delete: 0 })
        .page(page, size)
        .countSelect();
    }

    return this.success({
      babyList,
    });
  }

  // 新增记录
  async addAction() {
    // const userId = this.getLoginUserId();
    const type = this.post('type');
    const count = this.post('count');
    const drink_amount = this.post('drink_amount');
    const extra = this.post('extra');
    const start_time = this.post('start_time');
    const end_time = this.post('end_time');
    const currentTimestamp = moment().unix();

    const recordData = {
      uuid: uuid.v4(),
      type,
      count,
      extra,
      drink_amount,
      start_time,
      end_time,
      create_time: currentTimestamp,
    };

    await this.model('baby').add(recordData);
    // 生成数据对象
    return this.success({
      success: 1,
      messsage: '添加记录成功',
    });
  }

  // 删除记录
  async deleteAction() {
    const record_id = this.post('record_id');

    const orderInfo = await this.model('baby')
      .where({
        id: record_id,
      })
      .find();

    if (think.isEmpty(orderInfo)) {
      return this.fail(400, '记录获取异常，请稍后再试');
    }

    const succesInfo = await this.model('baby')
      .where({
        id: record_id,
      })
      .update({
        is_delete: 1,
      });
    return this.success(succesInfo);
  }
};

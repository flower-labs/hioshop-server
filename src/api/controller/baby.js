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

    const data = await model
      .order({
        id: 'desc',
      })
      .page(page, size)
      .countSelect();

    return this.success({
      babyList: data,
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
};

const Base = require('./base.js');
const uuid = require('uuid');
const moment = require('moment');
const { isNumber } = require('lodash');

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

  // baby记录统计数据
  async analysisAction() {
    // const userId = this.getLoginUserId();
    const duration = this.post('duration');
    const model = this.model('baby');

    if (!isNumber(duration)) {
      return this.fail('时间区间参数错误，请检查');
    }

    const daysBefore = Math.floor(moment().subtract(Number(duration), 'days').startOf('day').valueOf() / 1000);

    let babyAnalysisList = [];

    babyAnalysisList = await model
      .order({
        start_time: 'desc',
      })
      .where({ start_time: { '>=': daysBefore }, is_delete: 0 })
      .select();

    return this.success({
      babyAnalysisList,
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
      messsage: '新增记录成功',
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

  async editAction() {
    // let userId = this.getLoginUserId();
    const uuid = this.post('uuid');
    // 记录类型
    const type = this.post('type');
    // 喝奶量
    const drink_amount = this.post('drink_amount');
    // 备注信息
    const extra = this.post('extra');

    if (!uuid) {
      return this.fail('uuid参数错误');
    }

    const data = {
      type,
      drink_amount,
      extra,
    };

    await this.model('baby')
      .where({
        uuid,
      })
      .update(data);
    return this.success({
      success: 1,
      messsage: '编辑记录成功',
    });
  }
};

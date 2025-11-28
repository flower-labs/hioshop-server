const { think } = require('thinkjs');

module.exports = class extends think.Model {
  get tableName() {
    return this.tablePrefix + 'baby_body_info';
  }

  // 创建前自动计算BMI
  async beforeAdd(data) {
    if (data.weight && data.height) {
      // BMI = 体重(kg) / (身高(m) * 身高(m))
      const heightInMeter = parseFloat(data.height) / 100;
      data.bmi = parseFloat((parseFloat(data.weight) / (heightInMeter * heightInMeter)).toFixed(2));
    }
    data.create_time = think.datetime();
    return data;
  }

  // 更新前自动计算BMI
  async beforeUpdate(data) {
    if (data.weight !== undefined || data.height !== undefined) {
      const weight = data.weight;
      const height = data.height;

      const heightInMeter = parseFloat(height) / 100;
      data.bmi = parseFloat((parseFloat(weight) / (heightInMeter * heightInMeter)).toFixed(2));
    }
    data.update_time = think.datetime();
    return data;
  }

  // 获取用户健康数据列表
  async getUserHealthList(babyId) {
    const where = { baby_id: babyId };

    const list = await this.where(where)
      .field('id, baby_id, weight, height, bmi, measure_date, create_time')
      .order('measure_date DESC, id DESC')
      .select();

    return { list };
  }
};

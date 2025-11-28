const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * 新增宝贝体重身高数据
   */
  async addAction() {
    try {
      const { baby_id, weight, height, measure_date } = this.post();

      if (!baby_id || !weight || !height) {
        return this.fail('参数不完整');
      }

      if (parseFloat(weight) <= 0 || parseFloat(height) <= 0) {
        return this.fail('体重和身高必须大于0');
      }

      const data = {
        baby_id: parseInt(baby_id),
        weight: parseFloat(weight),
        height: parseFloat(height),
        measure_date: measure_date || think.datetime(),
      };

      const insertId = await this.model('baby_body_info').add(data);

      if (insertId) {
        const newRecord = await this.model('baby_body_info').where({ id: insertId }).find();
        return this.success({
          success: 1,
          message: '添加成功',
        });
      } else {
        return this.fail(400, '添加失败');
      }
    } catch (e) {
      think.logger.error('添加用户健康数据错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 删除宝贝体重身高记录
   */
  async deleteAction() {
    try {
      const { id } = this.post();

      if (!id) {
        return this.fail(400, '参数不完整');
      }

      const result = await this.model('baby_body_info')
        .where({ id: parseInt(id) })
        .delete();

      if (result) {
        return this.success({
          success: 1,
          message: '删除成功',
        });
      } else {
        return this.fail(400, '删除失败，记录不存在');
      }
    } catch (e) {
      think.logger.error('删除用户健康数据错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 更新宝贝体重身高数据
   */
  async updateAction() {
    try {
      const { id, weight, height, measure_date } = this.post();

      if (!id) {
        return this.fail('参数不完整');
      }

      const updateData = {};
      if (weight !== undefined) {
        if (parseFloat(weight) <= 0) {
          return this.fail('体重必须大于0');
        }
        updateData.weight = parseFloat(weight);
      }

      if (height !== undefined) {
        if (parseFloat(height) <= 0) {
          return this.fail('身高必须大于0');
        }
        updateData.height = parseFloat(height);
      }

      if (measure_date) {
        updateData.measure_date = measure_date;
      }

      if (Object.keys(updateData).length === 0) {
        return this.fail('没有要更新的数据');
      }

      const result = await this.model('baby_body_info')
        .where({ id: parseInt(id) })
        .update(updateData);

      if (result) {
        const updatedRecord = await this.model('baby_body_info')
          .where({ id: parseInt(id) })
          .find();
        return this.success({
          success: 1,
          message: '更新成功',
        });
      } else {
        return this.fail('更新失败，记录不存在');
      }
    } catch (e) {
      think.logger.error('更新用户健康数据错误:', e);
      return this.fail('服务器内部错误');
    }
  }

  /**
   * 查询宝贝体重身高数据列表
   */
  async listAction() {
    try {
      const baby_id = this.post('baby_id');

      if (!baby_id) {
        return this.fail('宝贝ID不能为空');
      }

      const result = await this.model('baby_body_info').getUserHealthList(parseInt(baby_id));

      return this.success(result);
    } catch (e) {
      think.logger.error('查询用户健康数据列表错误:', e);
      return this.fail('服务器内部错误');
    }
  }

  /**
   * 查询单条身高体重记录详情
   */
  async detailAction() {
    try {
      const id = this.post('id');

      if (!id) {
        return this.fail('参数不完整');
      }

      const record = await this.model('baby_body_info')
        .where({ id: parseInt(id) })
        .field('id, baby_id, weight, height, bmi, measure_date, create_time')
        .find();

      if (think.isEmpty(record)) {
        return this.fail('记录不存在');
      }

      return this.success(record);
    } catch (e) {
      think.logger.error('查询用户健康数据详情错误:', e);
      return this.fail('服务器内部错误');
    }
  }

  /**
   * 获取宝贝最新的健康数据
   */
  async latestAction() {
    try {
      const baby_id = this.post('baby_id');

      if (!baby_id) {
        return this.fail('宝贝ID不能为空');
      }

      const record = await this.model('baby_body_info')
        .where({ baby_id: parseInt(baby_id) })
        .field('id, baby_id, weight, height, bmi, measure_date')
        .order('measure_date DESC, id DESC')
        .find();

      return this.success(record);
    } catch (e) {
      think.logger.error('查询最新健康数据错误:', e);
      return this.fail('服务器内部错误');
    }
  }
};

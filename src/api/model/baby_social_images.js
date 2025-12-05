const { think } = require('thinkjs');

module.exports = class extends think.Model {
  get tableName() {
    return this.tablePrefix + 'baby_social_images';
  }

  // 创建前自动设置创建时间
  async beforeAdd(data) {
    data.create_time = think.datetime();
    return data;
  }

  // 更新前自动设置更新时间
  async beforeUpdate(data) {
    data.update_time = think.datetime();
    return data;
  }

  /**
   * 批量添加图片
   */
  async batchAddImages(socialId, imageUrls) {
    if (!imageUrls || imageUrls.length === 0) {
      return [];
    }

    const insertData = imageUrls.map((url, index) => ({
      social_id: socialId,
      image_url: url,
      sort_order: index,
      is_delete: 0
    }));

    const ids = [];
    for (let data of insertData) {
      const id = await this.add(data);
      ids.push(id);
    }

    return ids;
  }

  /**
   * 软删除图片（通过social_id）
   */
  async softDeleteBySocialId(socialId) {
    return await this.where({ social_id: socialId })
      .update({ is_delete: 1 });
  }
};

const { think } = require('thinkjs');

module.exports = class extends think.Model {
  get tableName() {
    return this.tablePrefix + 'baby_social';
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
   * 获取朋友圈列表（包含图片）
   */
  async getSocialList(userId, privacyType = null) {
    const where = { 
      user_id: userId,
      is_delete: 0 
    };

    if (privacyType) {
      where.privacy_type = privacyType;
    }

    const list = await this.where(where)
      .field('id, user_id, content, location, privacy_type, create_time')
      .order('create_time DESC, id DESC')
      .select();

    // 获取每条朋友圈的图片列表
    if (list && list.length > 0) {
      const imageModel = this.model('baby_social_images');
      for (let item of list) {
        const images = await imageModel
          .where({ social_id: item.id, is_delete: 0 })
          .field('id, image_url, sort_order')
          .order('sort_order ASC, id ASC')
          .select();
        item.images = images || [];
      }
    }

    return { list };
  }

  /**
   * 获取朋友圈详情（包含图片）
   */
  async getSocialDetail(socialId) {
    const detail = await this.where({ 
      id: socialId,
      is_delete: 0 
    })
    .field('id, user_id, content, location, privacy_type, create_time')
    .find();

    if (!think.isEmpty(detail)) {
      const imageModel = this.model('baby_social_images');
      const images = await imageModel
        .where({ social_id: detail.id, is_delete: 0 })
        .field('id, image_url, sort_order')
        .order('sort_order ASC, id ASC')
        .select();
      detail.images = images || [];
    }

    return detail;
  }
};

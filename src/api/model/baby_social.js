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
   * 获取朋友圈列表（包含图片和标签）
   */
  async getSocialList(userId, privacyType = null, page = 1, pageSize = 10) {
    const where = { 
      user_id: userId,
      is_delete: 0 
    };

    if (privacyType) {
      where.privacy_type = privacyType;
    }

    // 计算总数
    const totalCount = await this.where(where).count();
    
    // 计算分页信息
    const currentPage = Math.max(1, page);
    const limit = Math.max(1, pageSize);
    const offset = (currentPage - 1) * limit;

    // 获取分页数据
    const list = await this.where(where)
      .field('id, user_id, content, location, privacy_type, create_time')
      .order('create_time DESC, id DESC')
      .limit(offset, limit)
      .select();

    // 获取每条朋友圈的图片和标签列表
    if (list && list.length > 0) {
      const imageModel = this.model('baby_social_images');
      const tagModel = this.model('baby_social_tags');
      
      // 收集所有social_id
      const socialIds = list.map(item => item.id);
      
      // 批量获取标签
      const tagsBySocialId = await tagModel.getTagsBySocialIds(socialIds);
      
      for (let item of list) {
        // 获取图片
        const images = await imageModel
          .where({ social_id: item.id, is_delete: 0 })
          .field('id, image_url, sort_order')
          .order('sort_order ASC, id ASC')
          .select();
        item.images = images || [];
        
        // 获取标签
        item.tags = tagsBySocialId[item.id] || [];
      }
    }

    return { 
      list,
      pagination: {
        currentPage,
        pageSize: limit,
        totalCount,
      }
    };
  }

  /**
   * 获取朋友圈详情（包含图片和标签）
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
      const tagModel = this.model('baby_social_tags');
      
      // 获取图片
      const images = await imageModel
        .where({ social_id: detail.id, is_delete: 0 })
        .field('id, image_url, sort_order')
        .order('sort_order ASC, id ASC')
        .select();
      detail.images = images || [];
      
      // 获取标签
      const tags = await tagModel.getTagsBySocialId(detail.id);
      detail.tags = tags || [];
    }

    return detail;
  }
};

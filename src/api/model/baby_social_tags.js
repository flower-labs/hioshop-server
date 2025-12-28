const { think } = require('thinkjs');

module.exports = class extends think.Model {
  get tableName() {
    return this.tablePrefix + 'baby_social_tags';
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
   * 批量添加标签
   */
  async batchAddTags(socialId, tags) {
    if (!tags || tags.length === 0) {
      return [];
    }

    // 验证标签数量限制（最多10个）
    if (tags.length > 10) {
      throw new Error('每条朋友圈最多支持10个标签');
    }

    // 验证每个标签的长度（最大120字符）
    for (let tag of tags) {
      if (typeof tag !== 'string' || tag.trim() === '') {
        throw new Error('标签不能为空');
      }
      if (tag.trim().length > 120) {
        throw new Error('标签长度不能超过120个字符');
      }
    }

    const insertData = tags.map((tag, index) => ({
      social_id: socialId,
      tag_name: tag.trim(),
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
   * 软删除标签（通过social_id）
   */
  async softDeleteBySocialId(socialId) {
    return await this.where({ social_id: socialId })
      .update({ is_delete: 1 });
  }

  /**
   * 获取朋友圈的标签列表
   */
  async getTagsBySocialId(socialId) {
    return await this.where({ 
      social_id: socialId, 
      is_delete: 0 
    })
    .field('id, tag_name, sort_order')
    .order('sort_order ASC, id ASC')
    .select();
  }

  /**
   * 批量获取多个朋友圈的标签
   */
  async getTagsBySocialIds(socialIds) {
    if (!socialIds || socialIds.length === 0) {
      return {};
    }

    const tags = await this.where({ 
      social_id: ['IN', socialIds], 
      is_delete: 0 
    })
    .field('social_id, id, tag_name, sort_order')
    .order('sort_order ASC, id ASC')
    .select();

    // 按social_id分组
    const tagsBySocialId = {};
    for (let tag of tags) {
      if (!tagsBySocialId[tag.social_id]) {
        tagsBySocialId[tag.social_id] = [];
      }
      tagsBySocialId[tag.social_id].push({
        id: tag.id,
        tag_name: tag.tag_name,
        sort_order: tag.sort_order
      });
    }

    return tagsBySocialId;
  }
};
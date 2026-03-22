const { think } = require('thinkjs');

module.exports = class extends think.Model {
  get tableName() {
    return this.tablePrefix + 'baby_social_comment';
  }

  async beforeAdd(data) {
    data.create_time = think.datetime();
    return data;
  }

  async beforeUpdate(data) {
    data.update_time = think.datetime();
    return data;
  }

  decodeNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') {
      return '';
    }

    try {
      return Buffer.from(nickname, 'base64').toString();
    } catch (e) {
      return nickname;
    }
  }

  async getUserInfoMap(userIds) {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    const users = await this.model('user')
      .where({ id: ['IN', userIds] })
      .field('id, name, nickname, avatar')
      .select();

    const userMap = {};
    for (const user of users) {
      userMap[user.id] = {
        id: user.id,
        name: user.name || '',
        nickname: this.decodeNickname(user.nickname),
        avatar: user.avatar || ''
      };
    }

    return userMap;
  }

  formatComment(comment, userMap = {}) {
    const userInfo = userMap[comment.user_id] || {
      id: comment.user_id,
      name: '',
      nickname: '',
      avatar: ''
    };

    return {
      id: comment.id,
      social_id: comment.social_id,
      user_id: comment.user_id,
      content: comment.content,
      create_time: comment.create_time,
      update_time: comment.update_time,
      user_info: userInfo
    };
  }

  async getCommentList(socialId, page = 1, pageSize = 10) {
    const where = {
      social_id: socialId,
      is_delete: 0
    };

    const totalCount = await this.where(where).count();
    const currentPage = Math.max(1, page);
    const limit = Math.max(1, pageSize);
    const offset = (currentPage - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    const list = await this.where(where)
      .field('id, social_id, user_id, content, create_time, update_time')
      .order('create_time DESC, id DESC')
      .limit(offset, limit)
      .select();

    const userIds = [...new Set((list || []).map(item => item.user_id))];
    const userMap = await this.getUserInfoMap(userIds);
    const formattedList = (list || []).map(item => this.formatComment(item, userMap));

    return {
      list: formattedList,
      pagination: {
        currentPage,
        pageSize: limit,
        totalCount,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    };
  }

  async getCommentDetail(commentId) {
    const comment = await this.where({
      id: commentId,
      is_delete: 0
    })
      .field('id, social_id, user_id, content, create_time, update_time')
      .find();

    if (think.isEmpty(comment)) {
      return comment;
    }

    const userMap = await this.getUserInfoMap([comment.user_id]);
    return this.formatComment(comment, userMap);
  }

  async softDeleteBySocialId(socialId) {
    return this.where({ social_id: socialId, is_delete: 0 })
      .update({ is_delete: 1 });
  }
};
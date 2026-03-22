const Base = require('./base.js');

module.exports = class extends Base {
  parsePositiveInt(value) {
    const parsedValue = parseInt(value, 10);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return null;
    }
    return parsedValue;
  }

  validateCommentContent(content) {
    if (typeof content !== 'string') {
      return { valid: false, message: '评论内容必须是字符串' };
    }

    const finalContent = content.trim();
    if (!finalContent) {
      return { valid: false, message: '评论内容不能为空' };
    }

    if (finalContent.length > 300) {
      return { valid: false, message: '评论内容不能超过300个字符' };
    }

    return {
      valid: true,
      content: finalContent
    };
  }

  async getSocialRecord(socialId) {
    return this.model('baby_social')
      .where({
        id: socialId,
        is_delete: 0
      })
      .find();
  }

  async checkSocialPermission(socialId, userId) {
    const socialRecord = await this.getSocialRecord(socialId);

    if (think.isEmpty(socialRecord)) {
      return {
        valid: false,
        code: 400,
        message: '朋友圈记录不存在或已被删除'
      };
    }

    if (socialRecord.privacy_type === 'PRIVATE' && socialRecord.user_id !== userId) {
      return {
        valid: false,
        code: 403,
        message: '无权访问该朋友圈评论'
      };
    }

    return {
      valid: true,
      data: socialRecord
    };
  }

  /**
   * 新增朋友圈评论
   */
  async addAction() {
    try {
      const { social_id, content } = this.post();
      const socialId = this.parsePositiveInt(social_id);
      if (!socialId) {
        return this.fail(400, 'social_id参数不合法');
      }

      const contentCheck = this.validateCommentContent(content);
      if (!contentCheck.valid) {
        return this.fail(400, contentCheck.message);
      }

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      const permissionResult = await this.checkSocialPermission(socialId, userId);
      if (!permissionResult.valid) {
        return this.fail(permissionResult.code, permissionResult.message);
      }

      const commentModel = this.model('baby_social_comment');
      const commentId = await commentModel.add({
        social_id: socialId,
        user_id: userId,
        content: contentCheck.content,
        is_delete: 0
      });

      if (!commentId) {
        return this.fail(400, '评论发布失败');
      }

      const commentDetail = await commentModel.getCommentDetail(commentId);
      return this.success({
        success: 1,
        message: '评论成功',
        data: commentDetail
      });
    } catch (e) {
      think.logger.error('新增朋友圈评论错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 删除朋友圈评论（软删除）
   */
  async deleteAction() {
    try {
      const { id } = this.post();
      const commentId = this.parsePositiveInt(id);
      if (!commentId) {
        return this.fail(400, 'id参数不合法');
      }

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      const commentModel = this.model('baby_social_comment');
      const commentRecord = await commentModel.where({
        id: commentId,
        is_delete: 0
      }).find();

      if (think.isEmpty(commentRecord)) {
        return this.fail(400, '评论不存在或已被删除');
      }

      if (commentRecord.user_id !== userId) {
        return this.fail(403, '无权删除该评论');
      }

      const deleteResult = await commentModel.where({
        id: commentId,
        is_delete: 0
      }).update({ is_delete: 1 });

      if (!deleteResult) {
        return this.fail(400, '删除评论失败');
      }

      return this.success({
        success: 1,
        message: '删除成功'
      });
    } catch (e) {
      think.logger.error('删除朋友圈评论错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 编辑朋友圈评论
   */
  async updateAction() {
    try {
      const { id, content } = this.post();
      const commentId = this.parsePositiveInt(id);
      if (!commentId) {
        return this.fail(400, 'id参数不合法');
      }

      const contentCheck = this.validateCommentContent(content);
      if (!contentCheck.valid) {
        return this.fail(400, contentCheck.message);
      }

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      const commentModel = this.model('baby_social_comment');
      const commentRecord = await commentModel.where({
        id: commentId,
        is_delete: 0
      }).find();

      if (think.isEmpty(commentRecord)) {
        return this.fail(400, '评论不存在或已被删除');
      }

      if (commentRecord.user_id !== userId) {
        return this.fail(403, '无权编辑该评论');
      }

      const permissionResult = await this.checkSocialPermission(commentRecord.social_id, userId);
      if (!permissionResult.valid) {
        return this.fail(permissionResult.code, permissionResult.message);
      }

      const updateResult = await commentModel.where({
        id: commentId,
        is_delete: 0
      }).update({
        content: contentCheck.content
      });

      if (!updateResult) {
        return this.fail(400, '更新评论失败');
      }

      const commentDetail = await commentModel.getCommentDetail(commentId);
      return this.success({
        success: 1,
        message: '更新成功',
        data: commentDetail
      });
    } catch (e) {
      think.logger.error('编辑朋友圈评论错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 查询朋友圈评论列表
   */
  async listAction() {
    try {
      const {
        social_id,
        page = 1,
        page_size = 10
      } = this.post();

      const socialId = this.parsePositiveInt(social_id);
      if (!socialId) {
        return this.fail(400, 'social_id参数不合法');
      }

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      const currentPage = Math.max(1, parseInt(page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(page_size, 10) || 10));

      const permissionResult = await this.checkSocialPermission(socialId, userId);
      if (!permissionResult.valid) {
        return this.fail(permissionResult.code, permissionResult.message);
      }

      const commentModel = this.model('baby_social_comment');
      const result = await commentModel.getCommentList(socialId, currentPage, limit);
      return this.success(result);
    } catch (e) {
      think.logger.error('查询朋友圈评论列表错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 查询朋友圈评论详情
   */
  async detailAction() {
    try {
      const { id } = this.post();
      const commentId = this.parsePositiveInt(id);
      if (!commentId) {
        return this.fail(400, 'id参数不合法');
      }

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      const commentModel = this.model('baby_social_comment');
      const commentDetail = await commentModel.getCommentDetail(commentId);

      if (think.isEmpty(commentDetail)) {
        return this.fail(400, '评论不存在或已被删除');
      }

      const permissionResult = await this.checkSocialPermission(commentDetail.social_id, userId);
      if (!permissionResult.valid) {
        return this.fail(permissionResult.code, permissionResult.message);
      }

      return this.success(commentDetail);
    } catch (e) {
      think.logger.error('查询朋友圈评论详情错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }
};
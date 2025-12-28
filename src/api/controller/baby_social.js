const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * 新增宝贝朋友圈
   */
  async addAction() {
    try {
      const { content, location, privacy_type, images, tags } = this.post();

      // 参数验证
      if (!content || content.trim() === '') {
        return this.fail('朋友圈内容不能为空');
      }

      // 验证privacy_type有效性
      const validPrivacyTypes = ['ALL', 'PRIVATE', 'FAMILY'];
      const finalPrivacyType = privacy_type && validPrivacyTypes.includes(privacy_type.toUpperCase()) 
        ? privacy_type.toUpperCase() 
        : 'FAMILY';

      // 验证tags参数
      if (tags && !Array.isArray(tags)) {
        return this.fail(400, 'tags参数必须是数组格式');
      }

      if (tags && tags.length > 10) {
        return this.fail(400, '每条朋友圈最多支持10个标签');
      }

      // 验证每个标签的格式和长度
      if (tags && tags.length > 0) {
        for (let tag of tags) {
          if (typeof tag !== 'string' || tag.trim() === '') {
            return this.fail(400, '标签不能为空');
          }
          if (tag.trim().length > 120) {
            return this.fail(400, '标签长度不能超过120个字符');
          }
        }
      }

      // 获取当前登录用户ID
      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      // 准备朋友圈数据
      const socialData = {
        user_id: userId,
        content: content.trim(),
        location: location || null,
        privacy_type: finalPrivacyType,
        is_delete: 0
      };

      // 开启事务
      const socialModel = this.model('baby_social');
      const imageModel = this.model('baby_social_images');
      const tagModel = this.model('baby_social_tags');

      // 插入朋友圈记录
      const socialId = await socialModel.add(socialData);

      if (!socialId) {
        return this.fail(400, '添加朋友圈失败');
      }

      // 处理图片（如果有）
      let imageIds = [];
      if (images && Array.isArray(images) && images.length > 0) {
        // 验证图片URL格式
        const validImages = images.filter(url => {
          if (typeof url !== 'string' || url.trim() === '') {
            return false;
          }
          // 基本URL格式验证
          return /^https?:\/\/.+/.test(url.trim());
        });

        if (validImages.length > 0) {
          imageIds = await imageModel.batchAddImages(socialId, validImages);
        }
      }

      // 处理标签（如果有）
      let tagIds = [];
      if (tags && Array.isArray(tags) && tags.length > 0) {
        try {
          // 过滤有效的标签
          const validTags = tags.filter(tag => 
            typeof tag === 'string' && tag.trim() !== '' && tag.trim().length <= 120
          );

          if (validTags.length > 0) {
            tagIds = await tagModel.batchAddTags(socialId, validTags);
          }
        } catch (tagError) {
          // 如果标签添加失败，删除已创建的朋友圈记录
          await socialModel.where({ id: socialId }).update({ is_delete: 1 });
          return this.fail(400, tagError.message);
        }
      }

      // 获取完整的朋友圈数据返回
      const newRecord = await socialModel.getSocialDetail(socialId);

      return this.success({
        success: 1,
        message: '发布成功',
        data: newRecord
      });
    } catch (e) {
      think.logger.error('添加宝贝朋友圈错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 删除宝贝朋友圈（软删除）
   */
  async deleteAction() {
    try {
      const { id } = this.post();

      if (!id) {
        return this.fail(400, '参数不完整');
      }

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      const socialModel = this.model('baby_social');
      const imageModel = this.model('baby_social_images');
      const tagModel = this.model('baby_social_tags');

      // 检查记录是否存在且属于当前用户
      const record = await socialModel
        .where({ 
          id: parseInt(id),
          is_delete: 0 
        })
        .find();

      if (think.isEmpty(record)) {
        return this.fail(400, '记录不存在或已被删除');
      }

      // 验证权限：只能删除自己的朋友圈
      if (record.user_id !== userId) {
        return this.fail(403, '无权删除此朋友圈');
      }

      // 软删除朋友圈记录
      const socialResult = await socialModel
        .where({ id: parseInt(id) })
        .update({ is_delete: 1 });

      // 软删除关联的图片
      await imageModel.softDeleteBySocialId(parseInt(id));

      // 软删除关联的标签
      await tagModel.softDeleteBySocialId(parseInt(id));

      if (socialResult) {
        return this.success({
          success: 1,
          message: '删除成功'
        });
      } else {
        return this.fail(400, '删除失败');
      }
    } catch (e) {
      think.logger.error('删除宝贝朋友圈错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 查询朋友圈列表
   */
  async listAction() {
    try {
      const {
        privacy_type = "FAMILY",
        page = 1,
        page_size = 10
      } = this.post();

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      // 参数验证
      const currentPage = Math.max(1, parseInt(page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(page_size) || 10)); // 限制每页最多50条

      const socialModel = this.model('baby_social');
      const result = await socialModel.getSocialList(userId, privacy_type, currentPage, limit);

      return this.success(result);
    } catch (e) {
      think.logger.error('查询朋友圈列表错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }

  /**
   * 查询朋友圈详情
   */
  async detailAction() {
    try {
      const { id } = this.post();

      if (!id) {
        return this.fail(400, '参数不完整');
      }

      const userId = this.getLoginUserId();
      if (!userId) {
        return this.fail(401, '请先登录');
      }

      const socialModel = this.model('baby_social');
      const record = await socialModel.getSocialDetail(parseInt(id));

      if (think.isEmpty(record)) {
        return this.fail(400, '记录不存在');
      }

      // 权限验证：只能查看自己的朋友圈
      if (record.user_id !== userId) {
        return this.fail(403, '无权查看此朋友圈');
      }

      return this.success(record);
    } catch (e) {
      think.logger.error('查询朋友圈详情错误:', e);
      return this.fail(400, '服务器内部错误');
    }
  }
};

const Base = require('./base.js');
const uuid = require('uuid');
const moment = require('moment');
const { isNumber } = require('lodash');

module.exports = class extends Base {
  // 获取记录列表
  async indexAction() {
    const page = this.post('page');
    const size = this.post('size');
    const userId = this.getLoginUserId();
    const model = this.model('baby');
    const is_today = this.post('is_today');
    const todayTime = Math.floor(moment().startOf('day').valueOf() / 1000);

    // 根据userId查询群组数据，如果有群组则使用群组中所有成员查询
    const groupUsers = await this.model('baby_group')
      .where(`FIND_IN_SET(${userId}, user_ids) > 0 AND is_delete = 0`)
      .field('user_ids')
      .find();

    const usersArray = groupUsers.user_ids ? groupUsers.user_ids.split(',') : [userId];

    let babyList = [];

    if (is_today) {
      babyList = await model
        .order({
          start_time: 'desc',
        })
        .page(page, size)
        .where({ user_id: usersArray, start_time: { '>=': todayTime }, is_delete: 0 })
        .countSelect();
    } else {
      babyList = await model
        .order({
          start_time: 'desc',
        })
        .where({ user_id: usersArray, start_time: { '<': todayTime }, is_delete: 0 })
        .page(page, size)
        .countSelect();
    }

    return this.success({
      babyList,
    });
  }

  // baby记录统计数据
  async analysisAction() {
    const userId = this.getLoginUserId();
    const duration = this.post('duration');
    const model = this.model('baby');

    if (!isNumber(duration)) {
      return this.fail('时间区间参数错误，请检查');
    }

    const daysBefore = Math.floor(moment().subtract(Number(duration), 'days').startOf('day').valueOf() / 1000);

    // 根据userId查询群组数据，如果有群组则使用群组中所有成员查询
    const groupUsers = await this.model('baby_group')
      .where(`FIND_IN_SET(${userId}, user_ids) > 0 AND is_delete = 0`)
      .field('user_ids')
      .find();

    const usersArray = groupUsers.user_ids ? groupUsers.user_ids.split(',') : [userId];

    let babyAnalysisList = [];

    babyAnalysisList = await model
      .order({
        start_time: 'desc',
      })
      .where({ user_id: usersArray, start_time: { '>=': daysBefore }, is_delete: 0 })
      .select();

    return this.success({
      babyAnalysisList,
    });
  }

  // 新增记录
  async addAction() {
    const userId = this.getLoginUserId();
    const type = this.post('type');
    const count = this.post('count');
    const recordName = this.post('record_name');
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
      user_id: userId,
      record_name: recordName || '',
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
    const userId = this.getLoginUserId();

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
        user_id: userId,
      })
      .update({
        is_delete: 1,
      });
    return this.success(succesInfo);
  }

  async editAction() {
    let userId = this.getLoginUserId();
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
        user_id: userId,
      })
      .update(data);
    return this.success({
      success: 1,
      messsage: '编辑记录成功',
    });
  }

  // 创建群组
  async addGroupAction() {
    const userId = this.getLoginUserId();
    const currentTimestamp = moment().unix();
    const group_name = this.post('group_name');
    const extra = this.post('extra');

    const groupRecordData = {
      uuid: uuid.v4(),
      group_name,
      owner_id: userId,
      user_ids: String(userId),
      extra,
      create_time: currentTimestamp,
      update_time: currentTimestamp,
    };

    await this.model('baby_group').add(groupRecordData);

    return this.success({
      success: 1,
      message: '新增记录成功',
    });
  }

  // 获取群组列表
  async indexGroupAction() {
    // { user_ids: ['like', `%${userId}%`], is_delete: 0 }
    const userId = this.getLoginUserId();
    const groupList = await this.model('baby_group')
      .where(`FIND_IN_SET(${userId}, user_ids) > 0 AND is_delete = 0`)
      .field('id,group_name,owner_id,user_ids,extra,create_time')
      .select();
    return this.success({
      groupList,
    });
  }

  // 生成邀请码
  async generateInviteCodeAction() {
    const userId = this.getLoginUserId();
    const groupId = this.post('group_id');
    const inviteCode = uuid.v4();
    const validTime = moment().add(3, 'days').valueOf();

    const inviteCodeData = {
      user_id: userId,
      group_id: groupId,
      invite_code: inviteCode,
      valid_time: validTime / 1000,
    };
    await this.model('baby_invite').add(inviteCodeData);
    return this.success({
      success: 1,
      message: '邀请码生成成功',
      code: inviteCode,
    });
  }

  // 接受加入群组邀请
  async acceptInviteAction() {
    const userId = this.getLoginUserId();
    const inviteCode = this.post('code');

    // 判断验证码是否有效，有效则执行对应群组的扩员操作
    const inviteCodeRecord = await this.model('baby_invite')
      .where({
        invite_code: inviteCode,
        is_delete: 0,
      })
      .find();

    if (think.isEmpty(inviteCodeRecord)) {
      return this.fail(400, '邀请码不存在，请检查后重试');
    }

    if (moment().isAfter(moment.unix(inviteCodeRecord.valid_time))) {
      return this.fail(400, '邀请码已过期，请联系邀请人重新生成');
    }

    const groupId = inviteCodeRecord.group_id;

    const groupRecord = await this.model('baby_group')
      .where({
        id: groupId,
        is_delete: 0,
      })
      .find();

    if (think.isEmpty(groupRecord)) {
      return this.fail(400, '群组不存在，请检查后重试');
    }

    // 通过校验将is_delete置为1
    await this.model('baby_invite')
      .where({
        invite_code: inviteCode,
        is_delete: 0,
      })
      .update({
        is_delete: 1,
      });

    // 将新的用户 ID 添加到 userIds 字段中
    const userIds = groupRecord.user_ids ? groupRecord.user_ids.split(',') : [];
    if (userIds.indexOf(userId.toString()) === -1) {
      userIds.push(userId.toString());
    }

    // 通过检验后，更新群组记录
    const successInfo = await this.model('baby_group')
      .where({
        id: groupId,
        is_delete: 0,
      })
      .update({
        user_ids: userIds.join(','),
      });
    return this.success(successInfo);
  }

  // 创建baby信息
  async addBabyDetailAction() {
    const name = this.post('baby_name');
    const sex = this.post('baby_sex');
    const birth = this.post('baby_birth');
    const height = this.post('baby_height');
    const weight = this.post('baby_weight');
    const relation = this.post('baby_relation');
    const bloodType = this.post('baby_blood_type');
    const extra = this.post('extra');

    const userId = this.getLoginUserId();
    const currentTimestamp = moment().unix();

    // 异常默认填充男孩
    const formattedSex = isNaN(Number(sex)) ? 1 : Number(sex);

    // 记录已存在，拒绝重复添加
    let existRecord = await this.model('baby_info').where({ user_id: userId, is_delete: 0 }).find();
    if (!think.isEmpty(existRecord)) {
      return this.fail(400, '宝贝信息已存在，请勿重新添加');
    }

    const recordData = {
      uuid: uuid.v4(),
      user_id: userId,
      baby_name: name,
      baby_birth: birth,
      baby_sex: formattedSex,
      baby_relation: relation,
      baby_blood_type: bloodType,
      baby_height: height,
      baby_weight: weight,
      baby_extra: extra,
      create_time: currentTimestamp,
      update_time: currentTimestamp,
    };

    await this.model('baby_info').add(recordData);
    return this.success({
      success: 1,
      messsage: '新增记录成功',
    });
  }

  // 获取baby信息
  async getBabyDetailAction() {
    const userId = this.getLoginUserId();
    const model = this.model('baby_info');

    const babyDetail = await model.where({ user_id: userId, is_delete: 0 }).select();
    // 移除隐藏字段
    const processedBabyDetail = (babyDetail || []).map(detail => {
      const { id, user_id, create_time, update_time, is_delete, ...rest } = detail;
      return rest;
    });

    return this.success(processedBabyDetail);
  }

  // 更新baby信息记录
  async editBabyDetailAction() {
    let userId = this.getLoginUserId();
    const uuid = this.post('uuid');
    const name = this.post('baby_name');
    const sex = this.post('baby_sex');
    const extra = this.post('extra');
    const birth = this.post('baby_birth');
    const height = this.post('baby_height');
    const weight = this.post('baby_weight');
    const bloodType = this.post('baby_blood_type');

    let existRecord = await this.model('baby_info').where({ user_id: userId, is_delete: 0 }).find();
    if (think.isEmpty(existRecord)) {
      return this.fail(400, '宝贝信息不存在，请联系管理员');
    }

    console.log('existRecord', existRecord.uuid, uuid);

    if (!uuid || uuid !== existRecord.uuid) {
      return this.fail('uuid参数错误');
    }

    const needUpdateInfos = {
      baby_name: name,
      baby_sex: sex,
      baby_extra: extra,
      baby_birth: birth,
      baby_height: height,
      baby_weight: weight,
      baby_blood_type: bloodType,
    };

    await this.model('baby_info')
      .where({
        uuid,
        user_id: userId,
      })
      .update(needUpdateInfos);
    return this.success({
      success: 1,
      messsage: '宝贝信息编辑成功',
    });
  }
};

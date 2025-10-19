const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
  async showSettingsAction() {
    let info = await this.model('show_settings')
      .where({
        id: 1,
      })
      .find();
    return this.success(info);
  }

  async saveAction() {
    let userId = this.getLoginUserId();
    let name = this.post('name');
    let mobile = '';
    // let mobile = this.post("mobile");
    let nickName = this.post('nickName');
    let avatar = this.post('avatar');
    let name_mobile = 0;
    if (name != '' && mobile != '') {
      name_mobile = 1;
    }
    const newbuffer = Buffer.from(nickName);
    let nickname = newbuffer.toString('base64');
    let data = {
      name: name,
      mobile: mobile,
      nickname: nickname,
      avatar: avatar,
      name_mobile: name_mobile,
    };
    let info = await this.model('user')
      .where({
        id: userId,
      })
      .update(data);
    return this.success(info);
  }

  async userDetailAction() {
    let userId = this.getLoginUserId();
    if (userId != 0) {
      let info = await this.model('user')
        .where({
          id: userId,
        })
        .field('id,mobile,name,nickname,avatar')
        .find();
      info.nickname = Buffer.from(info.nickname, 'base64').toString();
      return this.success(info);
    } else {
      return this.fail(100, '未登录');
    }
  }

  async saveBackgroundAction() {
    const userId = this.getLoginUserId();
    const backgroundImage = this.post('background_image');
    if (typeof backgroundImage !== 'string') {
      return this.fail(400, '参数不合法，请检查后重试');
    }
    const updateTime = moment().unix();
    const info = await this.model('user')
      .where({ id: userId })
      .update({ background_image: backgroundImage, background_update_time: updateTime });

    return this.success(info);
  }

  async getBackgroundAction() {
    const userId = this.getLoginUserId();
    if (userId != 0) {
      const info = await this.model('user')
        .where({ id: userId })
        .field('background_image,background_update_time')
        .find();
      return this.success(info);
    } else {
      return this.fail(100, '未登录');
    }
  }
};

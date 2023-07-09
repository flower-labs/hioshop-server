const Base = require("./base.js");
module.exports = class extends Base {
  async indexAction() {
    const model = this.model("reserve");
    const data = await model
      .limit(10)
      .where({
        is_delete: 0,
      })
      .order("id ASC")
      .select();


    return this.success({
      reserveList: data,
    });
  }
};

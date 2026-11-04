// Gom các controller xử lý vi phạm (đã tách theo nhóm chức năng trong thư mục violation/)
module.exports = {
  ...require('./violation/violationsController'),
  ...require('./violation/reviewController'),
  ...require('./violation/invoicesController'),
};

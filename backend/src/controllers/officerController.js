// Gom các controller của cán bộ (đã tách theo nhóm chức năng trong thư mục officer/)
module.exports = {
  ...require('./officer/dashboardController'),
  ...require('./officer/platesController'),
  ...require('./officer/camerasController'),
  ...require('./officer/citizensController'),
  ...require('./officer/driverLicensesController'),
  ...require('./officer/vehiclesController'),
};

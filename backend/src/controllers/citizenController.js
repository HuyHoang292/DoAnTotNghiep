// Gom các controller của công dân (đã tách theo nhóm chức năng trong thư mục citizen/)
module.exports = {
  ...require('./citizen/dashboardController'),
  ...require('./citizen/driverLicensesController'),
  ...require('./citizen/vehiclesController'),
};

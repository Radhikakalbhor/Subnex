const dashboardService = require('../services/dashboardService');

async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getDashboardStats(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
};


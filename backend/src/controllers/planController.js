const planService = require('../services/planService');
const { successResponse } = require('../utils/responseHelper');

async function createPlan(req, res, next) {
  try {
    const variantId = req.params.variantId || req.body.variant_id;
    const plan = await planService.createPlan({ ...req.body, variant_id: variantId });
    return successResponse(res, 201, 'Plan created successfully.', plan);
  } catch (err) {
    next(err);
  }
}

async function listPlans(req, res, next) {
  try {
    const variantId = req.params.variantId || req.query.variant_id;
    const plans = await planService.listPlans({ ...req.query, variant_id: variantId });
    return successResponse(res, 200, 'Plans retrieved successfully.', plans);
  } catch (err) {
    next(err);
  }
}

async function getPlan(req, res, next) {
  try {
    const plan = await planService.getPlanById(req.params.id);
    return successResponse(res, 200, 'Plan retrieved successfully.', plan);
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body);
    return successResponse(res, 200, 'Plan updated successfully.', plan);
  } catch (err) {
    next(err);
  }
}

async function deletePlan(req, res, next) {
  try {
    const result = await planService.deletePlan(req.params.id);
    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  deletePlan,
};


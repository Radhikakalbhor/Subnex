const taxService = require('../services/taxService');
const { successResponse } = require('../utils/responseHelper');

async function createTax(req, res, next) {
  try {
    const tax = await taxService.createTax(req.body);
    return successResponse(res, 201, 'Tax rule created successfully.', tax);
  } catch (err) {
    next(err);
  }
}

async function listTaxes(req, res, next) {
  try {
    const taxes = await taxService.listTaxes(req.query);
    return successResponse(res, 200, 'Tax rules retrieved successfully.', taxes);
  } catch (err) {
    next(err);
  }
}

async function getTax(req, res, next) {
  try {
    const tax = await taxService.getTaxById(req.params.id);
    return successResponse(res, 200, 'Tax rule retrieved successfully.', tax);
  } catch (err) {
    next(err);
  }
}

async function updateTax(req, res, next) {
  try {
    const tax = await taxService.updateTax(req.params.id, req.body);
    return successResponse(res, 200, 'Tax rule updated successfully.', tax);
  } catch (err) {
    next(err);
  }
}

async function deleteTax(req, res, next) {
  try {
    const result = await taxService.deleteTax(req.params.id);
    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTax,
  listTaxes,
  getTax,
  updateTax,
  deleteTax,
};


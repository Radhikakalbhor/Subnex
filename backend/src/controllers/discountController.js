const discountService = require('../services/discountService');
const { successResponse } = require('../utils/responseHelper');

async function createDiscount(req, res, next) {
  try {
    const discount = await discountService.createDiscount(req.body);
    return successResponse(res, 201, 'Discount created successfully.', discount);
  } catch (err) {
    next(err);
  }
}

async function listDiscounts(req, res, next) {
  try {
    const discounts = await discountService.listDiscounts(req.query);
    return successResponse(res, 200, 'Discounts retrieved successfully.', discounts);
  } catch (err) {
    next(err);
  }
}

async function getDiscount(req, res, next) {
  try {
    const discount = await discountService.getDiscountById(req.params.id);
    return successResponse(res, 200, 'Discount retrieved successfully.', discount);
  } catch (err) {
    next(err);
  }
}

async function updateDiscount(req, res, next) {
  try {
    const discount = await discountService.updateDiscount(req.params.id, req.body);
    return successResponse(res, 200, 'Discount updated successfully.', discount);
  } catch (err) {
    next(err);
  }
}

async function deleteDiscount(req, res, next) {
  try {
    const result = await discountService.deleteDiscount(req.params.id);
    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDiscount,
  listDiscounts,
  getDiscount,
  updateDiscount,
  deleteDiscount,
};


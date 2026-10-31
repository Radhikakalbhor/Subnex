const productService = require('../services/productService');
const { successResponse } = require('../utils/responseHelper');

// Products
async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, 201, 'Product created successfully.', product);
  } catch (err) {
    next(err);
  }
}

async function listProducts(req, res, next) {
  try {
    const products = await productService.listProducts(req.query);
    return successResponse(res, 200, 'Products retrieved successfully.', products);
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, 200, 'Product retrieved successfully.', product);
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return successResponse(res, 200, 'Product updated successfully.', product);
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
}

// Variants
async function createVariant(req, res, next) {
  try {
    const productId = req.params.productId || req.body.product_id;
    const variant = await productService.createVariant({ ...req.body, product_id: productId });
    return successResponse(res, 201, 'Variant created successfully.', variant);
  } catch (err) {
    next(err);
  }
}

async function listVariants(req, res, next) {
  try {
    const productId = req.params.productId || req.query.product_id;
    const variants = await productService.listVariants({ ...req.query, product_id: productId });
    return successResponse(res, 200, 'Variants retrieved successfully.', variants);
  } catch (err) {
    next(err);
  }
}

async function getVariant(req, res, next) {
  try {
    const variant = await productService.getVariantById(req.params.id);
    return successResponse(res, 200, 'Variant retrieved successfully.', variant);
  } catch (err) {
    next(err);
  }
}

async function updateVariant(req, res, next) {
  try {
    const variant = await productService.updateVariant(req.params.id, req.body);
    return successResponse(res, 200, 'Variant updated successfully.', variant);
  } catch (err) {
    next(err);
  }
}

async function deleteVariant(req, res, next) {
  try {
    const result = await productService.deleteVariant(req.params.id);
    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  listVariants,
  getVariant,
  updateVariant,
  deleteVariant,
};


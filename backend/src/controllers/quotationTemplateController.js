const templateService = require('../services/quotationTemplateService');
const { successResponse } = require('../utils/responseHelper');

async function createTemplate(req, res, next) {
  try {
    const template = await templateService.createTemplate(req.body);
    return successResponse(res, 201, 'Quotation template created successfully.', template);
  } catch (err) {
    next(err);
  }
}

async function listTemplates(req, res, next) {
  try {
    const templates = await templateService.listTemplates(req.query);
    return successResponse(res, 200, 'Quotation templates retrieved successfully.', templates);
  } catch (err) {
    next(err);
  }
}

async function getTemplate(req, res, next) {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    return successResponse(res, 200, 'Quotation template retrieved successfully.', template);
  } catch (err) {
    next(err);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.body);
    return successResponse(res, 200, 'Quotation template updated successfully.', template);
  } catch (err) {
    next(err);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const result = await templateService.deleteTemplate(req.params.id);
    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
};


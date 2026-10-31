const subscriptionService = require('../services/subscriptionService');
const { successResponse } = require('../utils/responseHelper');

async function createSubscription(req, res, next) {
  try {
    const sub = await subscriptionService.createSubscription(req.body);
    return successResponse(res, 201, 'Subscription created successfully.', sub);
  } catch (err) {
    next(err);
  }
}

async function createQuotation(req, res, next) {
  try {
    const quote = await subscriptionService.createQuotation(req.body);
    return successResponse(res, 201, 'Quotation created successfully from template.', quote);
  } catch (err) {
    next(err);
  }
}

async function listSubscriptions(req, res, next) {
  try {
    const subs = await subscriptionService.listSubscriptions(req.query, req.user);
    return successResponse(res, 200, 'Subscriptions retrieved successfully.', subs);
  } catch (err) {
    next(err);
  }
}

async function getSubscription(req, res, next) {
  try {
    const sub = await subscriptionService.getSubscriptionById(req.params.id, req.user);
    return successResponse(res, 200, 'Subscription retrieved successfully.', sub);
  } catch (err) {
    next(err);
  }
}

async function transitionStatus(req, res, next) {
  try {
    const { status } = req.body;
    const sub = await subscriptionService.transitionStatus(req.params.id, status, req.user);
    return successResponse(res, 200, `Subscription status updated to '${status}'.`, sub);
  } catch (err) {
    next(err);
  }
}

async function pauseSubscription(req, res, next) {
  try {
    const sub = await subscriptionService.transitionStatus(req.params.id, 'paused', req.user);
    return successResponse(res, 200, 'Subscription paused successfully.', sub);
  } catch (err) {
    next(err);
  }
}

async function resumeSubscription(req, res, next) {
  try {
    const sub = await subscriptionService.transitionStatus(req.params.id, 'active', req.user);
    return successResponse(res, 200, 'Subscription resumed successfully.', sub);
  } catch (err) {
    next(err);
  }
}

async function renewSubscription(req, res, next) {
  try {
    const sub = await subscriptionService.renewSubscription(req.params.id, req.user);
    return successResponse(res, 200, 'Subscription renewed successfully.', sub);
  } catch (err) {
    next(err);
  }
}

async function closeSubscription(req, res, next) {
  try {
    const sub = await subscriptionService.transitionStatus(req.params.id, 'closed', req.user);
    return successResponse(res, 200, 'Subscription closed successfully.', sub);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSubscription,
  createQuotation,
  listSubscriptions,
  getSubscription,
  transitionStatus,
  pauseSubscription,
  resumeSubscription,
  renewSubscription,
  closeSubscription,
};


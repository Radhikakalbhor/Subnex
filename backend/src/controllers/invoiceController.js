const invoiceService = require('../services/invoiceService');
const paymentService = require('../services/paymentService');

async function getInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id, req.user);
    res.status(200).json({
      status: 'success',
      data: { invoice },
    });
  } catch (err) {
    next(err);
  }
}

async function listInvoices(req, res, next) {
  try {
    const result = await invoiceService.listInvoices(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getOverdueInvoices(req, res, next) {
  try {
    const result = await invoiceService.getOverdueInvoices(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getOutstandingInvoices(req, res, next) {
  try {
    const result = await invoiceService.getOutstandingInvoices(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getInvoicePayments(req, res, next) {
  try {
    const { id } = req.params;
    const result = await paymentService.getPaymentsByInvoiceId(id, req.user);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function triggerBilling(req, res, next) {
  try {
    const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : new Date();
    const status = req.body.status || 'confirmed';
    const result = await invoiceService.processDueBilling({ targetDate, status });
    res.status(200).json({
      status: 'success',
      message: 'Billing engine execution completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        status: 'fail',
        message: 'Field "status" is required.',
      });
    }

    const updated = await invoiceService.updateInvoiceStatus(id, status, req.user);
    res.status(200).json({
      status: 'success',
      message: `Invoice status updated to '${status}'.`,
      data: { invoice: updated },
    });
  } catch (err) {
    next(err);
  }
}

async function generateForSubscription(req, res, next) {
  try {
    const { subscriptionId } = req.params;
    const outcome = await invoiceService.generateInvoiceForSubscription(subscriptionId, {
      issueDate: req.body.issueDate ? new Date(req.body.issueDate) : (req.body.targetDate ? new Date(req.body.targetDate) : new Date()),
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : new Date(),
      status: req.body.status || 'confirmed',
      force: req.body.force || false,
      discountCode: req.body.discount_code || req.body.discountCode || null,
    });

    res.status(outcome.alreadyExists ? 200 : 201).json({
      status: 'success',
      message: outcome.alreadyExists 
        ? 'Invoice for this period already exists' 
        : 'Invoice successfully generated',
      data: outcome,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInvoice,
  listInvoices,
  getOverdueInvoices,
  getOutstandingInvoices,
  getInvoicePayments,
  triggerBilling,
  updateStatus,
  generateForSubscription,
};

const paymentService = require('../services/paymentService');
const invoiceService = require('../services/invoiceService');

async function recordPayment(req, res, next) {
  try {
    const result = await paymentService.recordPayment(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: result.is_fully_paid 
        ? 'Payment recorded successfully. Invoice is now fully paid.' 
        : 'Partial payment recorded successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getPayment(req, res, next) {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id, req.user);
    res.status(200).json({
      status: 'success',
      data: { payment },
    });
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const result = await paymentService.listPayments(req.query, req.user);
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
    const { invoiceId } = req.params;
    const result = await paymentService.getPaymentsByInvoiceId(invoiceId, req.user);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getPaymentSummary(req, res, next) {
  try {
    const result = await paymentService.getPaymentSummary(req.query, req.user);
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

async function refundPayment(req, res, next) {
  try {
    const { id } = req.params;
    const result = await paymentService.refundPayment(id, req.user, req.body);
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordPayment,
  getPayment,
  listPayments,
  getInvoicePayments,
  getPaymentSummary,
  getOverdueInvoices,
  refundPayment,
};


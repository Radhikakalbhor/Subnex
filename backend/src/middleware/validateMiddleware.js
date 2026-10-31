const { validatePassword } = require('../utils/passwordValidator');
const { errorResponse } = require('../utils/responseHelper');

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 standard email regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

function validateSignup(req, res, next) {
  const { email, password, full_name } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters.');
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.isValid) {
    errors.push(passwordCheck.message);
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateForgotPassword(req, res, next) {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return errorResponse(res, 400, 'A valid email address is required.');
  }

  next();
}

function validateResetPassword(req, res, next) {
  const { token, newPassword } = req.body;
  const errors = [];

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    errors.push('Password reset token is required.');
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.isValid) {
    errors.push(passwordCheck.message);
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateStaffCreation(req, res, next) {
  const { email, password, full_name, role } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters.');
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.isValid) {
    errors.push(passwordCheck.message);
  }

  if (role && !['staff', 'admin'].includes(role)) {
    errors.push("Role must be either 'staff' or 'admin'.");
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateProduct(req, res, next) {
  const { name, sales_price, cost_price } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Product name is required.');
  }

  if (sales_price !== undefined) {
    const sp = parseFloat(sales_price);
    if (isNaN(sp) || sp < 0) {
      errors.push('Sales price must be a non-negative number.');
    }
  }

  if (cost_price !== undefined) {
    const cp = parseFloat(cost_price);
    if (isNaN(cp) || cp < 0) {
      errors.push('Cost price must be a non-negative number.');
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateVariant(req, res, next) {
  const { name, additional_price } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Variant name is required.');
  }

  if (additional_price !== undefined) {
    const ap = parseFloat(additional_price);
    if (isNaN(ap) || ap < 0) {
      errors.push('Additional price must be a non-negative number.');
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validatePlan(req, res, next) {
  const { name, price, billing_interval, minimum_quantity, available_from, available_until } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Plan name is required.');
  }

  if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
    errors.push('Price is required and must be a non-negative number.');
  }

  const validIntervals = ['day', 'week', 'month', 'year'];
  if (billing_interval && !validIntervals.includes(billing_interval)) {
    errors.push(`Billing interval must be one of: ${validIntervals.join(', ')}.`);
  }

  if (minimum_quantity !== undefined) {
    const mq = parseInt(minimum_quantity, 10);
    if (isNaN(mq) || mq < 1) {
      errors.push('Minimum quantity must be an integer greater than or equal to 1.');
    }
  }

  if (available_from && available_until) {
    if (new Date(available_until) < new Date(available_from)) {
      errors.push('Availability end date cannot be earlier than start date.');
    }
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateTax(req, res, next) {
  const { name, rate, tax_type } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Tax name is required.');
  }

  if (rate === undefined || isNaN(parseFloat(rate)) || parseFloat(rate) < 0) {
    errors.push('Tax rate is required and must be a non-negative number.');
  } else if ((tax_type === 'percentage' || !tax_type) && parseFloat(rate) > 100) {
    errors.push('Percentage tax rate cannot exceed 100%.');
  }

  if (tax_type && !['percentage', 'flat'].includes(tax_type)) {
    errors.push("Tax type must be either 'percentage' or 'flat'.");
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateDiscount(req, res, next) {
  const { code, name, discount_type, value, min_purchase_amount, min_quantity, valid_from, valid_until, target_scope, product_id } = req.body;
  const errors = [];

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    errors.push('Discount code is required.');
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Discount name is required.');
  }

  if (!discount_type || !['percentage', 'fixed_amount'].includes(discount_type)) {
    errors.push("Discount type must be either 'percentage' or 'fixed_amount'.");
  }

  if (value === undefined || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
    errors.push('Discount value is required and must be greater than zero.');
  } else if (discount_type === 'percentage' && parseFloat(value) > 100) {
    errors.push('Percentage discount cannot exceed 100%.');
  }

  if (min_purchase_amount !== undefined) {
    const mpa = parseFloat(min_purchase_amount);
    if (isNaN(mpa) || mpa < 0) {
      errors.push('Minimum purchase amount must be a non-negative number.');
    }
  }

  if (min_quantity !== undefined) {
    const mq = parseInt(min_quantity, 10);
    if (isNaN(mq) || mq < 0) {
      errors.push('Minimum quantity must be a non-negative integer.');
    }
  }

  if (valid_from && valid_until) {
    if (new Date(valid_until) < new Date(valid_from)) {
      errors.push('End date cannot be earlier than start date.');
    }
  }

  if (target_scope === 'product' && !product_id) {
    errors.push('product_id is required for product-specific discounts.');
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateQuotationTemplate(req, res, next) {
  const { name, terms_and_conditions } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Template name is required.');
  }

  if (!terms_and_conditions || typeof terms_and_conditions !== 'string' || terms_and_conditions.trim().length === 0) {
    errors.push('Terms and conditions are required.');
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateSubscription(req, res, next) {
  const { customer_id, plan_id, lines } = req.body;
  const errors = [];

  if (!customer_id || typeof customer_id !== 'string') {
    errors.push('customer_id is required.');
  }

  if (!plan_id && (!lines || !Array.isArray(lines) || lines.length === 0)) {
    errors.push('Either plan_id or a lines array must be provided.');
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateQuotation(req, res, next) {
  const { customer_id, quotation_template_id, plan_id, lines } = req.body;
  const errors = [];

  if (!customer_id || typeof customer_id !== 'string') {
    errors.push('customer_id is required.');
  }

  if (!quotation_template_id || typeof quotation_template_id !== 'string') {
    errors.push('quotation_template_id is required.');
  }

  if (!plan_id && (!lines || !Array.isArray(lines) || lines.length === 0)) {
    errors.push('Either plan_id or a lines array must be provided.');
  }

  if (errors.length > 0) {
    return errorResponse(res, 400, 'Validation failed.', errors);
  }

  next();
}

function validateStatusTransition(req, res, next) {
  const { status } = req.body;
  const validStatuses = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

  if (!status || !validStatuses.includes(status)) {
    return errorResponse(
      res,
      400,
      `Invalid or missing target status. Must be one of: [${validStatuses.join(', ')}].`
    );
  }

  next();
}

module.exports = {
  isValidEmail,
  validateSignup,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateStaffCreation,
  validateProduct,
  validateVariant,
  validatePlan,
  validateTax,
  validateDiscount,
  validateQuotationTemplate,
  validateSubscription,
  validateQuotation,
  validateStatusTransition,
};


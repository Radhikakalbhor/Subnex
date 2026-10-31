/**
 * Validates password complexity:
 * - Must exceed 8 characters (length > 8, i.e., at least 9 characters)
 * - Must contain at least one uppercase letter (A-Z)
 * - Must contain at least one lowercase letter (a-z)
 * - Must contain at least one special character
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required and must be a string.',
    };
  }

  if (password.length <= 8) {
    return {
      isValid: false,
      message: 'Password must exceed 8 characters in length (minimum 9 characters).',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter (A-Z).',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter (a-z).',
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character (e.g. !@#$%^&*).',
    };
  }

  return { isValid: true };
}

module.exports = {
  validatePassword,
};


const { validationResult } = require('express-validator');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Silakan login terlebih dahulu' });
  }
  next();
}

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Data tidak valid',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
    });
  }
  return null;
}

module.exports = {
  requireAuth,
  handleValidationErrors
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

function catchAsync(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    error.statusCode = 400;
  }

  if (error.code === 11000) {
    error.statusCode = 409;
    error.message = 'A record with this value already exists.';
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error.' : error.message;

  if (statusCode === 500) console.error(error);

  res.status(statusCode).json({
    status: error.status || 'error',
    message,
  });
}

export { AppError, catchAsync, errorHandler };

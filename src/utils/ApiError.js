// We have created this file to handle all the errors that might occur in the application while interacting with the database. This makes the handling errors easier and more organized.
class ApiError extends Error {
  constructor(
    message = "Something went wrong",
    statusCode,
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;

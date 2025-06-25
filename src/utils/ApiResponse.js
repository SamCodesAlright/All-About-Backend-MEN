// We have created this file to handle all the success responses that might occur in the application. This makes the handling responses easier and more organized.
class ApiResponse {
  constructor(statusCode, message = "Success", data) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }
}

module.exports = ApiResponse;

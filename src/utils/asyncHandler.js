// Middleware function to handle user authentication when user requests a page from the server using promise and catch wrapper.
// We have defined this function or module to handle all the errors that might occur in the application. Which avoid using of try/catch block in each controller.
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      next(err);
    });
  };
};

// Middleware function to handle user authentication when user requests a page from the server using async/await and try/catch wrapper.
// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

module.exports = asyncHandler;

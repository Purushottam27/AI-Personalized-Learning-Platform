// convert the api error into an HTTP response
const errorMiddleware = (err, req, res, next) => {
    req.log.error(err);
    const statusCode = err.statusCode || 500;
    const code = err.code || "INTERNAL_SERVER_ERROR";
    const message = err.message || "Something went wrong";
    const details = err.details || null;

    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details
        }
    });
};

export default errorMiddleware;
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    
    // In production, we don't send the stack trace
    const response = {
        status: 'error',
        message: err.message || 'Internal Server Error'
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
};
import jwt from 'jsonwebtoken';

function verifyAuth(req, res, next) {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;
  const cookieToken = req.headers.cookie
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('token='))
    ?.slice('token='.length);
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required.' });
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET is not set in the environment.'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    req.user = {
      userId: payload.sub,
      role: payload.role,
    };

    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}

export { verifyAuth };

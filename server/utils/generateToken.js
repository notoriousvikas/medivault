import jwt from 'jsonwebtoken';

function generateToken(res, user, message, statusCode = 200) {
  const { JWT_SECRET } = process.env;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in the environment.');
  }

  const token = jwt.sign(
    { role: user.role },
    JWT_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      algorithm: 'HS256',
    }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(statusCode).json({
    success: true,
    token,
    message,
    data: { user: user.toJSON(), token },
  });
}

export { generateToken };

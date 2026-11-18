import { AppError } from './error.middleware.js';
import { User } from '../modules/users/user.model.js';

/**
 * Middleware to restrict route access by user role(s).
 *
 * @example
 * router.get('/admin-only', verifyAuth, authorizeRoles('admin'), controller);
 * router.get('/medical-staff', verifyAuth, authorizeRoles('doctor', 'admin'), controller);
 *
 * @param {...string} roles Allowed roles ('patient', 'doctor', 'admin')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Forbidden: You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};

/**
 * Middleware to ensure a doctor account has been verified by an admin.
 * Admins bypass this check. Non-doctors receive a 403.
 */
const requireVerifiedDoctor = async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'doctor') {
    return next(new AppError('Forbidden: Doctor access required.', 403));
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    if (!user.isVerified || user.verificationStatus !== 'verified') {
      return next(
        new AppError(
          'Forbidden: Doctor account is pending verification by an administrator.',
          403
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export {
  authorizeRoles,
  authorizeRoles as restrictTo,
  requireVerifiedDoctor,
};

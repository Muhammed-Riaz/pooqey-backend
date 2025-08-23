// utils/formatUser.js
module.exports = function formatUserResponse(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage || '',
    isVerified: user.isVerified,
    authMethod: user.authMethod
  };
};

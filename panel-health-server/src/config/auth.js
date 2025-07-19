const passport = require('passport');
const BearerStrategy = require('passport-azure-ad').BearerStrategy;

// Microsoft OAuth configuration
const config = {
  tenantID: process.env.TENANT_ID,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  identityMetadata: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0/.well-known/openid_configuration`,
  validateIssuer: true,
  issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
  passReqToCallback: false,
  loggingLevel: 'info'
};

// Configure Bearer Strategy for API protection
const bearerStrategy = new BearerStrategy(config, (token, done) => {
  // Verify the token and return user info
  return done(null, token, token);
});

passport.use(bearerStrategy);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = {
  passport,
  config,
  bearerStrategy
}; 
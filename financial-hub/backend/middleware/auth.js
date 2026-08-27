const { getAuth, clerkClient } = require('@clerk/express');
const User = require('../models/User');

// Relies on clerkMiddleware() having already run app-wide (see server.js) to populate
// req.auth. This middleware's job is narrower: verify the session, then find-or-create
// the matching Mongo User doc so every existing route can keep using req.user.id
// exactly as before (a Mongo ObjectId string) - Clerk's own userId never leaks past
// this file into the rest of the app.
//
// The find-or-create here is deliberate, not just a webhook substitute: webhook
// delivery is asynchronous and "eventually consistent" (per Clerk's own docs), so a
// user's very first authenticated request can easily arrive before the
// user.created webhook does. Creating synchronously here closes that race; the
// webhook (routes/webhooks.js) then keeps the record in sync on later profile edits
// and handles deletion.
module.exports = async function (req, res, next) {
  try {
    const { isAuthenticated, userId: clerkId } = getAuth(req);

    if (!isAuthenticated || !clerkId) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    let user = await User.findOne({ clerkId });

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const email = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) {
        // Shouldn't happen - Clerk requires an email/phone identifier to sign up -
        // but fail loudly rather than create a User doc that can't be looked up by email.
        return res.status(400).json({ error: 'Clerk account has no email address on file' });
      }

      user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            clerkId,
            email,
            firstName: clerkUser.firstName || '',
            lastName: clerkUser.lastName || ''
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Rare: a pre-existing User doc with this email but no clerkId yet (e.g. an
      // account created before this migration). Link it instead of leaving it orphaned.
      if (!user.clerkId) {
        user.clerkId = clerkId;
        await user.save();
      }
    }

    req.user = { id: user._id.toString() };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

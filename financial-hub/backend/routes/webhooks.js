const express = require('express');
const router = express.Router();
const { verifyWebhook } = require('@clerk/express/webhooks');
const User = require('../models/User');

// Keeps the Mongo User record in sync with Clerk after the initial find-or-create
// done by middleware/auth.js (which handles the very first request, before any
// webhook could possibly have arrived - see the comment there for why). This
// route is what picks up later profile edits and account deletion.
//
// Mounted with express.raw() (not express.json()) in server.js, before the global
// json() parser - signature verification needs the raw body bytes.
router.post('/clerk', async (req, res) => {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error('Clerk webhook verification failed:', err.message);
    return res.status(400).send('Error verifying webhook');
  }

  try {
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const { id, email_addresses, primary_email_address_id, first_name, last_name } = evt.data;
      const email = email_addresses.find(e => e.id === primary_email_address_id)?.email_address
        || email_addresses[0]?.email_address;

      if (email) {
        await User.findOneAndUpdate(
          { clerkId: id },
          {
            $set: { email, firstName: first_name || '', lastName: last_name || '' },
            $setOnInsert: { clerkId: id }
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }

    if (evt.type === 'user.deleted') {
      const { id } = evt.data;
      // Soft-delete would need every collection referencing `user` to also filter
      // on account status; out of scope here - if/when real account deletion is
      // needed, decide the data-retention policy first rather than silently wiping
      // financial records.
      if (id) {
        await User.findOneAndUpdate({ clerkId: id }, { $set: { deletedAt: new Date() } });
      }
    }

    res.status(200).send('Webhook received');
  } catch (err) {
    // Signature already verified above - a failure here is our own DB/logic, not a
    // spoofed request. Still 200 so Clerk doesn't retry-storm on a bug on our end.
    console.error('Error processing Clerk webhook:', err.message);
    res.status(200).send('Webhook received');
  }
});

module.exports = router;

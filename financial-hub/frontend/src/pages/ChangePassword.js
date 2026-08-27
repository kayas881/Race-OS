import React from 'react';
import { UserProfile } from '@clerk/react';

// Password, email, connected accounts, and sessions are all Clerk's to manage now -
// its own UserProfile component covers all of it (this used to be a bespoke
// password-only form talking to our own /api/auth/change-password).
const ChangePassword = () => {
  return (
    <div className="flex justify-center">
      <UserProfile routing="hash" />
    </div>
  );
};

export default ChangePassword;

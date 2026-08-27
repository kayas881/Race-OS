const { google } = require('googleapis');
const axios = require('axios');

class PlatformIntegrationService {
  constructor() {
    this.youtube = google.youtube('v3');
    this.youtubeAnalytics = google.youtubeAnalytics('v2');
  }

  // YouTube Integration
async getYouTubeRevenue(accessToken, refreshToken, startDate, endDate) {
  try {
    // MODIFIED: Initialize OAuth2 client with your app's credentials
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // MODIFIED: Set both tokens. The library will handle refreshing.
    auth.setCredentials({ 
      access_token: accessToken,
      refresh_token: refreshToken 
    });

    // Get channel info
    const channelResponse = await this.youtube.channels.list({
      auth, // Use the configured auth object
      part: ['snippet', 'statistics', 'brandingSettings'],
      mine: true,
    });

      if (!channelResponse.data.items.length) {
        throw new Error('No YouTube channel found');
      }

      const channel = channelResponse.data.items[0];

      let revenueData = [];
      let totalRevenue = 0;
      let adRevenue = 0;
      let membershipRevenue = 0;

      try {
        // Try to get analytics data (requires YouTube Partner Program)
        const analyticsResponse = await this.youtubeAnalytics.reports.query({
          auth,
          ids: `channel==${channel.id}`,
          startDate,
          endDate,
          metrics: 'estimatedRevenue,estimatedAdRevenue,estimatedRedPartnerRevenue',
          dimensions: 'day',
        });

        revenueData = analyticsResponse.data.rows || [];
        totalRevenue = revenueData.reduce((sum, row) => sum + (row[1] || 0), 0);
        adRevenue = revenueData.reduce((sum, row) => sum + (row[2] || 0), 0);
        membershipRevenue = revenueData.reduce((sum, row) => sum + (row[3] || 0), 0);
   } catch (analyticsError) {
        console.log('Revenue data not available (channel may not be monetized):', analyticsError.message);
        totalRevenue = 0;
        adRevenue = 0;
        membershipRevenue = 0;
        revenueData = [];
      }

      return {
        platform: 'youtube',
        // MODIFIED: Add a date field for the sync record
        date: endDate, 
        channelName: channel.snippet.title,
        channelId: channel.id,
        totalRevenue,
        adRevenue,
        membershipRevenue,
        dailyBreakdown: revenueData.map(row => ({
          date: row[0],
          revenue: row[1] || 0,
          adRevenue: row[2] || 0,
          membershipRevenue: row[3] || 0,
        })),
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        videoCount: parseInt(channel.statistics.videoCount),
        viewCount: parseInt(channel.statistics.viewCount),
        revenueDataAvailable: revenueData.length > 0,
        message: revenueData.length === 0 ? 'Revenue data not available. Channel may not be monetized or part of YouTube Partner Program.' : null
      };
    } catch (error) {
      console.error('Error fetching YouTube revenue:', error);
      throw new Error('Failed to fetch YouTube revenue data');
    }
  }

  // Twitch Integration
  async getTwitchRevenue(accessToken, startDate, endDate) {
    try {
      // Get user info
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
        },
      });

      const user = userResponse.data.data[0];
      
      // Get subscription data
      const subsResponse = await axios.get(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
        },
      });

      // Get bits data (approximate)
      const bitsResponse = await axios.get(`https://api.twitch.tv/helix/bits/leaderboard?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
        },
      });

      // Calculate estimated revenue
      const subscriptions = subsResponse.data.data || [];
      const totalSubs = subscriptions.length;
      const estimatedSubRevenue = totalSubs * 2.5; // Approximate $2.50 per sub

      const bitsTotal = bitsResponse.data.data.reduce((sum, user) => sum + user.score, 0);
      const estimatedBitsRevenue = bitsTotal * 0.01; // $0.01 per bit

      return {
        platform: 'twitch',
        // PlatformIntegration.revenueData requires a date - this is a snapshot as of
        // the sync, not a historical figure (see isEstimate/message below).
        date: new Date().toISOString().split('T')[0],
        channelName: user.display_name,
        channelId: user.id,
        totalRevenue: estimatedSubRevenue + estimatedBitsRevenue,
        subscriptionRevenue: estimatedSubRevenue,
        bitsRevenue: estimatedBitsRevenue,
        totalSubscribers: totalSubs,
        totalBits: bitsTotal,
        followerCount: parseInt(user.view_count), // Twitch doesn't provide follower count in user endpoint
        // Twitch has no public revenue/payout API - this is a rough guess from current
        // subscriber/bits counts, not a real historical figure. Never treat as tax-relevant income.
        isEstimate: true,
        message: 'Estimated from current subscriber count and bits, not real payout data - Twitch does not provide a revenue API. Check your Twitch Creator Dashboard for actual payout figures.'
      };
    } catch (error) {
      console.error('Error fetching Twitch revenue:', error);
      throw new Error('Failed to fetch Twitch revenue data');
    }
  }

  // Patreon Integration
  async getPatreonRevenue(accessToken) {
    try {
      // Get campaign info
      const campaignResponse = await axios.get('https://www.patreon.com/api/oauth2/v2/campaigns', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          include: 'creator,benefits,goals',
          // v1's 'pledge_sum' field doesn't exist in v2 at all - v2 has no campaign-level
          // total, so lifetime totals must be derived from summing per-member data below.
          'fields[campaign]': 'creation_name,patron_count,published_at',
          'fields[user]': 'full_name,url',
        },
      });

      const campaign = campaignResponse.data.data[0];
      const creator = campaignResponse.data.included?.find(item => item.type === 'user');

      // v2 has no "pledges" endpoint at all - that was v1. v2 replaced it with "members",
      // using patron_status/currently_entitled_amount_cents instead of declined_since/amount_cents.
      const membersResponse = await axios.get(`https://www.patreon.com/api/oauth2/v2/campaigns/${campaign.id}/members`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          // currently_entitled_amount_cents is the current tier price (next-charge estimate);
          // campaign_lifetime_support_cents is what they've actually paid historically -
          // the closer of the two to "real money received" (lifetime_support_cents is deprecated).
          'fields[member]': 'patron_status,currently_entitled_amount_cents,campaign_lifetime_support_cents,last_charge_date,last_charge_status',
        },
      });

      const members = membersResponse.data.data || [];
      const activePledges = members.filter(member => member.attributes.patron_status === 'active_patron');

      const totalRevenue = activePledges.reduce((sum, member) => sum + (member.attributes.currently_entitled_amount_cents || 0), 0) / 100;
      const lifetimeRevenue = members.reduce((sum, member) => sum + (member.attributes.campaign_lifetime_support_cents || 0), 0) / 100;

      return {
        platform: 'patreon',
        date: new Date().toISOString().split('T')[0],
        campaignName: campaign.attributes.creation_name,
        campaignId: campaign.id,
        creatorName: creator?.attributes.full_name,
        totalRevenue,
        lifetimeRevenue,
        patronCount: campaign.attributes.patron_count,
        activePledges: activePledges.length,
        averagePledge: activePledges.length > 0 ? totalRevenue / activePledges.length : 0,
        // Pledges are ongoing monthly commitments, not discrete payment events, and this
        // total ignores Patreon's platform fee and any failed/declined charges. Not a real
        // historical figure - never treat as tax-relevant income.
        isEstimate: true,
        message: 'totalRevenue reflects current active pledge commitments (next-charge estimate), lifetimeRevenue is total historically paid - neither is exact (excludes Patreon fees and payment failures). Check your Patreon payout history for real figures.'
      };
    } catch (error) {
      console.error('Error fetching Patreon revenue:', error);
      throw new Error('Failed to fetch Patreon revenue data');
    }
  }

  // OAuth URL generation methods
  async getYouTubeAuthUrl(userId) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
    ];

    // Add prompt=consent to force refresh_token issuance on repeat connects
    // include_granted_scopes helps with incremental auth
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent',
      include_granted_scopes: true
    });

    return authUrl;
  }

  async getTwitchAuthUrl(userId) {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    const scope = 'channel:read:subscriptions+bits:read+channel:read:redemptions';
    
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${userId}`;
    
    return authUrl;
  }

  async getPatreonAuthUrl(userId) {
    const clientId = process.env.PATREON_CLIENT_ID;
    const redirectUri = process.env.PATREON_REDIRECT_URI;
    // 'pledges-to-me' was a v1-only scope name - v2 uses 'campaigns.members' instead.
    // A v1 scope requested against a v2 client silently fails to grant campaign/pledge access.
    const scope = 'identity campaigns campaigns.members';

    const authUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${userId}`;

    return authUrl;
  }

  // OAuth callback handlers
  async handleYouTubeCallback(code, userId) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    let tokens;
    try {
      ({ tokens } = await oauth2Client.getToken(code));
    } catch (err) {
      if (err && err.message && err.message.includes('invalid_grant')) {
        // Provide actionable diagnostics
        console.error('YouTube OAuth invalid_grant: likely causes -> (1) Redirect URI mismatch, (2) Code already used/expired, (3) Clock skew, (4) Wrong client secret, (5) App not published & scopes restricted.');
        throw new Error('YouTube authorization failed (invalid_grant). Please retry connection. If persists, verify redirect URI in Google Cloud matches GOOGLE_REDIRECT_URI and regenerate credentials.');
      }
      throw err;
    }

    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      // Frequent when user previously granted consent; warn so we can decide whether to reuse an existing one.
      console.warn('YouTube OAuth flow returned no refresh_token. Ensure prompt=consent and access_type=offline are set, or remove prior app consent and retry.');
    }

    // Get channel info
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    let channelResponse;
    try {
      channelResponse = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });
    } catch (apiErr) {
      console.error('Error calling YouTube channels.list:', apiErr.response?.data || apiErr.message);
      throw new Error('Failed to fetch YouTube channel information');
    }

    if (!channelResponse.data || !Array.isArray(channelResponse.data.items) || channelResponse.data.items.length === 0) {
      console.error('YouTube channel list empty. Full response:', JSON.stringify(channelResponse.data || {}, null, 2));
      throw new Error('No YouTube channel found for this Google account');
    }

    const channel = channelResponse.data.items[0];
    if (!channel || !channel.id) {
      console.error('Channel object missing id field:', channel);
      throw new Error('Malformed channel data returned from YouTube API');
    }

    // Upsert (not create) - the OAuth callback can legitimately fire more than once for the
    // same channel (reconnecting, or the popup flow re-triggering), and this must update the
    // existing integration's tokens rather than create a duplicate record for the same channel.
    const PlatformIntegration = require('../models/PlatformIntegration');
    const update = {
      user: userId,
      platform: 'youtube',
      accessToken: tokens.access_token,
      channelId: channel.id,
      channelName: channel.snippet?.title || 'Unknown Channel',
      platformUserId: channel.id,
      platformUsername: channel.snippet?.title || 'Unknown Channel',
      status: 'connected'
    };
    // Google only returns a refresh_token on the first consent - don't overwrite a
    // previously-stored one with undefined on a reconnect.
    if (tokens.refresh_token) update.refreshToken = tokens.refresh_token;

    const integration = await PlatformIntegration.findOneAndUpdate(
      { user: userId, platform: 'youtube', channelId: channel.id },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return integration;
  }

  async handleTwitchCallback(code, userId) {
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    });

    const user = userResponse.data.data[0];

    // Upsert (not create) - a reconnect for the same channel must update tokens,
    // not create a duplicate integration record.
    const PlatformIntegration = require('../models/PlatformIntegration');
    const integration = await PlatformIntegration.findOneAndUpdate(
      { user: userId, platform: 'twitch', channelId: user.id },
      {
        user: userId,
        platform: 'twitch',
        accessToken: access_token,
        refreshToken: refresh_token,
        channelId: user.id,
        channelName: user.display_name,
        platformUserId: user.id,
        platformUsername: user.display_name,
        status: 'connected'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return integration;
  }

  async handlePatreonCallback(code, userId) {
    // Patreon's token endpoint requires application/x-www-form-urlencoded, not JSON -
    // axios sends a plain object as JSON by default, which Patreon rejects outright
    // (unsupported_grant_type) since it can't parse grant_type out of a JSON body.
    const tokenResponse = await axios.post('https://www.patreon.com/api/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.PATREON_CLIENT_ID,
        client_secret: process.env.PATREON_CLIENT_SECRET,
        redirect_uri: process.env.PATREON_REDIRECT_URI
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get campaign info
    const campaignResponse = await axios.get('https://www.patreon.com/api/oauth2/v2/campaigns?include=creator', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const campaign = campaignResponse.data.data[0];

    // Upsert (not create) - a reconnect for the same campaign must update tokens,
    // not create a duplicate integration record.
    const PlatformIntegration = require('../models/PlatformIntegration');
    const integration = await PlatformIntegration.findOneAndUpdate(
      { user: userId, platform: 'patreon', channelId: campaign.id },
      {
        user: userId,
        platform: 'patreon',
        accessToken: access_token,
        refreshToken: refresh_token,
        channelId: campaign.id,
        channelName: campaign.attributes.creation_name,
        platformUserId: campaign.id,
        platformUsername: campaign.attributes.creation_name,
        status: 'connected'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return integration;
  }

  // Generic method to fetch platform data
  async fetchPlatformData(platform, accessToken, startDate, endDate) {
    switch (platform.toLowerCase()) {
      case 'youtube':
        // BUGFIX: getYouTubeRevenue signature is (accessToken, refreshToken, startDate, endDate)
        return await this.getYouTubeRevenue(accessToken, null, startDate, endDate);
      case 'twitch':
        return await this.getTwitchRevenue(accessToken, startDate, endDate);
      case 'patreon':
        return await this.getPatreonRevenue(accessToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}

module.exports = new PlatformIntegrationService();

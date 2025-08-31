const { google } = require('googleapis');
const axios = require('axios');

class PlatformIntegrationService {
  constructor() {
    this.youtube = google.youtube('v3');
    this.youtubeAnalytics = google.youtubeAnalytics('v2');
  }

  // YouTube Integration
  async getYouTubeRevenue(accessToken, startDate, endDate) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      // Get channel info
      const channelResponse = await this.youtube.channels.list({
        auth,
        part: ['snippet', 'statistics', 'brandingSettings'],
        mine: true,
      });

      if (!channelResponse.data.items.length) {
        throw new Error('No YouTube channel found');
      }

      const channel = channelResponse.data.items[0];

      // Get analytics data
      const analyticsResponse = await this.youtubeAnalytics.reports.query({
        auth,
        ids: `channel==${channel.id}`,
        startDate,
        endDate,
        metrics: 'estimatedRevenue,estimatedAdRevenue,estimatedRedPartnerRevenue',
        dimensions: 'day',
      });

      const revenueData = analyticsResponse.data.rows || [];
      
      return {
        platform: 'youtube',
        channelName: channel.snippet.title,
        channelId: channel.id,
        totalRevenue: revenueData.reduce((sum, row) => sum + (row[1] || 0), 0),
        adRevenue: revenueData.reduce((sum, row) => sum + (row[2] || 0), 0),
        membershipRevenue: revenueData.reduce((sum, row) => sum + (row[3] || 0), 0),
        dailyBreakdown: revenueData.map(row => ({
          date: row[0],
          revenue: row[1] || 0,
          adRevenue: row[2] || 0,
          membershipRevenue: row[3] || 0,
        })),
        subscriberCount: parseInt(channel.statistics.subscriberCount),
        videoCount: parseInt(channel.statistics.videoCount),
        viewCount: parseInt(channel.statistics.viewCount),
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
        channelName: user.display_name,
        channelId: user.id,
        totalRevenue: estimatedSubRevenue + estimatedBitsRevenue,
        subscriptionRevenue: estimatedSubRevenue,
        bitsRevenue: estimatedBitsRevenue,
        totalSubscribers: totalSubs,
        totalBits: bitsTotal,
        followerCount: parseInt(user.view_count), // Twitch doesn't provide follower count in user endpoint
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
          'fields[campaign]': 'creation_name,patron_count,pledge_sum,published_at',
          'fields[user]': 'full_name,url',
        },
      });

      const campaign = campaignResponse.data.data[0];
      const creator = campaignResponse.data.included?.find(item => item.type === 'user');

      // Get pledges
      const pledgesResponse = await axios.get(`https://www.patreon.com/api/oauth2/v2/campaigns/${campaign.id}/pledges`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          include: 'patron,reward',
          'fields[pledge]': 'amount_cents,created_at,declined_since',
        },
      });

      const pledges = pledgesResponse.data.data || [];
      const activePledges = pledges.filter(pledge => !pledge.attributes.declined_since);
      
      const totalRevenue = activePledges.reduce((sum, pledge) => sum + pledge.attributes.amount_cents, 0) / 100;

      return {
        platform: 'patreon',
        campaignName: campaign.attributes.creation_name,
        campaignId: campaign.id,
        creatorName: creator?.attributes.full_name,
        totalRevenue,
        patronCount: campaign.attributes.patron_count,
        pledgeSum: campaign.attributes.pledge_sum / 100,
        activePledges: activePledges.length,
        averagePledge: activePledges.length > 0 ? totalRevenue / activePledges.length : 0,
      };
    } catch (error) {
      console.error('Error fetching Patreon revenue:', error);
      throw new Error('Failed to fetch Patreon revenue data');
    }
  }

  // Generic method to fetch platform data
  async fetchPlatformData(platform, accessToken, startDate, endDate) {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return await this.getYouTubeRevenue(accessToken, startDate, endDate);
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

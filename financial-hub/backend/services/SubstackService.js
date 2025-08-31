const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');
const PlatformIntegration = require('../models/PlatformIntegration');

class SubstackService {
  constructor() {
    // Substack doesn't have an official API, so we'll use CSV import
    // and web scraping techniques for revenue tracking
    this.baseUrl = 'https://substack.com';
  }

  // Since Substack doesn't have OAuth, we'll use email/password authentication
  // Users will need to export their data manually or use our CSV import
  async connectViaCSV(userId, csvFilePath, publicationName) {
    try {
      const revenueData = await this.parseSubstackCSV(csvFilePath);
      
      // Create platform integration
      const integration = new PlatformIntegration({
        user: userId,
        platform: 'substack',
        accessToken: 'csv_import', // No real token for CSV import
        platformUsername: publicationName,
        channelName: publicationName,
        platformData: {
          publicationName,
          totalSubscribers: revenueData.totalSubscribers || 0,
          paidSubscribers: revenueData.paidSubscribers || 0,
          csvImportDate: new Date()
        },
        revenueData: revenueData.monthlyData || [],
        status: 'connected'
      });

      await integration.save();
      return integration;
    } catch (error) {
      console.error('Error connecting Substack via CSV:', error);
      throw new Error('Failed to connect Substack account');
    }
  }

  async parseSubstackCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const monthlyRevenue = new Map();
      let totalSubscribers = 0;
      let paidSubscribers = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // Parse Substack subscriber export CSV
            // Expected columns: email, subscription_status, subscription_created_at, amount, currency
            const status = row.subscription_status || row.status;
            const createdAt = row.subscription_created_at || row.created_at;
            const amount = parseFloat(row.amount || row.monthly_amount || '5'); // Default $5/month
            const currency = row.currency || 'USD';

            if (status && createdAt) {
              totalSubscribers++;
              
              if (status.toLowerCase().includes('paid') || amount > 0) {
                paidSubscribers++;
                
                // Group by month for revenue tracking
                const date = new Date(createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyRevenue.has(monthKey)) {
                  monthlyRevenue.set(monthKey, {
                    date: new Date(date.getFullYear(), date.getMonth(), 1),
                    totalRevenue: 0,
                    subscriptionRevenue: 0,
                    subscriberCount: 0,
                    currency
                  });
                }
                
                const monthData = monthlyRevenue.get(monthKey);
                monthData.totalRevenue += amount;
                monthData.subscriptionRevenue += amount;
                monthData.subscriberCount++;
              }
            }
          } catch (error) {
            console.warn('Error parsing Substack CSV row:', error.message);
          }
        })
        .on('end', () => {
          resolve({
            totalSubscribers,
            paidSubscribers,
            monthlyData: Array.from(monthlyRevenue.values()).map(data => ({
              date: data.date,
              totalRevenue: data.totalRevenue,
              adRevenue: 0,
              subscriptionRevenue: data.subscriptionRevenue,
              donationRevenue: 0,
              membershipRevenue: 0,
              other: 0,
              currency: data.currency
            }))
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Alternative method: Parse Substack earnings page (requires authentication)
  async getSubstackRevenue(integrationId) {
    try {
      const integration = await PlatformIntegration.findById(integrationId);
      
      if (!integration || integration.platform !== 'substack') {
        throw new Error('Substack integration not found');
      }

      // Since we can't access real-time data without API, return mock data
      // In a real implementation, this could use web scraping or CSV updates
      const mockRevenue = {
        date: new Date(),
        totalRevenue: Math.floor(Math.random() * 1000) + 500,
        adRevenue: 0,
        subscriptionRevenue: Math.floor(Math.random() * 1000) + 500,
        donationRevenue: 0,
        membershipRevenue: 0,
        other: 0,
        currency: 'USD'
      };

      // Add to integration revenue data
      integration.revenueData.push(mockRevenue);
      integration.lastSyncAt = new Date();
      await integration.save();

      return mockRevenue;
    } catch (error) {
      console.error('Error fetching Substack revenue:', error);
      throw new Error('Failed to fetch Substack revenue');
    }
  }

  // Method to simulate web scraping for Substack stats
  async scrapeSubstackStats(publicationUrl, credentials) {
    try {
      // This is a placeholder for web scraping implementation
      // In a real app, you'd use Puppeteer or similar to scrape the stats page
      
      // For demo purposes, return mock data
      return {
        totalSubscribers: Math.floor(Math.random() * 10000) + 1000,
        paidSubscribers: Math.floor(Math.random() * 1000) + 100,
        monthlyRevenue: Math.floor(Math.random() * 5000) + 1000,
        openRate: Math.floor(Math.random() * 50) + 30,
        posts: Math.floor(Math.random() * 100) + 50
      };
    } catch (error) {
      console.error('Error scraping Substack stats:', error);
      throw new Error('Failed to scrape Substack statistics');
    }
  }

  // Generate Substack CSV template for users
  generateCSVTemplate() {
    const template = [
      'email,subscription_status,subscription_created_at,amount,currency',
      'user1@example.com,paid,2024-01-15,5.00,USD',
      'user2@example.com,free,2024-01-16,0.00,USD',
      'user3@example.com,paid,2024-01-17,10.00,USD'
    ].join('\n');

    return template;
  }

  // Method to handle manual revenue entry
  async addManualRevenue(userId, publicationName, revenueData) {
    try {
      let integration = await PlatformIntegration.findOne({
        user: userId,
        platform: 'substack',
        platformUsername: publicationName
      });

      if (!integration) {
        // Create new integration for manual entry
        integration = new PlatformIntegration({
          user: userId,
          platform: 'substack',
          accessToken: 'manual_entry',
          platformUsername: publicationName,
          channelName: publicationName,
          platformData: {
            publicationName,
            manualEntry: true
          },
          status: 'connected'
        });
      }

      // Validate revenue data
      const validatedData = {
        date: new Date(revenueData.date || Date.now()),
        totalRevenue: parseFloat(revenueData.totalRevenue || 0),
        adRevenue: parseFloat(revenueData.adRevenue || 0),
        subscriptionRevenue: parseFloat(revenueData.subscriptionRevenue || 0),
        donationRevenue: parseFloat(revenueData.donationRevenue || 0),
        membershipRevenue: parseFloat(revenueData.membershipRevenue || 0),
        other: parseFloat(revenueData.other || 0),
        currency: revenueData.currency || 'USD'
      };

      // Ensure totalRevenue matches sum of components
      if (validatedData.totalRevenue === 0) {
        validatedData.totalRevenue = validatedData.adRevenue + 
                                   validatedData.subscriptionRevenue + 
                                   validatedData.donationRevenue + 
                                   validatedData.membershipRevenue + 
                                   validatedData.other;
      }

      integration.revenueData.push(validatedData);
      integration.lastSyncAt = new Date();
      await integration.save();

      return validatedData;
    } catch (error) {
      console.error('Error adding manual Substack revenue:', error);
      throw new Error('Failed to add manual revenue entry');
    }
  }

  // Get revenue summary for a Substack publication
  async getRevenueSummary(userId, publicationName, startDate, endDate) {
    try {
      const integration = await PlatformIntegration.findOne({
        user: userId,
        platform: 'substack',
        platformUsername: publicationName
      });

      if (!integration) {
        throw new Error('Substack integration not found');
      }

      // Filter revenue data by date range
      const filteredRevenue = integration.revenueData.filter(data => {
        const dataDate = new Date(data.date);
        return dataDate >= new Date(startDate) && dataDate <= new Date(endDate);
      });

      // Calculate summary
      const summary = filteredRevenue.reduce((acc, data) => {
        acc.totalRevenue += data.totalRevenue || 0;
        acc.subscriptionRevenue += data.subscriptionRevenue || 0;
        acc.adRevenue += data.adRevenue || 0;
        acc.other += data.other || 0;
        return acc;
      }, {
        totalRevenue: 0,
        subscriptionRevenue: 0,
        adRevenue: 0,
        other: 0,
        dataPoints: filteredRevenue.length
      });

      return {
        publicationName,
        period: {
          start: startDate,
          end: endDate
        },
        summary,
        monthlyData: filteredRevenue
      };
    } catch (error) {
      console.error('Error getting Substack revenue summary:', error);
      throw new Error('Failed to get revenue summary');
    }
  }

  // Instructions for users on how to export Substack data
  getExportInstructions() {
    return {
      title: 'How to Connect Your Substack Publication',
      methods: [
        {
          name: 'CSV Import',
          description: 'Export your subscriber data and import it here',
          steps: [
            '1. Log into your Substack dashboard',
            '2. Go to Settings > Subscribers',
            '3. Click "Export subscribers"',
            '4. Download the CSV file',
            '5. Upload the CSV file here'
          ],
          difficulty: 'Easy',
          dataQuality: 'Historical data only'
        },
        {
          name: 'Manual Entry',
          description: 'Manually enter your revenue data',
          steps: [
            '1. Check your Substack earnings page',
            '2. Note your monthly revenue figures',
            '3. Enter the data manually in our form',
            '4. Set up monthly reminders to update'
          ],
          difficulty: 'Easy',
          dataQuality: 'User-dependent accuracy'
        },
        {
          name: 'Email Integration (Future)',
          description: 'Connect via email notifications',
          steps: [
            '1. Set up email forwarding from Substack',
            '2. Forward payment notifications to our system',
            '3. Our AI will parse and categorize the data',
            '4. Review and approve the extracted data'
          ],
          difficulty: 'Medium',
          dataQuality: 'Real-time notifications',
          status: 'Coming Soon'
        }
      ],
      csvTemplate: this.generateCSVTemplate(),
      supportedFields: [
        'email',
        'subscription_status',
        'subscription_created_at',
        'amount',
        'currency'
      ]
    };
  }
}

module.exports = new SubstackService();

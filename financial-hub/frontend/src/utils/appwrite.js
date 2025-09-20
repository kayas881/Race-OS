import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint(process.env.REACT_APP_APPWRITE_ENDPOINT)
    .setProject(process.env.REACT_APP_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

// Database and Collection IDs (must match backend)
export const DATABASE_ID = process.env.REACT_APP_APPWRITE_DATABASE_ID || 'race-os-financial-hub';
export const COLLECTIONS = {
    users: process.env.REACT_APP_APPWRITE_USERS_COLLECTION_ID || 'users',
    transactions: 'transactions',
    accounts: 'accounts',
    categories: 'categories',
    clients: 'clients',
    invoices: 'invoices',
    integrations: 'integrations',
    platformIntegrations: 'platform-integrations',
    bankIntegrations: 'bank-integrations',
    taxCalculations: 'tax-calculations',
    branding: 'branding'
};
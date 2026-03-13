import { Client, Account } from 'node-appwrite';
const client = new Client().setEndpoint('https://cloud.appwrite.io/v1').setProject('69af5ae2000dfd855871');
const account = new Account(client);
account.createEmailPasswordSession('test@example.com', 'password123').then(console.log).catch(console.error);


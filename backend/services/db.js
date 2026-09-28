const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

let mongoClient = null;
let mongoDb = null;

const DATA_NAMES = ['users', 'medicines', 'shipments', 'blockchain', 'notifications'];

class Collection {
  constructor(name) {
    this.name = name;
    this.data = [];
    this.mongoCollection = null;
  }

  attach(collection) {
    this.mongoCollection = collection;
  }

  async load() {
    if (!this.mongoCollection) return;
    this.data = await this.mongoCollection.find({}).project({ _id: 0 }).toArray();
  }

  save() {
    // Keep the existing synchronous API used by the routes, but persist asynchronously.
    if (!this.mongoCollection) return;
    const snapshot = JSON.parse(JSON.stringify(this.data));
    this.mongoCollection.deleteMany({})
      .then(() => snapshot.length ? this.mongoCollection.insertMany(snapshot) : null)
      .catch(err => console.error(`MongoDB save error for ${this.name}:`, err.message));
  }

  find(predicate = () => true) {
    return this.data.filter(predicate);
  }

  findOne(predicate) {
    return this.data.find(predicate) || null;
  }

  insert(item) {
    const newItem = {
      ...item,
      id: item.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      createdAt: item.createdAt || new Date().toISOString()
    };
    this.data.push(newItem);
    this.save();
    return newItem;
  }

  update(predicate, updates) {
    const index = this.data.findIndex(predicate);
    if (index === -1) return null;
    this.data[index] = {
      ...this.data[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data[index];
  }

  delete(predicate) {
    const index = this.data.findIndex(predicate);
    if (index === -1) return false;
    this.data.splice(index, 1);
    this.save();
    return true;
  }

  count(predicate = () => true) {
    return this.data.filter(predicate).length;
  }
}

const users = new Collection('users');
const medicines = new Collection('medicines');
const shipments = new Collection('shipments');
const blockchain = new Collection('blockchain');
const notifications = new Collection('notifications');

function getMongoUri() {
  const user = encodeURIComponent(process.env.MONGODB_USER || '');
  const password = encodeURIComponent(process.env.MONGODB_PASSWORD || '');
  const hosts = [process.env.MONGODB_HOST1, process.env.MONGODB_HOST2, process.env.MONGODB_HOST3].filter(Boolean);
  const database = process.env.MONGODB_DATABASE || 'medichain';
  if (!user || !password || hosts.length !== 3) {
    throw new Error('Set MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST1, MONGODB_HOST2 and MONGODB_HOST3 in .env');
  }
  return `mongodb://${user}:${password}@${hosts.join(',')}/${database}?tls=true&authSource=admin&retryWrites=true&w=majority`;
}

async function seedDefaultUsers() {
  if (users.count() !== 0) return;
  console.log('Seeding default MediChain role accounts...');
  const salt = bcrypt.genSaltSync(10);
  const accounts = [
    { name:'System Administrator', email:'admin@medichain.com', password:bcrypt.hashSync('admin12345', salt), plainPasswordNotice:'admin12345', role:'admin', organization:'MediChain Core' },
    { name:'Apex Pharma Labs', email:'manufacturer@medichain.com', password:bcrypt.hashSync('manu12345', salt), plainPasswordNotice:'manu12345', role:'manufacturer', organization:'Apex Pharma Ltd' },
    { name:'Global Med Logistics', email:'distributor@medichain.com', password:bcrypt.hashSync('dist12345', salt), plainPasswordNotice:'dist12345', role:'distributor', organization:'Global Distribution Inc' },
    { name:'ColdChain Express', email:'transporter@medichain.com', password:bcrypt.hashSync('trans12345', salt), plainPasswordNotice:'trans12345', role:'transporter', organization:'ColdChain Logistics Ltd' },
    { name:'MediChain Customer', email:'customer@medichain.com', password:bcrypt.hashSync('customer12345', salt), plainPasswordNotice:'customer12345', role:'customer', organization:'MediChain Customer Portal' },
    { name:'CityCare Pharmacy', email:'pharmacy@medichain.com', password:bcrypt.hashSync('pharm12345', salt), plainPasswordNotice:'pharm12345', role:'pharmacy', organization:'CityCare Healthcare Group' }
  ];
  accounts.forEach(a => users.insert(a));
  console.log('Default accounts created successfully.');
}

async function connectDB() {
  mongoClient = new MongoClient(getMongoUri(), {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });
  await mongoClient.connect();
  mongoDb = mongoClient.db(process.env.MONGODB_DATABASE || 'medichain');
  const collections = { users, medicines, shipments, blockchain, notifications };
  for (const name of DATA_NAMES) {
    const exists = await mongoDb.listCollections({ name }).hasNext();
    if (!exists) await mongoDb.createCollection(name);
    collections[name].attach(mongoDb.collection(name));
    await collections[name].load();
  }
  await seedDefaultUsers();
  console.log('MongoDB connected');
}

module.exports = { users, medicines, shipments, blockchain, notifications, connectDB };

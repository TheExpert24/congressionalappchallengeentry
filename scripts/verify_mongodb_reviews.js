// Quick verification: count reviews per course in MongoDB
// Usage: node scripts/verify_mongodb_reviews.js
// Requires env: MONGODB_URI, optionally MONGODB_DB

require('dotenv').config();

async function main(){
  const uri = process.env.MONGODB_URI;
  if (!uri){
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB || 'ohs_reviews';
  const db = client.db(dbName);
  
  const pipeline = [
    { $group: { _id: '$course_id', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ];
  const results = await db.collection('reviews').aggregate(pipeline).toArray();
  console.log('Review counts by course:');
  for (const row of results){
    console.log(`${row._id}: ${row.count}`);
  }
  await client.close();
}

main().catch(err=>{ console.error(err); process.exit(1); });

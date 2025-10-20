// One-off importer: push data/reviews.json into MongoDB collections
// Usage: node scripts/migrate_reviews_to_mongodb.js
// Requires env: MONGODB_URI, optionally MONGODB_DB (defaults to ohs_reviews)

const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main(){
  const uri = process.env.MONGODB_URI;
  if (!uri){
    console.error('Missing MONGODB_URI in .env');
    console.error('Get a free cluster at https://mongodb.com/cloud/atlas');
    process.exit(1);
  }
  let MongoClient;
  try{ ({ MongoClient } = require('mongodb')); }
  catch(e){
    console.error('Please install mongodb first: npm i mongodb');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB || 'ohs_reviews';
  const db = client.db(dbName);
  console.log('[MIGRATE] Connected to MongoDB:', dbName);

  const file = path.join(process.cwd(), 'data', 'reviews.json');
  let json;
  try{ json = JSON.parse(fs.readFileSync(file,'utf8')); }
  catch(e){ console.error('Failed to read data/reviews.json', e.message || e); process.exit(1); }

  // Flatten into arrays
  const reviews = [];
  const replies = [];
  for (const [courseId, list] of Object.entries(json)){
    if (!Array.isArray(list)) continue;
    for (const r of list){
      const base = {
        id: String(r.id),
        course_id: String(r.course_id || courseId),
        rating: r.rating === undefined || r.rating === null ? null : Number(r.rating),
        author: r.author === undefined ? null : r.author,
        text: String(r.text || ''),
        created_at: r.created_at ? new Date(r.created_at) : new Date(),
        status: r.status || 'published',
        upvotes: typeof r.upvotes === 'number' ? r.upvotes : 0,
        downvotes: typeof r.downvotes === 'number' ? r.downvotes : 0,
        poster_email: r.poster_email || null,
        poster_sid: r.poster_sid || null
      };
      reviews.push(base);
      const reps = Array.isArray(r.replies) ? r.replies : [];
      for (const rep of reps){
        replies.push({
          id: String(rep.id), review_id: String(rep.review_id || r.id),
          author: rep.author === undefined ? null : rep.author,
          text: String(rep.text || ''),
          created_at: rep.created_at ? new Date(rep.created_at) : new Date(),
          poster_email: rep.poster_email || null,
          poster_sid: rep.poster_sid || null
        });
      }
    }
  }

  console.log(`[MIGRATE] Preparing to migrate ${reviews.length} reviews and ${replies.length} replies...`);
  
  // Use bulkWrite for upsert (updateOne with upsert:true)
  if (reviews.length){
    const ops = reviews.map(r => ({
      updateOne: { filter: { id: r.id }, update: { $set: r }, upsert: true }
    }));
    const res = await db.collection('reviews').bulkWrite(ops);
    console.log(`[OK] reviews upserted: ${res.upsertedCount} new, ${res.modifiedCount} updated`);
  }
  if (replies.length){
    const ops = replies.map(r => ({
      updateOne: { filter: { id: r.id }, update: { $set: r }, upsert: true }
    }));
    const res = await db.collection('review_replies').bulkWrite(ops);
    console.log(`[OK] replies upserted: ${res.upsertedCount} new, ${res.modifiedCount} updated`);
  }

  // Create indexes
  await db.collection('reviews').createIndex({ course_id: 1, created_at: -1 });
  await db.collection('reviews').createIndex({ id: 1 }, { unique: true });
  await db.collection('review_replies').createIndex({ review_id: 1, created_at: -1 });
  await db.collection('review_replies').createIndex({ id: 1 }, { unique: true });
  console.log('[OK] Indexes created');

  await client.close();
  console.log('Done.');
}

main().catch(err=>{ console.error(err); process.exit(1); });

// Reviews data store abstraction with three providers:
// - MongoDB when MONGODB_URI is set
// - Supabase (Postgres) when SUPABASE_URL and SUPABASE_SERVICE_KEY are set
// - JSON file fallback (current behavior) otherwise
//
// MongoDB collections:
//   reviews: { _id, id (string), course_id, rating, author, text, created_at, status, upvotes, downvotes, poster_email, poster_sid }
//   review_replies: { _id, id (string), review_id, author, text, created_at, poster_email, poster_sid }
//
// Tables expected in Supabase:
//   reviews(id text primary key, course_id text, rating int null, author text null,
//           text text, created_at timestamptz, status text, upvotes int default 0,
//           downvotes int default 0, poster_email text null, poster_sid text null)
//   review_replies(id text primary key, review_id text references reviews(id) on delete cascade,
//                  author text null, text text, created_at timestamptz,
//                  poster_email text null, poster_sid text null)
//
// NOTE: We preserve legacy string IDs (e.g., r_..., rp_...) for backwards compatibility.

const fs = require('fs');
const path = require('path');

const REVIEWS_FILE = path.join(__dirname, '..', 'data', 'reviews.json');

function readJson(file){
  try{ return JSON.parse(fs.readFileSync(file,'utf8')); }catch(e){ return null; }
}
function writeJson(file, obj){
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj,null,2),'utf8');
}

// ---------- JSON provider ----------
const jsonProvider = {
  async getReviewsByCourse(courseId){
    const all = readJson(REVIEWS_FILE) || {};
    const list = Array.isArray(all[courseId]) ? all[courseId] : [];
    // Ensure shape similar to DB: include replies array and vote counters
    return list.map(r => ({
      replies: [], upvotes: 0, downvotes: 0, ...r,
      // replies may be absent in older records
      replies: Array.isArray(r.replies) ? r.replies : []
    }));
  },
  async getReview(courseId, reviewId){
    const all = readJson(REVIEWS_FILE) || {};
    const list = Array.isArray(all[courseId]) ? all[courseId] : [];
    const r = list.find(x => x.id === reviewId);
    return r ? ({ replies: [], upvotes: 0, downvotes: 0, ...r, replies: Array.isArray(r.replies) ? r.replies : [] }) : null;
  },
  async createReview(courseId, review){
    const all = readJson(REVIEWS_FILE) || {};
    all[courseId] = Array.isArray(all[courseId]) ? all[courseId] : [];
    all[courseId].unshift(review);
    writeJson(REVIEWS_FILE, all);
    return review;
  },
  async addReply(courseId, reviewId, reply){
    const all = readJson(REVIEWS_FILE) || {};
    const list = Array.isArray(all[courseId]) ? all[courseId] : [];
    const r = list.find(x => x.id === reviewId);
    if (!r) throw new Error('review not found');
    r.replies = Array.isArray(r.replies) ? r.replies : [];
    r.replies.unshift(reply);
    writeJson(REVIEWS_FILE, all);
    return reply;
  },
  async updateVoteCounts(courseId, reviewId, updater){
    const all = readJson(REVIEWS_FILE) || {};
    const list = Array.isArray(all[courseId]) ? all[courseId] : [];
    const r = list.find(x => x.id === reviewId);
    if (!r) throw new Error('review not found');
    r.upvotes = typeof r.upvotes === 'number' ? r.upvotes : 0;
    r.downvotes = typeof r.downvotes === 'number' ? r.downvotes : 0;
    const { upvotes, downvotes } = updater({ upvotes: r.upvotes, downvotes: r.downvotes });
    r.upvotes = upvotes; r.downvotes = downvotes;
    writeJson(REVIEWS_FILE, all);
    return { upvotes: r.upvotes, downvotes: r.downvotes };
  },
  async deleteReview(courseId, reviewId){
    const all = readJson(REVIEWS_FILE) || {};
    const list = Array.isArray(all[courseId]) ? all[courseId] : [];
    const idx = list.findIndex(x => x.id === reviewId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    all[courseId] = list;
    writeJson(REVIEWS_FILE, all);
    return true;
  }
};

// ---------- Supabase provider ----------
function makeSupabaseProvider(){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  let supabase = null;
  try{
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(url, key, { auth: { persistSession: false } });
  }catch(e){
    console.error('[REVIEWS] failed to load supabase client', e && e.message ? e.message : e);
    return null;
  }
  return {
    async getReviewsByCourse(courseId){
      const { data, error } = await supabase
        .from('reviews')
        .select('id, course_id, rating, author, text, created_at, status, upvotes, downvotes, poster_email, poster_sid, replies:review_replies(id, review_id, author, text, created_at, poster_email, poster_sid)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async getReview(courseId, reviewId){
      const { data, error } = await supabase
        .from('reviews')
        .select('id, course_id, rating, author, text, created_at, status, upvotes, downvotes, poster_email, poster_sid, replies:review_replies(id, review_id, author, text, created_at, poster_email, poster_sid)')
        .eq('course_id', courseId)
        .eq('id', reviewId)
        .single();
      if (error) return null;
      return data;
    },
    async createReview(courseId, review){
      const { error } = await supabase.from('reviews').insert(review);
      if (error) throw error;
      return review;
    },
    async addReply(courseId, reviewId, reply){
      // courseId is unused here; reviewId links the reply
      const { error } = await supabase.from('review_replies').insert(reply);
      if (error) throw error;
      return reply;
    },
    async updateVoteCounts(courseId, reviewId, updater){
      // Fetch current
      const { data, error } = await supabase
        .from('reviews')
        .select('upvotes, downvotes')
        .eq('course_id', courseId)
        .eq('id', reviewId)
        .single();
      if (error) throw error;
      const curr = { upvotes: data?.upvotes || 0, downvotes: data?.downvotes || 0 };
      const next = updater(curr);
      const { error: uerr } = await supabase
        .from('reviews')
        .update({ upvotes: next.upvotes, downvotes: next.downvotes })
        .eq('course_id', courseId)
        .eq('id', reviewId);
      if (uerr) throw uerr;
      return next;
    },
    async deleteReview(courseId, reviewId){
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('course_id', courseId)
        .eq('id', reviewId);
      if (error) throw error;
      return true;
    },
    async getAllReviewsAdmin(){
      // Fetch all reviews and replies separately, then merge and group by course_id
      const { data: reviews, error: rerr } = await supabase
        .from('reviews')
        .select('id, course_id, rating, author, text, created_at, status, upvotes, downvotes, poster_email, poster_sid')
        .order('created_at', { ascending: false });
      if (rerr) throw rerr;
      const { data: replies, error: perr } = await supabase
        .from('review_replies')
        .select('id, review_id, author, text, created_at, poster_email, poster_sid')
        .order('created_at', { ascending: false });
      if (perr) throw perr;
      const byReview = new Map();
      (replies || []).forEach(rep => {
        const arr = byReview.get(rep.review_id) || [];
        arr.push(rep);
        byReview.set(rep.review_id, arr);
      });
      const grouped = {};
      (reviews || []).forEach(r => {
        const withReplies = Object.assign({}, r, { replies: byReview.get(r.id) || [] });
        const arr = grouped[r.course_id] || [];
        arr.push(withReplies);
        grouped[r.course_id] = arr;
      });
      return grouped;
    }
  };
}

// ---------- MongoDB provider ----------
function makeMongoProvider(){
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  let client = null;
  let db = null;
  try{
    const { MongoClient } = require('mongodb');
    client = new MongoClient(uri);
    // Connect lazily on first op; for now just prep
    const dbName = process.env.MONGODB_DB || 'ohs_reviews';
    let connected = false;
    async function ensureConnected(){
      if (!connected){
        await client.connect();
        db = client.db(dbName);
        connected = true;
        console.log('[REVIEWS] MongoDB connected to', dbName);
      }
    }
    return {
      async getReviewsByCourse(courseId){
        await ensureConnected();
        const reviews = await db.collection('reviews')
          .find({ course_id: courseId })
          .sort({ created_at: -1 })
          .toArray();
        const ids = reviews.map(r => r.id);
        const replies = ids.length ? await db.collection('review_replies')
          .find({ review_id: { $in: ids } })
          .sort({ created_at: -1 })
          .toArray() : [];
        const grouped = new Map();
        replies.forEach(rep => {
          const arr = grouped.get(rep.review_id) || [];
          arr.push(rep);
          grouped.set(rep.review_id, arr);
        });
        return reviews.map(r => {
          const { _id, ...rest } = r;
          return { ...rest, replies: grouped.get(r.id) || [] };
        });
      },
      async getReview(courseId, reviewId){
        await ensureConnected();
        const review = await db.collection('reviews').findOne({ course_id: courseId, id: reviewId });
        if (!review) return null;
        const replies = await db.collection('review_replies')
          .find({ review_id: reviewId })
          .sort({ created_at: -1 })
          .toArray();
        const { _id, ...rest } = review;
        return { ...rest, replies: replies.map(r => { const { _id, ...rr } = r; return rr; }) };
      },
      async createReview(courseId, review){
        await ensureConnected();
        await db.collection('reviews').insertOne(review);
        return review;
      },
      async addReply(courseId, reviewId, reply){
        await ensureConnected();
        await db.collection('review_replies').insertOne(reply);
        return reply;
      },
      async updateVoteCounts(courseId, reviewId, updater){
        await ensureConnected();
        const review = await db.collection('reviews').findOne({ course_id: courseId, id: reviewId });
        if (!review) throw new Error('review not found');
        const curr = { upvotes: review.upvotes || 0, downvotes: review.downvotes || 0 };
        const next = updater(curr);
        await db.collection('reviews').updateOne(
          { course_id: courseId, id: reviewId },
          { $set: { upvotes: next.upvotes, downvotes: next.downvotes } }
        );
        return next;
      },
      async deleteReview(courseId, reviewId){
        await ensureConnected();
        const res = await db.collection('reviews').deleteOne({ course_id: courseId, id: reviewId });
        if (res.deletedCount) await db.collection('review_replies').deleteMany({ review_id: reviewId });
        return res.deletedCount > 0;
      },
      async getAllReviewsAdmin(){
        await ensureConnected();
        const reviews = await db.collection('reviews')
          .find({})
          .sort({ created_at: -1 })
          .toArray();
        const ids = reviews.map(r => r.id);
        const replies = ids.length ? await db.collection('review_replies')
          .find({ review_id: { $in: ids } })
          .sort({ created_at: -1 })
          .toArray() : [];
        const byReview = new Map();
        replies.forEach(rep => {
          const arr = byReview.get(rep.review_id) || [];
          // strip _id
          const { _id, ...rest } = rep;
          arr.push(rest);
          byReview.set(rep.review_id, arr);
        });
        const grouped = {};
        reviews.forEach(r => {
          const { _id, ...rest } = r;
          const withReplies = { ...rest, replies: byReview.get(r.id) || [] };
          const arr = grouped[r.course_id] || [];
          arr.push(withReplies);
          grouped[r.course_id] = arr;
        });
        return grouped;
      }
    };
  }catch(e){
    console.error('[REVIEWS] failed to load mongodb client', e && e.message ? e.message : e);
    return null;
  }
}

const mongo = makeMongoProvider();
const supa = makeSupabaseProvider();
const provider = mongo || supa || jsonProvider;

module.exports = {
  usingMongo: !!mongo,
  usingSupabase: !!supa,
  getReviewsByCourse: provider.getReviewsByCourse,
  getReview: provider.getReview,
  createReview: provider.createReview,
  addReply: provider.addReply,
  updateVoteCounts: provider.updateVoteCounts,
  deleteReview: provider.deleteReview,
  // For admin endpoint to fetch all reviews grouped by course
  getAllReviewsAdmin: provider.getAllReviewsAdmin ? provider.getAllReviewsAdmin : async () => {
    // default to JSON fallback
    const all = readJson(REVIEWS_FILE) || {};
    return all;
  }
};

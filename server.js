require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const client = new MongoClient(process.env.MONGODB_URI);

let clicks;

async function start() {
    await client.connect();

    const db = client.db("next_gen_opportunities");
    clicks = db.collection("clicks");

    await clicks.createIndex({ slug: 1 }, { unique: true });

    app.listen(port, () => {
        console.log("server running on port " + port);
    });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "website")));

app.get("/api/clicks", async (req, res) => {
    try {
        const rows = await clicks.find({}).toArray();

        res.json(
            rows.map(row => ({
                slug: row.slug,
                count: row.count
            }))
        );
    } catch (error) {
        console.error("error loading clicks:", error);
        res.status(500).json({ error: "Unable to load clicks" });
    }
});

app.post("/api/click/:slug", async (req, res) => {
    try {
        const slug = req.params.slug;

        const result = await clicks.findOneAndUpdate(
            { slug },
            { $inc: { count: 1 } },
            { upsert: true, returnDocument: "after" }
        );

        res.json({
            slug: result.slug,
            count: result.count
        });
    } catch (error) {
        console.error("error recording click:", error);
        res.status(500).json({ error: "Unable to record click" });
    }
});

app.get("/api/top-opportunities", async (req, res) => {
    try {
        const rows = await clicks
            .find({})
            .sort({ count: -1 })
            .toArray();

        res.json(
            rows.map(row => ({
                slug: row.slug,
                count: row.count
            }))
        );
    } catch (error) {
        console.error("error loading top opportunities:", error);
        res.status(500).json({ error: "Unable to load top opportunities" });
    }
});

start().catch(error => {
    console.error("failed to start server:", error);
    process.exit(1);
});
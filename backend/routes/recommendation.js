const express = require("express");
const fs = require("fs");
const router = express.Router();
const hashProfile = require("../utils/hashProfile");
const { rerankRecommendations } = require("../controller/aiController");
const {
  violatesAllergy,
  violatesDietary,
  violatesCondition,
  healthScore,
  buildReason,
} = require("../utils/profileSafety");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const products = JSON.parse(fs.readFileSync("products.json", "utf8"));
const productsById = new Map(products.map((p) => [p.id, p]));

const supabase = createClient(
  process.env.EXPO_PUBLIC_PROJECT_URL,
  process.env.EXPO_PUBLIC_PUBLIC_ANON_KEY,
);

// Bump to invalidate Supabase-cached recommendations whenever the filtering /
// scoring rules change (the version is mixed into the profile hash).
const RULES_VERSION = 3;
const RESULT_COUNT = 10;
const RERANK_POOL = 20;
const RERANK_TIMEOUT_MS = 8000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);

// Rank all profile-safe products by health score, deduped by product name so
// the shelf isn't ten near-identical peanut butters.
const rankSafeProducts = (userProfile) => {
  const safe = [];
  let conditionsRelaxed = false;

  const collect = (relaxConditions) => {
    safe.length = 0;
    for (const p of products) {
      if (!p.product_name || !p.id) continue;
      if (violatesAllergy(p, userProfile.allergies)) continue;
      if (violatesDietary(p, userProfile.dietary)) continue;
      if (!relaxConditions && violatesCondition(p, userProfile.conditions)) continue;
      safe.push(p);
    }
  };

  collect(false);
  if (safe.length < RESULT_COUNT) {
    // Condition thresholds can be too strict for this catalogue — relax them,
    // but NEVER the allergy/dietary rules.
    conditionsRelaxed = true;
    collect(true);
  }

  const ranked = safe
    .map((p) => ({ p, score: healthScore(p, userProfile) }))
    .sort((a, b) => b.score - a.score);

  const seenNames = new Set();
  const deduped = [];
  for (const { p } of ranked) {
    const nameKey = p.product_name.toLowerCase().replace(/[^a-z]/g, "");
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    deduped.push(p);
  }
  return { ranked: deduped, conditionsRelaxed };
};

const toDetails = (ids, userProfile) =>
  ids
    .map((id) => productsById.get(id))
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.product_name || "Unknown product",
      nutriscore_grade: (p.nutriscore_grade || "").toLowerCase(),
      reason: buildReason(p, userProfile),
    }));

router.post("/", async (req, res) => {
  try {
    const { userProfile } = req.body;
    if (!userProfile) {
      return res.status(400).json({ error: "Missing user profile" });
    }
    const profile = {
      allergies: userProfile.allergies || [],
      conditions: userProfile.conditions || [],
      dietary: userProfile.dietary || [],
    };

    // 1. Cached result for this exact profile + rules version?
    const profileHash = hashProfile({ v: RULES_VERSION, ...profile });
    const { data: cachedRows } = await supabase
      .from("recommended_products")
      .select("product_ids")
      .eq("profile_hash", profileHash)
      .limit(1);
    const cachedIds = cachedRows?.[0]?.product_ids;
    if (Array.isArray(cachedIds) && cachedIds.length > 0) {
      return res.json({
        finalProductIds: cachedIds,
        products: toDetails(cachedIds, profile),
      });
    }

    // 2. Deterministic filter + health scoring over the whole catalogue.
    const { ranked, conditionsRelaxed } = rankSafeProducts(profile);
    console.log(
      `✅ ${ranked.length} profile-safe products${conditionsRelaxed ? " (condition rules relaxed)" : ""}`,
    );
    let finalIds = ranked.slice(0, RESULT_COUNT).map((p) => p.id);

    // 3. Optional single AI re-rank of the top pool. Strictly best-effort:
    //    on timeout/parse failure we keep the deterministic order.
    if (finalIds.length > 0) {
      try {
        const pool = ranked.slice(0, RERANK_POOL);
        const candidates = pool.map((p) => ({
          id: p.id,
          name: p.product_name,
          nutriscore: p.nutriscore_grade,
          sugars_100g: p.nutriments?.sugars_100g ?? null,
          salt_100g: p.nutriments?.salt_100g ?? null,
          proteins_100g: p.nutriments?.proteins_100g ?? null,
        }));
        const aiIds = await withTimeout(
          rerankRecommendations(profile, candidates),
          RERANK_TIMEOUT_MS,
        );
        const poolIds = new Set(pool.map((p) => p.id));
        const valid = [...new Set(aiIds)].filter((id) => poolIds.has(id));
        if (valid.length >= RESULT_COUNT / 2) {
          finalIds = [...new Set([...valid, ...finalIds])].slice(0, RESULT_COUNT);
        }
      } catch (err) {
        console.warn("⚠️ AI re-rank skipped:", err.message);
      }
    }

    // 4. Cache for the next request with this profile (best-effort).
    if (finalIds.length > 0) {
      const { error: insertError } = await supabase
        .from("recommended_products")
        .insert([{ profile_hash: profileHash, product_ids: finalIds }]);
      if (insertError) {
        console.warn("⚠️ Failed to cache recommendations:", insertError.message);
      }
    }

    res.json({ finalProductIds: finalIds, products: toDetails(finalIds, profile) });
  } catch (error) {
    console.error("Error building recommendations:", error);
    res.status(500).json({ error: "Failed to build recommendations" });
  }
});

module.exports = router;

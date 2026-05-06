# Flower Doctor App — MVP Project Summary

## Goal

Create a simple mobile-first “Flower Doctor” application for non-technical users (especially casual home gardeners and parents) that helps identify plant problems from uploaded images.

The app should:

* identify the plant,
* detect possible diseases/problems,
* explain issues in simple language,
* provide practical care recommendations.

The experience should feel like chatting with a friendly gardening assistant.

---

# Core User Flow

1. User uploads:

   * photo of a leaf,
   * flower,
   * stem,
   * or whole plant.

2. Backend sends image to PlantNet API:

   * identifies plant species,
   * returns confidence score.

3. Backend sends:

   * original image,
   * detected species
     to Flora API.

4. Flora API analyzes:

   * diseases,
   * pests,
   * deficiencies,
   * watering issues,
   * general plant health.

5. Gemini Flash receives:

   * PlantNet result,
   * Flora API result,
   * image (optional),
   * structured metadata.

6. Gemini generates:

   * friendly explanation,
   * summary of likely issues,
   * recommended actions,
   * urgency level,
   * follow-up suggestions.

# Recommended Tech Stack

## Frontend

Preferred:

* React Native

Requirements:

* image upload,
* simple clean UI,
* chat-style response screen,
* history of previous scans.

## Backend

Preferred:

* Firebase Functions
  or
* Supabase Edge Functions

Responsibilities:

* API orchestration,
* prompt building,
* response aggregation,
* rate limiting,
* image storage.

---

# APIs / AI Services

## 1. PlantNet API

Purpose:

* plant species identification.

Use only for:

* species name,
* confidence score.

---

## 2. Flora API

Purpose:

* disease detection,
* health analysis,
* care recommendations.

Expected outputs:

* possible diseases,
* probability/confidence,
* treatment suggestions,
* watering/light advice.

---

## 3. Gemini Model

Purpose:

* conversational reasoning layer,
* summarize all collected data,
* generate human-friendly responses.

Gemini should:

* avoid overconfidence,
* present issues as probabilities,
* explain recommendations simply,
* answer follow-up questions.

Gemini should NOT invent diagnoses unsupported by Flora API.

---

# Example Final User Response

“Your Monstera plant may be showing early signs of overwatering and possible root stress. The yellowing leaves and dark spots often happen when the soil stays wet too long. Try reducing watering frequency and make sure the pot drains properly. Remove severely damaged leaves and monitor for improvement over the next 5–7 days.”

---

# Important Product Principles

## 1. Avoid absolute certainty

Do not say:

* “Your plant definitely has root rot.”

Instead say:

* “Possible signs of root rot.”
* “Likely overwatering.”

---

## 2. Focus on simplicity

Target audience:

* parents,
* casual gardeners,
* non-technical users.

The app should feel:

* calm,
* friendly,
* trustworthy,
* easy to use.

---

## 3. MVP First

Do NOT overengineer.

Initial MVP only needs:

* image upload,
* API integration,
* simple result screen,
* basic history.

Avoid initially:

* social features,
* marketplace,
* advanced analytics,
* custom ML training,
* user accounts (optional).

---

# Suggested MVP Features

## Required

* Upload plant image
* Plant identification
* Disease analysis
* Friendly AI explanation
* Suggested actions
* Scan history

## Nice-to-have
* Plant care reminders
* Save favorite plants


# Cost Optimization

Use:

* Gemini Flash instead of Pro models.
* PlantNet free tier for species identification.
* Flora API free tier for early MVP.

Goal:

* keep MVP near $0–$20/month initially.
* All necesery API keys will be provided to you.

---

# Desired Outcome

The result should be:

* a lightweight “AI plant doctor,”
* optimized for fast iteration,
* easy to scale later,
* accurate enough for home gardening use,
* conversational and approachable.

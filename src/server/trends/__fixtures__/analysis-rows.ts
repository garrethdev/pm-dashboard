/**
 * Real reference_analysis and references_unified rows, copied from the live
 * database on 2026-10-31 and shortened (long prose cut, image lists trimmed to
 * what the dashboard reads). One per way the reader has written a row:
 *
 *  - v2:     the reader as of 2026-10-31 (reference 7567, the radar's first find)
 *  - perez:  the older, fuller 10-slide read (reference 3542)
 *  - legacy: the Oct 8 multiformat v1 read, no coverage block (reference 4722)
 *
 * If the n8n reader's output changes, re-copy a row here and let the tests say
 * what the dashboard no longer understands.
 */
export const v2 = {
  row: {
    source_reference_id: 7567,
    analysis_version: "phase0-multiformat-v2",
    inspection_status: "complete",
    topic: "Navigating Halloween treats while on Mounjaro (GLP-1 medication).",
    angle: "Harm reduction and guilt-free enjoyment through mindful eating and tracking.",
    hook_family: "Listicle / Warning",
    emotional_tone: "Empathetic, educational, reassuring, and slightly cautionary.",
    visual_style: "Casual, authentic selfie-style photography with bold, high-contrast text overlays.",
    opener_treatment: "A relatable portrait of the creator in a festive sweater with a bold red text box stating the topic clearly.",
    proof_placement: "Proof is experiential and physiological, placed within the list items.",
    cta_structure: "Soft sell integrated into the advice, followed by a direct instruction to search the App Store.",
    observed: { coverage: { supplied_images: 1, inspected_images: 1 }, media_inventory: [] },
    inferred: {
      niche: "peptide_glp1_weight_loss",
      payoff: { position: 9, description: "The biggest takeaway: patterns over single-meal guilt, leading into the app." },
      topic_tags: ["mounjaro_tips", "glp1_lifestyle", "holiday_eating", "weight_loss_journey"],
      replication: {
        keep: ["The 'Mistakes to avoid' listicle format."],
        change: ["Swap 'Halloween' for other holidays."],
        peptide_adaptation: "A peptide or GLP-1 brand could remake this as '7 Thanksgiving Mistakes to Avoid on Semaglutide'.",
      },
      why_it_works: "This carousel earns views by targeting a high-anxiety moment for dieters with specific, medically-grounded advice.",
      hook_mechanism: "A timely seasonal event combined with a specific medication creates immediate relevance.",
      story_structure: "Problem-Agitation-Solution (PAS) variant within a listicle.",
      reusable_pattern: {
        invariants: ["Timely hook connecting a specific event to a chronic condition.", "Numbered list of actionable 'don'ts'."],
        limitations: ["Relies heavily on the audience being on Mounjaro specifically."],
      },
      first_product_slide: 5,
      first_explicit_cta_slide: 9,
    },
    updated_at: "2026-10-31T16:25:41.745+00:00",
  },
  ref: {
    id: 7567, platform: "tiktok", creator_handle: "lisafitlife1", hook_text: "Halloween on Mounjaro?",
    source_url: "https://www.tiktok.com/@lisafitlife1/photo/7702665325111725325", thumbnail_url: "https://example.test/7567.webp",
    views: 6038, likes: 17, saves: 2, total_score: 8.517316220752912, views_normalized: 5.97,
    published_at: "2026-10-31T03:15:38+00:00", created_at: "2026-10-31T16:00:07.216868+00:00",
    niche_tags: ["peptide_niche"], hook_type: null, trending_at: "2026-10-31T16:25:42.151994+00:00",
  },
};

export const perez = {
  row: {
    source_reference_id: 3542,
    analysis_version: "perez-slides-v1",
    inspection_status: "complete",
    topic: "lifestyle",
    angle: "listicle",
    hook_family: "outcome_preview",
    emotional_tone: "aspirational and empowering",
    visual_style: "luxurious and aesthetic lifestyle photography",
    opener_treatment: "The opener combines an aspirational image with a question/topic statement.",
    proof_placement: "Source imagery observed; outcome evidence not independently authenticated",
    cta_structure: "The CTA is explicit, stating 'LINK IN BIO'.",
    observed: {
      coverage: { supplied_images: 10, inspected_images: 10 },
      media_inventory: [
        { position: 0, image_url: "https://example.test/3542-0.jpg" },
        { position: 1, image_url: "https://example.test/3542-1.jpg" },
        { position: 2, image_url: "https://example.test/3542-2.jpg" },
      ],
    },
    inferred: {
      payoff: { location: "slide", position: 10, description: "The payoff is the promotion of a digital guide." },
      topic_tags: ["lifestyle"],
      story_structure: "listicle",
      hook_mechanism: "The first image shows an aspirational woman in a luxurious setting.",
      reusable_pattern: { invariants: ["Numbered listicle format for tips/steps."], limitations: ["Requires high-quality visuals."] },
      // The reader wrote these as objects with evidence ids, not strings.
      audience_response: {
        themes: [{ theme: "Releasing control", evidence_comment_ids: ["sample:3542:3"] }],
        questions: [{ question: "what makes these actions “feminine”?", evidence_comment_ids: ["sample:3542:2"] }],
      },
      first_product_slide: 7,
      first_explicit_cta_slide: 10,
    },
    updated_at: "2026-09-12T17:13:58.481+00:00",
  },
  ref: {
    id: 3542, platform: "tiktok", creator_handle: "becomingher54", hook_text: "#becomingher",
    source_url: "https://www.tiktok.com/@becomingher54/photo/7458290082131365126", thumbnail_url: "https://example.test/3542-thumb.jpg",
    views: 300460, likes: 22658, saves: 5996, total_score: 5.48, views_normalized: 300460,
    published_at: null, created_at: "2026-09-12T14:40:36.48633+00:00",
    niche_tags: ["virlo", "slideshow"], hook_type: null, trending_at: null,
  },
};

export const legacy = {
  row: {
    source_reference_id: 4722,
    analysis_version: "phase0-multiformat-v1",
    inspection_status: "complete",
    topic: null, angle: null,
    hook_family: "Product Comparison",
    emotional_tone: null, visual_style: null, opener_treatment: null, proof_placement: null,
    cta_structure: "Implicit endorsement via high scores; no direct call to action",
    observed: { coverage: null, media_inventory: [] },
    inferred: { carousel_conversion: { potential: 0.8, proposed_hook: "What if your eye cream could replace Botox?" } },
    updated_at: "2026-10-09T10:10:15.805+00:00",
  },
  ref: {
    id: 4722, platform: "tiktok", creator_handle: "that.girl.amnaa", hook_text: null,
    source_url: "https://www.tiktok.com/@that.girl.amnaa/photo/7655260906305195284", thumbnail_url: "https://example.test/4722.jpg",
    views: 0, likes: 0, saves: 0, total_score: 0, views_normalized: 0,
    published_at: "2026-06-25T09:22:10+00:00", created_at: "2026-10-08T10:00:25.28814+00:00",
    niche_tags: ["virlo", "slideshow"], hook_type: null, trending_at: null,
  },
};

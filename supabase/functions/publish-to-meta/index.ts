/**
 * publish-to-meta Edge Function
 * Publicerar kampanjinnehåll till Facebook/Instagram via Meta Graph API
 * 
 * WAS-416: Meta (Facebook/Instagram) publiceringsflöde
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { withErrorHandling, jsonResponse, AIError } from "../_shared/error-handler.ts";

interface PublishRequest {
  campaign_id: string;
  page_ids: string[];
  message?: string;
}

interface PageToken {
  id: string;
  token: string;
}

interface MetaPageTokens {
  [pageName: string]: PageToken;
}

interface PublishResult {
  page_id: string;
  page_name: string;
  post_id?: string;
  error?: string;
}

Deno.serve(withErrorHandling(async (req: Request) => {
  // Parse request body
  const body: PublishRequest = await req.json();
  const { campaign_id, page_ids, message: customMessage } = body;

  if (!campaign_id) {
    throw new AIError("campaign_id är obligatoriskt", 400, "MISSING_CAMPAIGN_ID");
  }

  if (!page_ids || page_ids.length === 0) {
    throw new AIError("page_ids är obligatoriskt och måste innehålla minst en sida", 400, "MISSING_PAGE_IDS");
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch campaign data
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, name, description, key_messages, status")
    .eq("id", campaign_id)
    .single();

  if (campaignError || !campaign) {
    throw new AIError(
      `Kampanjen hittades inte: ${campaignError?.message || "okänt fel"}`,
      404,
      "CAMPAIGN_NOT_FOUND"
    );
  }

  // Read META_PAGE_TOKENS from environment
  const metaTokensJson = Deno.env.get("META_PAGE_TOKENS");
  if (!metaTokensJson) {
    throw new AIError(
      "META_PAGE_TOKENS är inte konfigurerat",
      500,
      "MISSING_META_TOKENS"
    );
  }

  let pageTokens: MetaPageTokens;
  try {
    pageTokens = JSON.parse(metaTokensJson);
  } catch (e) {
    throw new AIError(
      "META_PAGE_TOKENS har ogiltigt JSON-format",
      500,
      "INVALID_META_TOKENS"
    );
  }

  // Build lookup by page ID
  const tokensByPageId: Record<string, { name: string; token: string }> = {};
  for (const [pageName, pageData] of Object.entries(pageTokens)) {
    tokensByPageId[pageData.id] = { name: pageName, token: pageData.token };
  }

  // Compose message from campaign data or use custom message
  const postMessage = customMessage || composeMessage(campaign);

  // Publish to each selected page
  const results: PublishResult[] = [];

  for (const pageId of page_ids) {
    const pageInfo = tokensByPageId[pageId];

    if (!pageInfo) {
      results.push({
        page_id: pageId,
        page_name: "Okänd",
        error: `Ingen token hittades för page_id: ${pageId}`,
      });
      continue;
    }

    try {
      const postResult = await publishToFacebook(pageId, pageInfo.token, postMessage);
      results.push({
        page_id: pageId,
        page_name: pageInfo.name,
        post_id: postResult.id,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Okänt fel";
      results.push({
        page_id: pageId,
        page_name: pageInfo.name,
        error: errorMessage,
      });
    }
  }

  // Check if any publication succeeded
  const successfulPosts = results.filter((r) => r.post_id && !r.error);
  const hasSuccess = successfulPosts.length > 0;

  // Update campaign status to 'published' if at least one succeeded
  if (hasSuccess) {
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ status: "published" })
      .eq("id", campaign_id);

    if (updateError) {
      console.error("[publish-to-meta] Failed to update campaign status:", updateError);
    }
  }

  // Return results
  return jsonResponse({
    ok: hasSuccess,
    campaign_id,
    message: postMessage,
    published: results,
    summary: {
      total: page_ids.length,
      successful: successfulPosts.length,
      failed: results.filter((r) => r.error).length,
    },
  });
}));

/**
 * Compose a post message from campaign data
 */
function composeMessage(campaign: {
  name: string;
  description?: string;
  key_messages?: string[];
}): string {
  const parts: string[] = [];

  // Add campaign name as title
  parts.push(`📢 ${campaign.name}`);

  // Add description if available
  if (campaign.description) {
    parts.push("");
    parts.push(campaign.description);
  }

  // Add key messages as bullet points
  if (campaign.key_messages && campaign.key_messages.length > 0) {
    parts.push("");
    for (const msg of campaign.key_messages) {
      parts.push(`✅ ${msg}`);
    }
  }

  return parts.join("\n");
}

/**
 * Publish a post to Facebook via Graph API
 */
async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string
): Promise<{ id: string }> {
  const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      access_token: accessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.error?.message || `HTTP ${response.status}`;
    throw new Error(`Facebook API fel: ${errorMsg}`);
  }

  if (!data.id) {
    throw new Error("Inget post-ID returnerades från Facebook");
  }

  return { id: data.id };
}

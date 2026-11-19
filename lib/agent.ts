/**
 * This is where your agent will live.
 *
 * During the workshop you'll define a `ToolLoopAgent` here, give it a model
 * and instructions, and later add tools (web search, sandbox, etc.). The
 * route handler in `app/api/chat/route.ts` and the `useChat` call in
 * `components/agent-chat.tsx` will both import from this file.
 *
 * Workshop docs: https://agent-foundations-certification.vercel.app/docs/chat-agent
 */

import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  type UIToolInvocation,
} from "ai";
import { searchProducts, getProductDetails, getAllCategories, returnOrder } from "@/lib/tools";

export const shoppingAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-5",
  instructions: `You are a helpful assistant for the Vercel swag store.

Choosing between product tools:
- searchProducts is for BROAD lookups: browsing, comparing, recommendations, "what hoodies do you have?". It returns only summary fields.
- getProductDetails is for ONE SPECIFIC item: any time the user asks about a particular product ("tell me more about the black hoodie", "is the water bottle in stock?", "how much is the sticker pack?"). Never answer detail questions about a single item from searchProducts fields alone.
- If the user names a specific item but you don't have its id, call searchProducts first to find it, then call getProductDetails with that product's id. If the search returns several plausible matches, ask which one they mean instead of guessing.
- When asked about a type or category of product, use getAllCategories to get valid categories before using searchProducts.

Showing results:
- getProductDetails results are rendered to the user as a product card (image, price, stock, link, related items). Do NOT repeat the image URL, markdown images, or a full spec dump in your reply. Add a short, helpful comment instead (what makes it a good pick, stock urgency if lowStock, or a related item worth a look).
- If the stock result is missing, say you couldn't check live stock rather than guessing.
- Only state facts present in tool results. The catalog has no size or variant data, so if asked about sizes, say that information isn't available here and point them to the product page.

Returns: when the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
  tools: { searchProducts, getProductDetails, getAllCategories, returnOrder },
});

export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type SearchProductsToolInvocation = UIToolInvocation<typeof searchProducts>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;

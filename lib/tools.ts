import { tool } from "ai";
import { z } from "zod";
import { ApiRequestError, createReturn, getCategories, getOrder, getProductById, getProducts, getProductStock, preauthorizeRefund, notifyReturnInProcess } from "@/lib/api";
import type { ProductDetailsResult } from "@/lib/types";
import { start } from "workflow/api";
import { returnFlow } from "./workflows/return-flow";

export const searchProducts = tool({
  description: `Broad catalog lookup: search the Vercel swag store and return up to 10 matching products with summary fields only (id, name, slug, first image, price, category, description). Use this to browse, compare, or get recommendations, or to find a product's id when the user names an item loosely. It does NOT return stock levels, all images, or tags. When the user asks about ONE specific item ("tell me more about the black hoodie", "is it in stock?"), find its id here if needed and then call getProductDetails. Optionally narrow results to a single category.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        `Optional free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
      ),
    category: z
      .string()
      .optional()
      .describe(
        `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`,
      ),
  }),
  execute: async ({ query, category }) => {
     "use step";
    try {
      const products = await getProducts({
        search: query,
        category,
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0],
          price: p.price,
          currency: p.currency,
          category: p.category,
          description: p.description,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, products: [], error: message };
    }
  },
});

export const getProductDetails = tool({
  description: `Get the full details of ONE specific product: description, price, ALL images, tags, category, live stock level (in stock / low stock / units left), a link to the product page, and a few related products. Use this whenever the user asks about a specific item (e.g. "tell me more about the black hoodie", "is the water bottle in stock?", "show me the sticker pack"). The result is shown to the user as a product card in the chat automatically. If you only have a loose name, call searchProducts first to find the product id, then call this with that id. Do NOT use this to browse or compare many products; use searchProducts for that.`,
  inputSchema: z.object({
    idOrSlug: z
      .string()
      .min(1)
      .describe(
        `The product id (e.g. 'hoodie_001') or slug (e.g. 'black-pullover-hoodie'), taken from a searchProducts result. Do not guess; look it up if unsure.`,
      ),
  }),
  execute: async ({ idOrSlug }): Promise<ProductDetailsResult> => {
     "use step";
    try {
      const product = await getProductById(idOrSlug);

      // Stock and related products are independent; a failure in either should
      // degrade the result rather than discard the product we already have.
      const [stockRes, relatedRes] = await Promise.allSettled([
        getProductStock(product.id),
        getProducts({ category: product.category, limit: 8 }),
      ]);

      const stock =
        stockRes.status === "fulfilled"
          ? {
              stock: stockRes.value.stock,
              inStock: stockRes.value.inStock,
              lowStock: stockRes.value.lowStock,
            }
          : null;

      const related =
        relatedRes.status === "fulfilled"
          ? relatedRes.value
              .filter((p) => p.id !== product.id)
              .slice(0, 4)
              .map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                image: p.images[0],
                price: p.price,
                currency: p.currency,
              }))
          : [];

      return {
        found: true,
        product: { ...product, url: `/products/${product.id}` },
        stock,
        related,
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { found: false, error: message };
    }
  },
});

export const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
     "use step";
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

export const returnOrder = tool({
  description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
  inputSchema: z.object({
    orderId: z
      .string()
      .describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
     "use step";
    const run = await start(returnFlow, [orderId, reason]);
    return { runId: run.runId, message: `Return request received for order ${orderId}.` };
  },
});
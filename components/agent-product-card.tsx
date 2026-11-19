"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import type { ProductDetailsToolInvocation } from "@/lib/agent";
import type { ProductDetailsResult } from "@/lib/types";

type FoundResult = Extract<ProductDetailsResult, { found: true }>;

interface AgentProductCardProps {
  invocation: ProductDetailsToolInvocation;
}

export function AgentProductCard({ invocation }: AgentProductCardProps) {
  if (
    invocation.state === "input-streaming" ||
    invocation.state === "input-available"
  ) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Looking up product details…
      </div>
    );
  }

  if (invocation.state === "output-error") {
    return <CardError message={invocation.errorText} />;
  }

  if (invocation.state !== "output-available") return null;

  const output = invocation.output;
  if (!output) return null;

  if (!output.found) return <CardError message={output.error} />;

  return <ProductCard result={output} />;
}

function CardError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

function StockBadge({ stock }: { stock: FoundResult["stock"] }) {
  if (!stock) return <Badge variant="outline">Stock unavailable</Badge>;
  if (!stock.inStock) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock.lowStock)
    return <Badge variant="secondary">Only {stock.stock} left</Badge>;
  return <Badge variant="secondary">In stock ({stock.stock})</Badge>;
}

function ProductCard({ result }: { result: FoundResult }) {
  const { product, stock, related } = result;
  const [active, setActive] = useState(0);
  const image = product.images[active] ?? product.images[0];

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
      <div className="relative aspect-square bg-secondary">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="384px"
            className="object-cover"
          />
        )}
      </div>

      {product.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2">
          {product.images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1} of ${product.images.length}`}
              className={`relative size-12 shrink-0 overflow-hidden rounded border ${
                i === active ? "border-foreground" : "border-border"
              }`}
            >
              <Image src={src} alt="" fill sizes="48px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium">{product.name}</h3>
          <span className="shrink-0 text-sm font-medium">
            {formatPrice(product.price, product.currency)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StockBadge stock={stock} />
          <Badge variant="outline" className="capitalize">
            {product.category}
          </Badge>
          {product.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{product.description}</p>
        <Link
          href={product.url}
          className="inline-block text-sm font-medium underline underline-offset-4"
        >
          View product page
        </Link>
      </div>

      {related.length > 0 && (
        <div className="border-t border-border p-3">
          <p className="mb-2 text-xs text-muted-foreground">You might also like</p>
          <div className="grid grid-cols-4 gap-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/products/${r.id}`}
                title={`${r.name} · ${formatPrice(r.price, r.currency)}`}
                className="block"
              >
                <div className="relative aspect-square overflow-hidden rounded bg-secondary">
                  {r.image && (
                    <Image
                      src={r.image}
                      alt={r.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-tight">
                  {r.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

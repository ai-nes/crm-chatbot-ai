import type { Metadata } from "next";
import { getSiteUrl, SITE } from "./site";

interface BuildPageMetadataOptions {
  title: string;
  description?: string;
  path: string;
  noindex?: boolean;
}

export function buildPageMetadata({
  title,
  description,
  path,
  noindex = false,
}: BuildPageMetadataOptions): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/${path.replace(/^\//, "")}`;
  const desc = description || SITE.defaultDescription;
  const ogTitle = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;

  return {
    title,
    description: desc,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: ogTitle,
      description: desc,
      url: canonical,
      siteName: SITE.name,
      locale: SITE.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: desc,
    },
  };
}

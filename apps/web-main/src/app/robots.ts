import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/settings/", "/callback/"],
    },
    sitemap: "https://app.safehaven-upllyft.com/sitemap.xml",
  };
}

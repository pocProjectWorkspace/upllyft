import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/callback/"],
    },
    sitemap: "https://resources.safehaven-upllyft.com/sitemap.xml",
  };
}

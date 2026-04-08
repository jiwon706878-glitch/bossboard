import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/api/",
          "/admin/",
          "/auth/",
          "/login",
          "/signup",
          "/reset-password",
          "/onboarding",
        ],
      },
    ],
    sitemap: "https://mybossboard.com/sitemap.xml",
  };
}

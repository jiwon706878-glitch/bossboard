/**
 * Migration script: Supabase Storage → Backblaze B2
 *
 * Usage:
 *   npx tsx --env-file .env.local scripts/migrate-supabase-to-b2.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   B2_ENDPOINT, B2_REGION, B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY, B2_BUCKET_NAME
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const s3 = new S3Client({
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  region: process.env.B2_REGION || "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.B2_BUCKET_NAME!;

async function migrateBucket(bucketName: string) {
  console.log(`\n--- Migrating bucket: ${bucketName} ---`);

  const { data: files, error } = await supabase.storage.from(bucketName).list("", {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error || !files) {
    console.error(`Failed to list ${bucketName}:`, error?.message);
    return;
  }

  // Recursively list all files (including subdirectories)
  const allFiles: string[] = [];
  async function listRecursive(prefix: string) {
    const { data } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
    if (!data) return;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        allFiles.push(path); // It's a file
      } else {
        await listRecursive(path); // It's a folder
      }
    }
  }
  await listRecursive("");

  console.log(`Found ${allFiles.length} files in ${bucketName}`);

  let migrated = 0;
  let failed = 0;

  for (const filePath of allFiles) {
    try {
      // Download from Supabase
      const { data, error: dlError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (dlError || !data) {
        console.error(`  SKIP ${filePath}: ${dlError?.message}`);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());

      // Upload to B2 with same key structure
      const key = bucketName === "attachments" ? filePath : `wiki-uploads/${filePath}`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: data.type || "application/octet-stream",
      }));

      migrated++;
      if (migrated % 10 === 0 || migrated === allFiles.length) {
        console.log(`  Migrated ${migrated}/${allFiles.length} files...`);
      }
    } catch (err) {
      console.error(`  FAIL ${filePath}:`, err);
      failed++;
    }
  }

  console.log(`\n${bucketName}: ${migrated} migrated, ${failed} failed out of ${allFiles.length}`);
}

async function main() {
  console.log("Starting Supabase → B2 migration...");
  console.log(`B2 bucket: ${BUCKET}`);

  await migrateBucket("attachments");
  await migrateBucket("wiki-uploads");

  console.log("\n✓ Migration complete. Verify files in B2 before removing from Supabase.");
}

main().catch(console.error);

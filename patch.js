const fs = require('fs');
let code = fs.readFileSync('apps/portal/app/(hub)/page.tsx', 'utf8');

code = code.replace(/import \{ cachedRSC \} from "@\/lib\/server-cache";\n/, '');
code = code.replace(/import \{ withCache \} from "@\/lib\/cache-utils";\n/, '');
code = code.replace(/import \{ CacheCategory \} from "@repo\/redis";\n/, '');

// Replace getDashboardCounts
code = code.replace(/async function getDashboardCounts\([\s\S]*?\{\n\s*return cachedRSC\([\s\S]*?async \(\) => \{\n\s*return withCache\([\s\S]*?const db = await createReadReplicaClient\(cookieList\);([\s\S]*?)\},[\s\S]*?\{[\s\S]*?tags: \[([^\]]*)\],[\s\S]*?\}\n\s*\);\n\s*\},[\s\S]*?\{[\s\S]*?revalidate: ([0-9]+),[\s\S]*?tags: \[([^\]]*)\],[\s\S]*?\}\n\s*\);\n\}/, 
`async function getDashboardCounts(
  today: string,
  userId: string,
) {
  "use cache: private";
  const { cacheTag, cacheLife } = await import("next/cache");
  cacheTag($4);
  cacheLife({ expire: $3 });

  const cookieStore = await cookies();
  const db = await createReadReplicaClient(cookieStore.getAll());$1`);

// Actually, regex replace is risky for this large block. Let's write a targeted script or just replace the whole file.

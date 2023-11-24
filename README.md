# firebase-storage

## Sample

```ts
import { createStorage } from "firebase-storage";

const privateKey = `-----BEGIN PRIVATE KEY-----\nXXXXXXXXXXXXXXXX-----END PRIVATE KEY-----\n`;
const clientEmail =
  "firebase-adminsdk-XXXXX0XXXXX@XXXXXXX.iam.gserviceaccount.com";

async function main() {
  const bucket = "XXXXXXX.appspot.com";
  const storage = createStorage({ privateKey, clientEmail });

  const file = new Blob(["Test value"], {
    type: "text/plain",
  });

  await storage
    .upload({
      bucket,
      published: true,
      name: "test",
      file,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
      },
    })
    .then(console.log);

  await storage
    .list({ bucket })
    .then((objects) => objects.map((obj) => console.log));

  await storage.info({ bucket, name: "test" }).then(console.log);

  await storage
    .download({
      bucket,
      name: "test",
    })
    .then((v) => {
      console.log(new TextDecoder().decode(v));
    });

  await storage.del({ bucket, name: "test" }).then(console.log);
}

main().catch(console.error);
```

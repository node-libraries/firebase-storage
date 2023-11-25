# firebase-storage

Easily operate Google cloud storage with a private key.

## Sample

```ts
import { getStorage } from "firebase-storage";

const privateKey = `-----BEGIN PRIVATE KEY-----\nXXXXXXXXXXXXXXXX-----END PRIVATE KEY-----\n`;
const clientEmail =
  "firebase-adminsdk-XXXXX0XXXXX@XXXXXXX.iam.gserviceaccount.com";

async function main() {
  const bucket = "XXXXXXXX.appspot.com";
  const storage = getStorage({ privateKey, clientEmail, bucket });
  const file = new Blob(["Test value"], {
    type: "text/plain",
  });

  await storage
    .upload({
      published: true,
      name: "test",
      file,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
      },
    })
    .then(console.log);
  await storage.list({ bucket }).then((objects) => objects.map(console.log));
  await storage.info({ name: "test" }).then(console.log);
  await storage
    .download({
      name: "test",
    })
    .then((v) => {
      console.log(new TextDecoder().decode(v));
    });
  await storage.del({ name: "test" }).then(console.log);
}

main().catch(console.error);
```

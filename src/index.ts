import { semaphore } from "@node-libraries/semaphore";
import { SignJWT, importPKCS8 } from "jose";

export interface StorageObject {
  kind: string;
  id: string;
  selfLink: string;
  mediaLink: string;
  name: string;
  bucket: string;
  generation: string;
  metageneration: string;
  contentType: string;
  storageClass: string;
  size: string;
  md5Hash: string;
  cacheControl: string;
  crc32c: string;
  etag: string;
  timeCreated: string;
  updated: string;
  timeStorageClassUpdated: string;
}

export const createToken = ({
  clientEmail,
  privateKey,
}: {
  clientEmail: string;
  privateKey: string;
}) =>
  importPKCS8(privateKey, "RS256").then((key) =>
    new SignJWT({
      iss: clientEmail,
      sub: clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      iat: Math.floor(Date.now() / 1000) - 30,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .sign(key)
  );

export const info = ({
  token,
  bucket,
  name,
}: {
  token: string;
  bucket: string;
  name: string;
}): Promise<StorageObject> => {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
    bucket
  )}/o/${encodeURIComponent(name)}`;
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => {
    if (res.status !== 200) throw new Error(res.statusText);
    return res.json();
  });
};

export const download = ({
  token,
  bucket,
  name,
}: {
  token: string;
  bucket: string;
  name: string;
}) => {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
    bucket
  )}/o/${encodeURIComponent(name)}?alt=media&no=${Date.now()}`;
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => {
    if (res.status !== 200) throw new Error(res.statusText);
    return res.arrayBuffer();
  });
};

export const upload = ({
  token,
  bucket,
  name,
  file,
  published,
  metadata,
}: {
  token: string;
  bucket: string;
  name: string;
  file: Blob;
  published?: boolean;
  metadata?: { [key: string]: unknown };
}) => {
  const id = encodeURI(name);

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(
    bucket
  )}/o?name=${id}&uploadType=multipart${
    published ? "&predefinedAcl=publicRead" : ""
  }`;
  const body = new FormData();
  body.append(
    "",
    new Blob([JSON.stringify({ metadata })], { type: "application/json" })
  );
  body.append("", file);
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: body,
  }).then((res) => {
    if (res.status !== 200) throw new Error(res.statusText);
    return res.json();
  });
};

export const del = ({
  token,
  bucket,
  name,
}: {
  token: string;
  bucket: string;
  name: string;
}) => {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
    bucket
  )}/o/${encodeURIComponent(name)}`;
  return fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => {
    if (res.status !== 204) throw new Error(res.statusText);
    return true;
  });
};

export const list = ({
  token,
  bucket,
}: {
  token: string;
  bucket: string;
}): Promise<StorageObject[]> => {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
    bucket
  )}/o`;
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      if (res.status !== 200) throw new Error(res.statusText);
      return res.json();
    })
    .then((res) => res.items);
};

type ParamType<
  T extends (...args: never[]) => unknown,
  P = Parameters<T>[0]
> = Omit<P, "token" | "bucket"> & { bucket?: string };

export const getStorage = ({
  clientEmail,
  privateKey,
  bucket: _bucket,
  parallels = 1000,
}: {
  clientEmail: string;
  privateKey: string;
  bucket?: string;
  parallels?: number;
}) => {
  const property = {
    token: "",
    expire: 0,
  };
  const getToken = async () => {
    if (property.expire > Date.now() / 1000 + 300) return property.token;
    property.expire = Math.floor(Date.now() / 1000) + 3600;
    property.token = await createToken({ clientEmail, privateKey });
    return property.token;
  };
  const getBucket = (bucket?: string) => {
    const result = bucket ?? _bucket;
    if (!result) throw new Error("bucket is not defined");
    return result;
  };
  const s = semaphore(parallels);
  return {
    info: async (params: ParamType<typeof info>) => {
      await s.acquire();
      return info({
        ...params,
        token: await getToken(),
        bucket: getBucket(params.bucket),
      }).finally(() => s.release());
    },
    download: async (params: ParamType<typeof download>) => {
      await s.acquire();
      return download({
        ...params,
        token: await getToken(),
        bucket: getBucket(params.bucket),
      }).finally(() => s.release());
    },
    upload: async (params: ParamType<typeof upload>) => {
      await s.acquire();
      return upload({
        ...params,
        token: await getToken(),
        bucket: getBucket(params.bucket),
      }).finally(() => s.release());
    },
    del: async (params: ParamType<typeof del>) => {
      await s.acquire();
      return del({
        ...params,
        token: await getToken(),
        bucket: getBucket(params.bucket),
      }).finally(() => s.release());
    },
    list: async (params: ParamType<typeof list>) => {
      await s.acquire();
      return list({
        ...params,
        token: await getToken(),
        bucket: getBucket(params.bucket),
      }).finally(() => s.release());
    },
  };
};

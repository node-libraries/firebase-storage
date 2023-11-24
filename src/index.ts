import jwt from "jsonwebtoken";

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
  jwt.sign(
    {
      iss: clientEmail,
      sub: clientEmail,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    privateKey,
    {
      algorithm: "RS256",
    }
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
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${name}`;
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
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${name}?alt=media&no=${Date.now()}`;
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

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?name=${id}&uploadType=multipart${
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
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${name}`;
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
  bucket?: string;
}): Promise<StorageObject[]> => {
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o`;
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

export const createStorage = ({
  clientEmail,
  privateKey,
}: {
  clientEmail: string;
  privateKey: string;
}) => {
  const token = createToken({ clientEmail, privateKey });
  return {
    info: ({ bucket, name }: Omit<Parameters<typeof info>[0], "token">) =>
      info({ token, bucket, name }),
    download: ({
      bucket,
      name,
    }: Omit<Parameters<typeof download>[0], "token">) =>
      download({ token, bucket, name }),
    upload: ({
      bucket,
      name,
      file,
      published,
      metadata,
    }: Omit<Parameters<typeof upload>[0], "token">) =>
      upload({ token, bucket, name, file, published, metadata }),
    del: ({ bucket, name }: Omit<Parameters<typeof del>[0], "token">) =>
      del({ token, bucket, name }),
    list: ({ bucket }: Omit<Parameters<typeof list>[0], "token">) =>
      list({ token, bucket }),
  };
};

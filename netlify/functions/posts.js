import { getStore } from "@netlify/blobs";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function send(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

export default async function handler(request) {
  const store = getStore("mind-postits");

  if (request.method === "GET") {
    const posts = await store.get("posts", { type: "json" });
    return send({
      ok: true,
      posts: posts || []
    });
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));

    const pinFromHeader = request.headers.get("x-admin-pin");
    const pinFromBody = body.adminPin;
    const adminPin = pinFromHeader || pinFromBody;

    if (adminPin !== process.env.ADMIN_PIN) {
      return send({
        ok: false,
        message: "관리자 비밀번호가 맞지 않습니다."
      }, 401);
    }

    const text = String(body.text || "").trim();

    if (!text) {
      return send({
        ok: false,
        message: "내용이 비어 있습니다."
      }, 400);
    }

    const posts = await store.get("posts", { type: "json" }) || [];

    const newPost = {
      id: crypto.randomUUID(),
      text,
      author: body.author || "",
      color: body.color || "#fff3a3",
      createdAt: new Date().toISOString()
    };

    const nextPosts = [newPost, ...posts].slice(0, 300);

    await store.setJSON("posts", nextPosts);

    return send({
      ok: true,
      post: newPost,
      posts: nextPosts
    });
  }

  if (request.method === "DELETE") {
    const pinFromHeader = request.headers.get("x-admin-pin");

    if (pinFromHeader !== process.env.ADMIN_PIN) {
      return send({
        ok: false,
        message: "관리자 비밀번호가 맞지 않습니다."
      }, 401);
    }

    await store.setJSON("posts", []);

    return send({
      ok: true,
      posts: []
    });
  }

  return send({
    ok: false,
    message: "지원하지 않는 요청입니다."
  }, 405);
}

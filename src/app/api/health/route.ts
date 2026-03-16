export async function GET() {
  return Response.json(
    {
      status: "ok",
      db: "deferred",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}

export default async function handler(req, res) {
  return res.status(200).json({
    reply: "سلام 👋 ارتباط API با موفقیت برقرار است."
  });
}

import Imap from "imap";
import { simpleParser } from "mailparser";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();


const imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: Number(process.env.IMAP_PORT), // 993
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

imap.once("ready", () => {
  openInbox((err, box) => {
    if (err) throw err;
    console.log("📥 Listening for new mails...");

    imap.on("mail", () => {
      const f = imap.seq.fetch(box.messages.total + ":" + box.messages.total, {
        bodies: "",
        markSeen: false,
      });

      f.on("message", (msg) => {
        msg.on("body", (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return;

            console.log("📩 New Mail:", parsed.subject);

            // Send to backend API
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/new-mail`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                from: parsed.from?.text,
                subject: parsed.subject,
                text: parsed.text,
                html: parsed.html,
              }),
            });
          });
        });
      });
    });
  });
});

imap.once("error", (err) => console.log("❌ IMAP Error:", err));
imap.once("end", () => console.log("IMAP Connection ended."));
imap.connect();

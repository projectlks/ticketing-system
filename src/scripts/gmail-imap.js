import Imap from "imap";
import { simpleParser } from "mailparser";
import fetch from "node-fetch";
// import { checkEventStatus } from "../libs/action";
// import { checkEventStatus } from "../libs/zabbix";
// import { checkEventStatus } from "../libs/zabbix";



// Gmail credentials
const imap = new Imap({
  user: "iamlinkar13@gmail.com", // သင့် Gmail address
  password: "scwdrdkfhsrhitfs", // သင့် App Password (space မလို)
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }, // <-- add this line
});
// scwdrdkfhsrhitfs
function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

imap.once("ready", function () {
  openInbox(function (err, box) {
    if (err) throw err;
    console.log("✅ Connected to Gmail INBOX");

    // Mail အသစ် detect
    imap.on("mail", function (numNewMsgs) {
      console.log(`📩 New mail detected: ${numNewMsgs}`);

      // Fetch the newest message
      const fetcher = imap.seq.fetch(
        box.messages.total + ":" + box.messages.total,
        {
          bodies: "",
          markSeen: false,
        }
      );

      fetcher.on("message", function (msg) {
        msg.on("body", function (stream) {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              console.log("❌ Parse error:", err);
              return;
            }

        

            // 🔗 Next.js backend API call
            await fetch("http://localhost:3000/api/new-mail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                from: parsed.from.text,
                subject: parsed.subject,
                text: parsed.text,
              }),
            });

            console.log("✅ Sent to backend API");
          });
        });
      });
    });
  });
});

imap.once("error", (err) => console.log("❌ IMAP error:", err));
imap.once("end", () => console.log("Connection ended"));
imap.connect();

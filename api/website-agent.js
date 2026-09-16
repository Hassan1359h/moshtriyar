export default async function handler(req, res) {

    if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const userId =
        String(req.query?.userId || "").trim();

    const site =
        String(req.query?.site || "").trim();

    if (!userId) {
        res.status(400).send("Missing userId");
        return;
    }

    const script = `

(function () {

    "use strict";

    if (window.__MOSHTRIYAR_AGENT__) {
        return;
    }

    window.__MOSHTRIYAR_AGENT__ = true;

    var config = {
        userId: ${JSON.stringify(userId)},
        site: ${JSON.stringify(site)}
    };


    function createAgent() {

        if (document.getElementById("moshtiryar-ai-agent")) {
            return;
        }


        var button = document.createElement("button");

        button.id =
            "moshtiryar-ai-agent";

        button.type =
            "button";

        button.innerHTML =
            "🤖";


        button.style.cssText =
            "position:fixed;" +
            "bottom:20px;" +
            "right:20px;" +
            "width:58px;" +
            "height:58px;" +
            "border:none;" +
            "border-radius:50%;" +
            "background:#2563eb;" +
            "color:#fff;" +
            "font-size:26px;" +
            "cursor:pointer;" +
            "z-index:2147483647;" +
            "box-shadow:0 8px 25px rgba(0,0,0,.22);";


        var box =
            document.createElement("div");

        box.id =
            "moshtiryar-ai-box";


        box.style.cssText =
            "display:none;" +
            "position:fixed;" +
            "bottom:90px;" +
            "right:20px;" +
            "width:340px;" +
            "max-width:calc(100vw - 30px);" +
            "height:480px;" +
            "max-height:calc(100vh - 120px);" +
            "background:#fff;" +
            "border-radius:18px;" +
            "overflow:hidden;" +
            "z-index:2147483646;" +
            "box-shadow:0 15px 45px rgba(15,23,42,.25);" +
            "border:1px solid #e2e8f0;" +
            "font-family:Tahoma,Arial,sans-serif;" +
            "direction:rtl;";


        var header =
            document.createElement("div");

        header.style.cssText =
            "height:58px;" +
            "background:linear-gradient(135deg,#2563eb,#7c3aed);" +
            "color:#fff;" +
            "display:flex;" +
            "align-items:center;" +
            "justify-content:space-between;" +
            "padding:0 14px;" +
            "font-weight:900;";


        header.innerHTML =
            '<span>🤖 دستیار هوشمند مشتری‌یار</span>' +
            '<button id="moshtiryar-ai-close" ' +
            'type="button" ' +
            'style="border:none;background:transparent;color:#fff;font-size:22px;cursor:pointer;">' +
            '×' +
            '</button>';


        var messages =
            document.createElement("div");

        messages.id =
            "moshtiryar-ai-messages";


        messages.style.cssText =
            "height:360px;" +
            "overflow-y:auto;" +
            "padding:14px;" +
            "background:#f8fafc;" +
            "font-size:13px;" +
            "line-height:1.9;";


        var welcome =
            document.createElement("div");

        welcome.style.cssText =
            "background:#fff;" +
            "border:1px solid #e2e8f0;" +
            "border-radius:13px;" +
            "padding:11px;" +
            "margin-bottom:10px;" +
            "color:#334155;";


        welcome.textContent =
            "سلام 👋 خوش آمدید. چطور می‌توانم به شما کمک کنم؟";


        messages.appendChild(welcome);


        var footer =
            document.createElement("div");

        footer.style.cssText =
            "display:flex;" +
            "gap:7px;" +
            "padding:10px;" +
            "border-top:1px solid #e2e8f0;" +
            "background:#fff;";


        var input =
            document.createElement("input");

        input.id =
            "moshtiryar-ai-input";

        input.type =
            "text";

        input.placeholder =
            "پیام خود را بنویسید...";


        input.style.cssText =
            "flex:1;" +
            "min-width:0;" +
            "border:1px solid #cbd5e1;" +
            "border-radius:10px;" +
            "padding:10px;" +
            "outline:none;" +
            "font-family:Tahoma,Arial,sans-serif;" +
            "font-size:12px;" +
            "direction:rtl;";


        var send =
            document.createElement("button");

        send.id =
            "moshtiryar-ai-send";

        send.type =
            "button";

        send.textContent =
            "➤";


        send.style.cssText =
            "width:45px;" +
            "border:none;" +
            "border-radius:10px;" +
            "background:#2563eb;" +
            "color:#fff;" +
            "font-size:18px;" +
            "cursor:pointer;";


        footer.appendChild(input);

        footer.appendChild(send);

        box.appendChild(header);

        box.appendChild(messages);

        box.appendChild(footer);

        document.body.appendChild(button);

        document.body.appendChild(box);


        button.onclick =
            function () {

                if (
                    box.style.display ===
                    "none"
                ) {

                    box.style.display =
                        "block";

                    input.focus();

                } else {

                    box.style.display =
                        "none";

                }

            };


        document.getElementById(
            "moshtiryar-ai-close"
        ).onclick =
            function () {

                box.style.display =
                    "none";

            };


        function addMessage(
            text,
            type
        ) {

            var item =
                document.createElement("div");


            item.style.cssText =
                "padding:10px;" +
                "border-radius:12px;" +
                "margin-bottom:8px;" +
                "max-width:90%;" +
                "white-space:pre-wrap;" +
                "word-break:break-word;" +
                (
                    type === "user"
                    ?
                    "margin-right:auto;" +
                    "background:#dbeafe;" +
                    "color:#1e3a8a;"
                    :
                    "margin-left:auto;" +
                    "background:#fff;" +
                    "border:1px solid #e2e8f0;" +
                    "color:#334155;"
                );


            item.textContent =
                text;


            messages.appendChild(item);

            messages.scrollTop =
                messages.scrollHeight;

        }


        async function sendMessage() {

            var text =
                input.value.trim();


            if (!text) {
                return;
            }


            addMessage(
                text,
                "user"
            );


            input.value = "";

            send.disabled = true;

            send.textContent = "⏳";


            var loading =
                document.createElement("div");

            loading.id =
                "moshtiryar-loading";

            loading.style.cssText =
                "padding:10px;" +
                "color:#64748b;" +
                "font-size:12px;";

            loading.textContent =
                "در حال بررسی...";

            messages.appendChild(
                loading
            );

            messages.scrollTop =
                messages.scrollHeight;


            try {

                var response =
    await fetch(
        "https://moshtriyar.vercel.app/api/website-chat",
                        {
                            method:"POST",

                            headers:{
                                "Content-Type":
                                    "application/json"
                            },

                            body:JSON.stringify({

                                userId:
                                    config.userId,

                                site:
                                    config.site,

                                message:
                                    text

                            })

                        }
                    );


                var data =
                    await response.json();


                if (
                    loading.parentNode
                ) {

                    loading.remove();

                }


                if (
                    response.ok &&
                    data.reply
                ) {

                    addMessage(
                        data.reply,
                        "agent"
                    );

                } else {

                    addMessage(
                        "فعلاً امکان پاسخ‌گویی وجود ندارد.",
                        "agent"
                    );

                }


            } catch (error) {

                console.error(
                    "Moshtriyar agent error:",
                    error
                );


                if (
                    loading.parentNode
                ) {

                    loading.remove();

                }


                addMessage(
                    "ارتباط با دستیار برقرار نشد.",
                    "agent"
                );

            }


            send.disabled = false;

            send.textContent = "➤";

            input.focus();

        }


        send.onclick =
            sendMessage;


        input.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    sendMessage();

                }

            }
        );

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            createAgent
        );

    } else {

        createAgent();

    }

})();

`;


    res.setHeader(
        "Content-Type",
        "application/javascript; charset=utf-8"
    );

    res.setHeader(
        "Cache-Control",
        "no-store"
    );

    res.status(200).send(script);

}

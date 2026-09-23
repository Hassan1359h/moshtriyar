export default async function handler(req, res) {

    if (req.method !== "GET") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || "";
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

    const script = `

(function () {

    "use strict";

    if (window.__MOSHTRIYAR_AGENT__) {
        return;
    }

    window.__MOSHTRIYAR_AGENT__ = true;

    var scriptTag = document.currentScript;

    var config = {
        userId: scriptTag?.getAttribute("data-user-id") || "",
        site: scriptTag?.getAttribute("data-site") || "",
        color: scriptTag?.getAttribute("data-color") || "#2563eb",
        title: scriptTag?.getAttribute("data-title") || "دستیار هوشمند",
        enabled: scriptTag?.getAttribute("data-enabled") !== "false"
    };

    var SUPABASE_URL = "${SUPABASE_URL}";
    var SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";

    if (!config.userId) {
        console.error("Moshtriyar: data-user-id is missing.");
        return;
    }

    if (!config.enabled) {
        return;
    }


    function loadSupabase() {

        return new Promise(function (resolve, reject) {

            if (window.supabase) {
                resolve(window.supabase);
                return;
            }

            var s = document.createElement("script");

            s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

            s.onload = function () {
                resolve(window.supabase);
            };

            s.onerror = reject;

            document.head.appendChild(s);
        });
    }


    function createAgent() {

        if (document.getElementById("moshtiryar-ai-agent")) {
            return;
        }

        var button = document.createElement("button");

        button.id = "moshtiryar-ai-agent";
        button.type = "button";
        button.innerHTML = "🤖";

        button.style.cssText =
            "position:fixed;bottom:20px;right:20px;" +
            "width:58px;height:58px;border:none;" +
            "border-radius:50%;background:" + config.color + ";" +
            "color:#fff;font-size:26px;cursor:pointer;" +
            "z-index:2147483647;" +
            "box-shadow:0 8px 25px rgba(0,0,0,.22);";


        var box = document.createElement("div");

        box.id = "moshtiryar-ai-box";

        box.style.cssText =
            "display:none;position:fixed;bottom:90px;right:20px;" +
            "width:340px;max-width:calc(100vw - 30px);" +
            "height:480px;max-height:calc(100vh - 120px);" +
            "background:#fff;border-radius:18px;overflow:hidden;" +
            "z-index:2147483646;" +
            "box-shadow:0 15px 45px rgba(15,23,42,.25);" +
            "border:1px solid #e2e8f0;" +
            "font-family:Tahoma,Arial,sans-serif;direction:rtl;";


        var header = document.createElement("div");

        header.style.cssText =
            "height:58px;" +
            "background:linear-gradient(135deg,#2563eb,#7c3aed);" +
            "color:#fff;display:flex;align-items:center;" +
            "justify-content:space-between;" +
            "padding:0 14px;font-weight:900;";

        header.innerHTML =
            '<span>🤖 دستیار هوشمند مشتری‌یار</span>' +
            '<button id="moshtiryar-ai-close" type="button" ' +
            'style="border:none;background:transparent;color:#fff;font-size:22px;cursor:pointer;">×</button>';


        var messages = document.createElement("div");

        messages.id = "moshtiryar-ai-messages";

        messages.style.cssText =
            "height:360px;overflow-y:auto;padding:14px;" +
            "background:#f8fafc;font-size:13px;line-height:1.9;" +
            "position:relative;";


        var welcome = document.createElement("div");

        welcome.style.cssText =
            "background:#fff;border:1px solid #e2e8f0;" +
            "border-radius:13px;padding:11px;margin-bottom:10px;" +
            "color:#334155;";

        welcome.textContent =
            "سلام 👋 خوش آمدید. چطور می‌توانم به شما کمک کنم؟";

        messages.appendChild(welcome);


        var footer = document.createElement("div");

        footer.style.cssText =
            "display:flex;gap:7px;padding:10px;" +
            "border-top:1px solid #e2e8f0;background:#fff;" +
            "align-items:center;";


        var input = document.createElement("input");

        input.id = "moshtiryar-ai-input";
        input.type = "text";
        input.placeholder = "پیام خود را بنویسید...";

        input.style.cssText =
            "flex:1;min-width:0;border:1px solid #cbd5e1;" +
            "border-radius:10px;padding:10px;outline:none;" +
            "font-family:Tahoma,Arial,sans-serif;" +
            "font-size:12px;direction:rtl;";


        var callBtn = document.createElement("button");

        callBtn.id = "moshtiryar-ai-call";
        callBtn.type = "button";
        callBtn.innerHTML = "📞";
        callBtn.title = "تماس صوتی با پشتیبان";

        callBtn.style.cssText =
            "width:45px;height:40px;border:none;" +
            "border-radius:10px;background:#10b981;" +
            "color:#fff;font-size:18px;cursor:pointer;";


        var send = document.createElement("button");

        send.id = "moshtiryar-ai-send";
        send.type = "button";
        send.textContent = "➤";

        send.style.cssText =
            "width:45px;height:40px;border:none;" +
            "border-radius:10px;background:#2563eb;" +
            "color:#fff;font-size:18px;cursor:pointer;";


        footer.appendChild(input);
        footer.appendChild(callBtn);
        footer.appendChild(send);

        box.appendChild(header);
        box.appendChild(messages);
        box.appendChild(footer);

        document.body.appendChild(button);
        document.body.appendChild(box);


        button.onclick = function () {
            if (box.style.display === "none") {
                box.style.display = "block";
                input.focus();
            } else {
                box.style.display = "none";
            }
        };


        document.getElementById("moshtiryar-ai-close").onclick = function () {
            box.style.display = "none";
        };


        function addMessage(text, type) {

            var item = document.createElement("div");

            item.style.cssText =
                "padding:10px;border-radius:12px;" +
                "margin-bottom:8px;max-width:90%;" +
                "white-space:pre-wrap;word-break:break-word;" +
                (
                    type === "user"
                    ?
                    "margin-right:auto;background:#dbeafe;color:#1e3a8a;"
                    :
                    "margin-left:auto;background:#fff;" +
                    "border:1px solid #e2e8f0;color:#334155;"
                );

            item.textContent = text;

            messages.appendChild(item);
            messages.scrollTop = messages.scrollHeight;
        }


        async function sendMessage() {

            var text = input.value.trim();

            if (!text) return;

            addMessage(text, "user");

            input.value = "";
            send.disabled = true;
            send.textContent = "⏳";

            var loading = document.createElement("div");

            loading.id = "moshtiryar-loading";
            loading.style.cssText = "padding:10px;color:#64748b;font-size:12px;";
            loading.textContent = "در حال بررسی...";

            messages.appendChild(loading);
            messages.scrollTop = messages.scrollHeight;

            try {

                var response = await fetch(
                    "/api/website-chat",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: config.userId,
                            site: config.site,
                            message: text
                        })
                    }
                );

                var data = await response.json();

                if (loading.parentNode) loading.remove();

                if (response.ok && data.reply) {
                    addMessage(data.reply, "agent");
                } else {
                    addMessage("فعلاً امکان پاسخ‌گویی وجود ندارد.", "agent");
                }

            } catch (error) {

                console.error("Moshtriyar agent error:", error);

                if (loading.parentNode) loading.remove();

                addMessage("ارتباط با دستیار برقرار نشد.", "agent");
            }

            send.disabled = false;
            send.textContent = "➤";
            input.focus();
        }


        send.onclick = sendMessage;

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });


        // ==========================================
        // 📞 تماس صوتی WebRTC
        // ==========================================

        var callChannel = null;
        var callPc = null;
        var currentSessionId = null;
        var callTimer = null;
        var callStartTime = null;
        var pendingIceCandidates = [];
        var hasRemoteDescription = false;
        var callOverlay = null;


        function showCallOverlay(html) {

            if (callOverlay) callOverlay.remove();

            callOverlay = document.createElement("div");

            callOverlay.style.cssText =
                "position:absolute;top:0;left:0;right:0;bottom:0;" +
                "background:linear-gradient(135deg,#10b981,#059669);" +
                "color:#fff;display:flex;flex-direction:column;" +
                "align-items:center;justify-content:center;" +
                "padding:20px;text-align:center;z-index:10;" +
                "border-radius:18px;";

            callOverlay.innerHTML = html;

            box.appendChild(callOverlay);
        }


        function hideCallOverlay() {
            if (callOverlay) {
                callOverlay.remove();
                callOverlay = null;
            }
        }


        async function startCall() {

            try {

                callBtn.disabled = true;
                callBtn.innerHTML = "⏳";

                showCallOverlay(
                    '<div style="font-size:50px;">📞</div>' +
                    '<h2 style="margin:15px 0;font-size:18px;">در حال تماس...</h2>' +
                    '<p style="font-size:13px;opacity:.9;">منتظر پاسخ پشتیبان هستیم</p>' +
                    '<button id="moshtiryar-cancel-call" ' +
                    'style="margin-top:20px;padding:10px 20px;border:none;' +
                    'border-radius:30px;background:#ef4444;color:#fff;' +
                    'font-family:inherit;font-weight:800;cursor:pointer;">' +
                    '❌ لغو' +
                    '</button>'
                );

                document.getElementById("moshtiryar-cancel-call").onclick = function () {
                    endCall(true);
                };


                var stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                var sb = await loadSupabase();

                var client = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                currentSessionId = "call_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

                callChannel = client.channel(
                    "calls-" + config.userId,
                    { config: { broadcast: { self: false } } }
                );

                callPc = new RTCPeerConnection({
                    iceServers: [
                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:stun1.l.google.com:19302" }
                    ]
                });

                stream.getTracks().forEach(function (track) {
                    callPc.addTrack(track, stream);
                });

                callPc.ontrack = function (event) {
                    var audio = new Audio();
                    audio.srcObject = event.streams[0];
                    audio.play();
                };

                callPc.onicecandidate = function (event) {
                    if (event.candidate && callChannel) {
                        callChannel.send({
                            type: "broadcast",
                            event: "webrtc-ice-visitor",
                            payload: {
                                sessionId: currentSessionId,
                                candidate: event.candidate
                            }
                        });
                    }
                };

                var offer = await callPc.createOffer();
                await callPc.setLocalDescription(offer);


                callChannel.on(
                    "broadcast",
                    { event: "webrtc-answer" },
                    async function ({ payload }) {

                        if (payload.sessionId !== currentSessionId) return;

                        await callPc.setRemoteDescription(
                            new RTCSessionDescription(payload.answer)
                        );

                        hasRemoteDescription = true;

                        for (var i = 0; i < pendingIceCandidates.length; i++) {
                            try {
                                await callPc.addIceCandidate(
                                    new RTCIceCandidate(pendingIceCandidates[i])
                                );
                            } catch (e) {}
                        }

                        pendingIceCandidates = [];

                        callStartTime = Date.now();
                        showActiveCall();
                    }
                );


                callChannel.on(
                    "broadcast",
                    { event: "webrtc-ice-operator" },
                    async function ({ payload }) {

                        if (payload.sessionId !== currentSessionId) return;

                        if (hasRemoteDescription) {
                            try {
                                await callPc.addIceCandidate(
                                    new RTCIceCandidate(payload.candidate)
                                );
                            } catch (e) {}
                        } else {
                            pendingIceCandidates.push(payload.candidate);
                        }
                    }
                );


                callChannel.on(
                    "broadcast",
                    { event: "call-rejected" },
                    function ({ payload }) {

                        if (payload.sessionId !== currentSessionId) return;

                        showCallOverlay(
                            '<div style="font-size:50px;">😔</div>' +
                            '<h2 style="margin:15px 0;font-size:18px;">پشتیبان در دسترس نیست</h2>' +
                            '<p style="font-size:13px;opacity:.9;">لطفاً از طریق چت پیام بگذارید</p>'
                        );

                        setTimeout(function () {
                            endCall();
                        }, 2500);
                    }
                );


                callChannel.on(
                    "broadcast",
                    { event: "call-ended" },
                    function ({ payload }) {

                        if (payload.sessionId !== currentSessionId) return;

                        endCall();
                    }
                );


                callChannel.subscribe(
                    async function (status) {

                        if (status === "SUBSCRIBED") {

                            await callChannel.send({
                                type: "broadcast",
                                event: "call-request",
                                payload: {
                                    sessionId: currentSessionId,
                                    visitorName: "کاربر سایت",
                                    siteUrl: config.site,
                                    offer: callPc.localDescription
                                }
                            });
                        }
                    }
                );


                callTimer = setTimeout(
                    function () {

                        if (!hasRemoteDescription) {

                            showCallOverlay(
                                '<div style="font-size:50px;">⏰</div>' +
                                '<h2 style="margin:15px 0;font-size:18px;">پاسخی دریافت نشد</h2>' +
                                '<p style="font-size:13px;opacity:.9;">پشتیبان الان پاسخ نداد</p>'
                            );

                            setTimeout(function () {
                                endCall();
                            }, 2000);
                        }
                    },
                    30000
                );


            } catch (err) {

                console.error("Call error:", err);

                showCallOverlay(
                    '<div style="font-size:50px;">⚠️</div>' +
                    '<h2 style="margin:15px 0;font-size:18px;">خطا در تماس</h2>' +
                    '<p style="font-size:13px;opacity:.9;">' +
                    (err.message || "لطفاً دسترسی میکروفون را بررسی کنید") +
                    '</p>'
                );

                setTimeout(function () {
                    endCall();
                }, 2500);

            } finally {
                callBtn.disabled = false;
                callBtn.innerHTML = "📞";
            }
        }


        function showActiveCall() {

            showCallOverlay(
                '<div style="font-size:50px;">🎙️</div>' +
                '<h2 style="margin:15px 0;font-size:18px;">تماس برقرار است</h2>' +
                '<div id="moshtiryar-call-timer" style="font-size:32px;font-weight:900;font-family:monospace;margin:10px 0;">00:00</div>' +
                '<button id="moshtiryar-end-call" ' +
                'style="margin-top:15px;width:60px;height:60px;border:none;' +
                'border-radius:50%;background:#ef4444;color:#fff;' +
                'font-size:24px;cursor:pointer;">📵</button>'
            );

            document.getElementById("moshtiryar-end-call").onclick = function () {
                endCall();
            };

            if (callTimer) clearTimeout(callTimer);

            callTimer = setInterval(
                function () {

                    var elapsed = Math.floor((Date.now() - callStartTime) / 1000);
                    var mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
                    var secs = String(elapsed % 60).padStart(2, "0");

                    var timerEl = document.getElementById("moshtiryar-call-timer");
                    if (timerEl) timerEl.textContent = mins + ":" + secs;
                },
                1000
            );
        }


        function endCall(silent) {

            if (callTimer) {
                clearTimeout(callTimer);
                clearInterval(callTimer);
                callTimer = null;
            }

            if (callChannel && currentSessionId) {

                try {
                    callChannel.send({
                        type: "broadcast",
                        event: "call-ended",
                        payload: { sessionId: currentSessionId }
                    });
                } catch (e) {}

                try {
                    callChannel.unsubscribe();
                } catch (e) {}

                callChannel = null;
            }

            if (callPc) {

                try {
                    callPc.getSenders().forEach(function (sender) {
                        if (sender.track) sender.track.stop();
                    });
                    callPc.close();
                } catch (e) {}

                callPc = null;
            }

            currentSessionId = null;
            callStartTime = null;
            pendingIceCandidates = [];
            hasRemoteDescription = false;

            hideCallOverlay();

            if (!silent) {
                addMessage("📵 تماس پایان یافت.", "agent");
            }
        }


        callBtn.onclick = function () {
            if (currentSessionId) return;
            startCall();
        };

    }


    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createAgent);
    } else {
        createAgent();
    }

})();

`;


    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    res.status(200).send(script);

}

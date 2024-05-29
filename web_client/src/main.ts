import van from "vanjs-core";
import {
  messages,
  myMessage,
  remoteSDP,
  localSDP,
  connectionState,
} from "./states";
import "./logic";
import { sendMessage, setRemoteSdp, startPeerConnection } from "./logic";

const t = van.tags;

const signaling = t.div(
  t.h2("signaling"),
  // prettier-ignore
  t.p("state", t.input({ type: "text", id: "state", value: connectionState, readOnly: "readOnly" }))
);

const getLocalSdpPart = t.div(
  t.h3("自端末のSDP (Read-only)"),
  t.p("(手順1) ブラウザ1で SDP (offer) を生成する。"),
  t.button({ type: "button", onclick: startPeerConnection }, "Offerを生成する"),
  t.p("(手順2) ブラウザ1からこのSDP (offer) をコピーする。"),
  t.p("(手順4) ブラウザ2で生成した SDP (answer) をコピーする。"),
  // prettier-ignore
  t.textarea({id: "localSDP", cols:80, rows:5, readOnly: "readOnly", value: localSDP})
);

const setRemoteSdpPart = t.div(
  t.h3("端末のSDP (手動でセットする)"),
  t.p(
    "(手順3) ブラウザ2で，コピーしたブラウザ1のSDP (offer) を貼り付け Set を押すと，自端末のSDPに返答用 SDP (answer) が生成される。"
  ),
  t.p(
    "(手順5) ブラウザ1で，コピーしたブラウザ2のSDP (answer) を貼り付け Set を押す。"
  ),
  // prettier-ignore
  t.textarea({ id: "remoteSDP", cols: 80, rows: 5, value: remoteSDP, oninput: (e: InputEvent) => {
    remoteSDP.val = (e.target as HTMLTextAreaElement).value;
  }}),
  t.button(
    {
      type: "button",
      onclick: setRemoteSdp,
    },
    "set remote SDP"
  )
);

const communication = t.div(
  t.h2("Data Channelでの通信"),
  t.form(
    {
      onsubmit: (e: SubmitEvent) => {
        e.preventDefault();
      },
    },
    t.input({
      type: "text",
      id: "myMessage",
      size: 30,
      value: myMessage,
      oninput: (e: InputEvent) => {
        myMessage.val = (e.target as HTMLInputElement).value;
      },
    }),
    t.input({ type: "submit", value: "Send", onclick: sendMessage })
  ),
  t.textarea({
    id: "messages",
    cols: 80,
    rows: 10,
    readOnly: "readOnly",
    value: messages,
  })
);

function App() {
  return t.div(
    t.h1("WebRTC Data Channel demo"),
    signaling,
    getLocalSdpPart,
    setRemoteSdpPart,
    communication
  );
}

van.add(document.getElementById("app")!, App);

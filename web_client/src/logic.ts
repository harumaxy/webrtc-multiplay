import {
  localSDP,
  connectionState,
  messages,
  remoteSDP,
  myMessage,
} from "./states";

const peerConnectionConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
};

const dataChannelOptions = {
  ordered: false,
};

let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;

window.onload = () => {
  connectionState.val = "closed";
};

export function createPeerConnection() {
  const peer = new RTCPeerConnection(peerConnectionConfig);

  peer.onicecandidate = (e) => {
    if (e.candidate) {
      console.log(e.candidate);
      connectionState.val = "Collecting ICE candidates...";
    } else {
      localSDP.val = peer.localDescription?.sdp ?? "";
    }
  };
  peer.onconnectionstatechange = (_e) => {
    connectionState.val = peer.connectionState;
  };
  peer.ondatachannel = (e) => {
    console.log("Data channel created: ", e);
    setupDataChannel(e.channel);
    dataChannel = e.channel;
  };
  return peer;
}

export function setupDataChannel(ch: RTCDataChannel) {
  ch.onerror = (err) => {
    console.log("Data channel error: ", err);
  };
  ch.onopen = (e) => {
    console.log("Data channel opened.", e);
  };
  ch.onmessage = (e) => {
    console.log("Data channel message: ", e.data);
    messages.val = `other> ${e.data}` + "\n" + messages.val;
  };
  ch.onclose = () => {
    console.log("Data channel closed.");
  };
}

export async function setRemoteSdp() {
  if (peerConnection) {
    const answer = new RTCSessionDescription({
      type: "answer",
      sdp: remoteSDP.val,
    });
    try {
      await peerConnection.setRemoteDescription(answer);
      console.log("setRemoteDescription success.");
    } catch (e) {
      console.error("setRemoteDescription failed: ", e);
    }
  } else {
    const offer = new RTCSessionDescription({
      type: "offer",
      sdp: remoteSDP.val,
    });
    peerConnection = createPeerConnection();
    try {
      await peerConnection.setRemoteDescription(offer);
      console.log("setRemoteDescription() succeeded.");
    } catch (e) {
      console.error("setRemoteDescription() failed: ", e);
    }
    try {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("setLocalDescription() succeeded.");
      connectionState.val = "Answer created.";
    } catch (e) {
      console.error("createAnswer failed: ", e);
    }
  }
}

export function sendMessage() {
  if (peerConnection?.connectionState !== "connected" || !dataChannel) {
    alert("Data channel is not ready.");
    return false;
  }

  messages.val = "me> " + myMessage.val + "\n" + messages.val;
  dataChannel.send(myMessage.val);
  myMessage.val = ""; // clear
  return true;
}

export async function startPeerConnection() {
  peerConnection = createPeerConnection();
  dataChannel = peerConnection.createDataChannel(
    "test-data-channel",
    dataChannelOptions
  );
  setupDataChannel(dataChannel);

  // offer
  try {
    const sdp = await peerConnection.createOffer();
    console.log("createOffer success.");
    connectionState.val = "Offer created.";
    return peerConnection.setLocalDescription(sdp);
  } catch (error) {
    console.error("createOffer failed: ", error);
  }
}

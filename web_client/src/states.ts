import van from "vanjs-core";

export const connectionState = van.state("disconnected");
export const localSDP = van.state("");
export const remoteSDP = van.state("");
export const myMessage = van.state("");
export const messages = van.state("");

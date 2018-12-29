import { Injectable } from "@angular/core";
import * as io from "socket.io-client";

class Peer {
  constructor(url: string, sockets: Sockets) {
    this.url = url;
    this.sockets = sockets;
  }

  setNodeId(nodeId: string) {
    this.nodeId = nodeId;
  }

  nodeId: string;
  socket: any;
  url: string;
  retries: number = 0;
  connected: number;
  sockets: Sockets;

  getSocket(): any {
    return this.socket;
  }

  connect() {
    if (this.socket == undefined) {
      console.log("new socketio init for peer: " + this.url);
      this.socket = io(this.url, {
        transports: ["websocket"],
        reconnectionAttempts: 30
      });

      this.socket.on("connect", () => {
        console.log("connection established to: " + this.url);

        this.connected = 1;
        this.retries = 0;
        this.sockets.activeConnections++;

        this.socket.emit("getPeers", { count: 5 }, (answer: any) => {
          //   console.log("peers: " + JSON.stringify(answer));
          console.log("peers got from node: " + answer.length);

          for (let p of answer) {
            // console.log("has?: " + p.nodeId);
            if (this.sockets.peers.has(p.nodeId)) {
              console.log("already in peerlist");
              continue;
            }

            this.sockets.addPeer(p.nodeId, p.url);

            // let newPeer = new Peer(p.url, this.sockets);
            // newPeer.setNodeId(p.nodeId);
            // this.sockets.peers.set(p.nodeId, newPeer);
          }

          //   console.log("peers: " + typeof { asd: 5 });
        });
      });

      this.socket.on("disconnect", () => {
        console.log("disconnected: " + this.url);
        this.connected = 0;
        this.sockets.activeConnections--;
      });

      this.socket.on("reconnect_attempt", () => {
        //console.log("reconnecting...");
        this.retries++;
      });
    }
  }
}

import * as bitcoin from "bitcoinjs-lib";
import * as bs58 from "bs58";
declare const Buffer;

@Injectable()
export class Sockets {
  peers: Map<String, Peer> = new Map<String, Peer>();
  activeConnections = 0;
  //   peerCache: Array<Peer> = new Array();

  constructor() {
    setInterval(() => {
      this.refresh();
    }, 1000);

    function rng() {
      return Buffer.from("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
    }
    const keyPair = bitcoin.ECPair.makeRandom({ rng: rng });
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
    console.log("pubkey: " + address);
    console.log("pubkey2: " + bs58.encode(keyPair.publicKey));
    console.log("priv: " + bs58.encode(keyPair.privateKey));

    var decoded = bs58.decode(bs58.encode(keyPair.privateKey));

    console.log(decoded);

    console.log(bs58.encode(decoded));
  }

  addPeer(nodeId: string, url: string) {
    let newPeer = new Peer(url, this);
    newPeer.setNodeId(nodeId);
    this.peers.set(nodeId, newPeer);
  }

  refresh() {
    // console.log("sockets refresh started...");

    if (this.peers.size == 0) {
      console.log("no peers, do bootstrap");

      //   let newPeer = new Peer("http://localhost:59658", this);
      //   newPeer.setNodeId("121D61760D7D526C0AEEEDEADF026FCBF2223604");
      //   this.peers.set("121D61760D7D526C0AEEEDEADF026FCBF2223604", newPeer);

      this.addPeer(
        "073F1BFDEAF8F5295025514A6AB18C77C6652776",
        "http://redPanda.im:59658"
      );

      //   this.addPeer(
      //     "121D61760D7D526C0AEEEDEADF026FCBF2223604",
      //     "http://localhost:59658"
      //   );

      //   this.peers.push(new Peer("http://localhost:10444"));
      //   this.peers.push(new Peer("http://localhost:10445"));
      //   this.peers.push(new Peer("http://localhost:10446"));
    }

    // for (let entry of Array.from()) {
    //     let key = entry[0];
    //     let peer = entry[1];
    // }

    // for (let key of Array.from(this.peers.values())) {
    //   console.log(key);
    // }

    for (let peer of Array.from(this.peers.values())) {
      peer.connect();
      //   peer.getSocket().emit("set-nickname", {
      //     userName: "nick",
      //     message: "teeest"
      //   });
      //   peer.getSocket().emit("getPeers", {
      //     count: 10
      //   });
    }
  }

  getAConnectedSocket() {
    for (let peer of Array.from(this.peers.values())) {
      if (peer.connected == 1) {
        return peer.socket;
      }
    }
  }

  getActiveConnections() {
    let cnt = 0;
    for (let peer of Array.from(this.peers.values())) {
      if (peer.connected == 1) {
        cnt++;
      }
    }
    return cnt;
  }

  listNodes() {
    let a = "";
    for (let peer of Array.from(this.peers.values())) {
      a +=
        (!peer.connected ? '<font color="red">' : '<font color="green">') +
        peer.nodeId.substring(0, 10) +
        "</font>" +
        "      " +
        +peer.retries +
        "      " +
        peer.url +
        "<br>\n";
    }
    return a;
  }

  greet() {
    return "Hello, ";
  }
}

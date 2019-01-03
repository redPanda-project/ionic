import { Storage } from "@ionic/storage";
import { Injectable } from "@angular/core";
import * as io from "socket.io-client";

import * as bitcoin from "bitcoinjs-lib";
import * as bs58 from "bs58";
import { Global } from "./Global";
declare const Buffer;

class Peer {
  constructor(url: string) {
    this.url = url;
  }

  setNodeId(nodeId: string) {
    this.nodeId = nodeId;
  }

  nodeId: string;
  socket: any;
  url: string;
  retries: number = 0;
  connected: number;
  receivedBytes = 0;

  getSocket(): any {
    return this.socket;
  }

  connect(sockets: Sockets) {
    if (this.socket == undefined) {
      // console.log("new socketio init for peer: " + this.url);
      this.socket = io(this.url, {
        transports: ["websocket"],
        reconnectionAttempts: 30
      });

      this.socket.on("connect", () => {
        // console.log(this.socket.io.engine.transport.ws);
        // let self = this.socket.io.engine.transport.ws;
        // this.socket.io.engine.transport.ws.onmessage = function(event) {
        //   console.log("WebSocket message received:", event);
        //   self.onData(event.data);
        // };

        // setInterval(() => {
        //   console.log(this.socket.io.engine.transport.ws.bufferedAmount);
        // }, 1000);

        this.socket.io.engine.transport.on("packet", function(packet) {
          // console.log(typeof packet.data);

          if (typeof packet.data === "string") {
            // console.log(
            //   "stringlen: " + new TextEncoder().encode(packet.data).length
            // );
            Global.bytesDownloaded += packet.data.length;
          } else if (packet.data instanceof ArrayBuffer) {
            // console.log("arrayLen: " + packet.data.byteLength);
            Global.bytesDownloaded += packet.data.byteLength;
          }

          Global.downloadedText =
            "DL: " + (Global.bytesDownloaded / 1024).toFixed(1) + " kb.";

          // Global.bytesDownloaded += packet.byteLength;
        });

        console.log("connection established to: " + this.url);

        this.connected = 1;
        this.retries = 0;
        sockets.activeConnections++;

        this.socket.emit("getPeers", { count: 5 }, (answer: any) => {
          //   console.log("peers: " + JSON.stringify(answer));
          // console.log("peers got from node: " + answer.length);

          for (let p of answer) {
            // console.log("has?: " + p.nodeId);
            if (sockets.peers.has(p.nodeId)) {
              // console.log("already in peerlist");
              continue;
            }

            sockets.addPeer(p.nodeId, p.url);

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
        sockets.activeConnections--;
      });

      this.socket.on("reconnect_attempt", () => {
        //console.log("reconnecting...");
        this.retries++;
      });
    }
  }
}

@Injectable()
export class Sockets {
  peers: Map<String, Peer> = new Map<String, Peer>();
  activeConnections = 0;
  storage: Storage;
  //   peerCache: Array<Peer> = new Array();

  constructor(storage: Storage) {
    this.storage = storage;

    storage.get("peers").then(val => {
      if (val != undefined) {
        // this.peers = JSON.parse(val);
      }
      //start refreshing after we loaded the peers
      setInterval(() => {
        this.refresh();
      }, 1000);
    });

    function rng() {
      return Buffer.from("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
    }
    const keyPair = bitcoin.ECPair.makeRandom({ rng: rng });
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
    // console.log("pubkey: " + address);
    // console.log("pubkey2: " + bs58.encode(keyPair.publicKey));
    // console.log("priv: " + bs58.encode(keyPair.privateKey));

    var decoded = bs58.decode(bs58.encode(keyPair.privateKey));

    // console.log(decoded);

    // console.log(bs58.encode(decoded));
  }

  addPeer(nodeId: string, url: string) {
    let newPeer = new Peer(url);
    newPeer.setNodeId(nodeId);
    this.peers.set(nodeId, newPeer);
    this.storage.set("peers", JSON.stringify(this.peers));
  }

  refresh() {
    // console.log("sockets refresh started...");

    if (this.peers.size == 0) {
      // console.log("no peers, do bootstrap");

      //   let newPeer = new Peer("http://localhost:59658", this);
      //   newPeer.setNodeId("121D61760D7D526C0AEEEDEADF026FCBF2223604");
      //   this.peers.set("121D61760D7D526C0AEEEDEADF026FCBF2223604", newPeer);

      this.addPeer("39YVqMP9rCwWDYken7vQsacXcydf", "http://localhost:59658");
      this.addPeer("2pyTmK7nutBbbLQtLYUZVEmFGkMz", "http://redPanda.im:59658");

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

    // for (let p of Array.from(this.peers.values())) {
    //   console.log(p.getSocket());
    // }

    // console.log(JSON.stringify(this.peers.values()));

    for (let peer of Array.from(this.peers.values())) {
      peer.connect(this);
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
    // console.log("asdf" + JSON.stringify(Array.from(this.peers.values())));

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

  // strMapToObj(strMap) {
  //   let obj = Object.create(null);
  //   console.log("jup");
  //   for (let peer of Array.from(this.peers.values())) {
  //     // We don’t escape the key '__proto__'
  //     // which can cause problems on older engines
  //     console.log(peer);
  //     console.log("asdfdwewe");
  //     obj[peer.nodeId] = peer;
  //   }
  //   console.log("jup2");
  //   return obj;
  // }
  // objToStrMap(obj) {
  //   let strMap = new Map();
  //   for (let k of Object.keys(obj)) {
  //     strMap.set(k, obj[k]);
  //   }
  //   return strMap;
  // }
  // strMapToJson(strMap) {
  //   return JSON.stringify(this.strMapToObj(strMap));
  // }
  // jsonToStrMap(jsonStr) {
  //   return this.objToStrMap(JSON.parse(jsonStr));
  // }
}

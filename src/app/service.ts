import { Storage } from "@ionic/storage";
import { Injectable } from "@angular/core";

import * as bitcoin from "bitcoinjs-lib";
import * as bs58 from "bs58";
import { Global } from "./Global";
import * as ByteBuffer from "bytebuffer";
import { Commands } from "./commands";
declare const Buffer;

class Peer {
  constructor(url: string) {
    this.url = url;
  }

  setNodeId(nodeId: string) {
    this.nodeId = nodeId;
  }

  nodeId: string;
  ws: any;
  url: string;
  retries: number = 0;
  connected: number = 0;
  receivedBytes = 0;

  getWebSocket(): any {
    return this.ws;
  }

  connect() {
    //localStorage.debug = "*";
    localStorage.debug = "";

    if (this.connected == 0) {
      this.retries++;

      if (this.retries > 5) {
        Service.removePeer(this);
      }

      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        console.log("wrong url for socket: " + this.url);
        Service.removePeer(this);
        return;
      }

      let ws = this.ws;

      let peer = this;

      ws.onopen = function(event) {
        peer.connected = 1;
        peer.retries = 0;

        console.log("connecteradasdasd!");
        // ws.send("Here's some text that the server is urgently awaiting!");
        //  let bb = new ByteBuffer().writeByte(2).flip().toArrayBuffer();
        let bb = new ByteBuffer(1 + 4).writeByte(Commands.PEERLIST).writeInt(4)
          .buffer;
        // let bb = new ByteBuffer().writeIString("teewst").flip().toArrayBuffer();
        ws.send(bb);
        // ws.send(bb);
      };

      ws.onmessage = function(e) {
        var fileReader = new FileReader();
        fileReader.onload = event => {
          (async => {
            let asd: any = event.target;
            let arrayBuffer = asd.result;
            let b = ByteBuffer.wrap(arrayBuffer);

            console.log(arrayBuffer);

            let cmd = b.readByte();

            console.log("got command from server: " + cmd);

            switch (cmd) {
              case Commands.PEERLIST: {
                console.log("got peer cmd!");

                while (b.remaining() > 0) {
                  console.log("remaining: " + b.remaining());
                  let nodeId = b.readIString();
                  let url = b.readIString();
                  console.log(nodeId + " " + url);
                  Service.addPeer(nodeId, url);
                }

                break;
              }
            }
          })();
        };
        fileReader.readAsArrayBuffer(e.data);

        console.log("onmessage");
        console.log(e.data);
      };

      ws.onclose = function(e) {
        peer.connected = 0;
        console.log(
          "Socket is closed. Reconnect will be attempted in 1 second.",
          e.reason
        );
      };

      ws.onerror = function(err) {
        peer.connected = 0;
        console.error(
          "Socket encountered error: ",
          err.message,
          "Closing socket"
        );
        ws.close();
      };
    }
  }
}

@Injectable()
export class Service {
  private static peers: Map<String, Peer> = new Map<String, Peer>();
  public static activeConnections = 0;
  private static storage: Storage;
  //   peerCache: Array<Peer> = new Array();

  public static getPeers(): Map<String, Peer> {
    return Service.peers;
  }

  public static getStorage(): Storage {
    return Service.storage;
  }

  public static init(storage: Storage) {
    Service.storage = storage;

    storage.get("peers").then(val => {
      // console.log(JSON.parse(val));
      if (val != undefined) {
        for (let p of JSON.parse(val)) {
          let newPeer = new Peer(p.url);
          newPeer.setNodeId(p.nodeId);
          Service.peers.set(p.nodeId, newPeer);
        }
      }
      //start refreshing after we loaded the peers
      this.refresh();
      setInterval(() => {
        this.refresh();
      }, 5000);
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

  public static addPeer(nodeId: string, url: string) {
    if (Service.getPeers().has(nodeId)) {
      console.log("already in list!!!");
      return;
    }

    let newPeer = new Peer(url);
    newPeer.setNodeId(nodeId);
    Service.peers.set(nodeId, newPeer);

    this.savePeers();
  }

  public static refresh() {
    // console.log("sockets refresh started...");

    if (this.peers.size == 0) {
      // console.log("no peers, do bootstrap");

      //   let newPeer = new Peer("http://localhost:59658", this);
      //   newPeer.setNodeId("121D61760D7D526C0AEEEDEADF026FCBF2223604");
      //   this.peers.set("121D61760D7D526C0AEEEDEADF026FCBF2223604", newPeer);

      this.addPeer("sLFKZ64f7hQYzys78UmLXqnm7FZ", "ws://localhost:59658");
      // this.addPeer("39YVqMP9rCwWDYken7vQsacXcydf", "http://localhost:59658");
      //   this.addPeer("3kLHUQBUQWFYsr83KZ8GkYJb4fc2", "http://redPanda.im:59658");

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

  public static getAConnectedSocket() {
    for (let peer of Array.from(this.peers.values())) {
      if (peer.connected == 1) {
        return peer.ws;
      }
    }
  }

  public static getActiveConnections() {
    let cnt = 0;
    for (let peer of Array.from(this.peers.values())) {
      if (peer.connected == 1) {
        cnt++;
      }
    }
    return cnt;
  }

  public static listNodes() {
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

  public static greet() {
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

  public static savePeers() {
    let savePeers = [];
    for (let p of Array.from(this.peers.values())) {
      let np = new Peer(p.url);
      np.setNodeId(p.nodeId);
      savePeers.push(np);
    }

    this.storage.set("peers", JSON.stringify(savePeers));
  }

  public static removePeer(peer: Peer) {
    this.peers.delete(peer.nodeId);
    this.savePeers();
  }
}

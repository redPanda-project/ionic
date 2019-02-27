import { File } from "@ionic-native/file";
import { Storage } from "@ionic/storage";
import { Injectable } from "@angular/core";

import * as bitcoin from "bitcoinjs-lib";
import * as bs58 from "bs58";
import { Global } from "./Global";
import * as ByteBuffer from "bytebuffer";
import { Commands } from "./commands";
import { sha256 } from "js-sha256";
import { Platform } from "ionic-angular";

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
  authenticated: boolean = false;

  getWebSocket(): any {
    return this.ws;
  }

  connect(service: Service) {
    //localStorage.debug = "*";
    localStorage.debug = "";

    if (this.connected == 0) {
      this.retries++;

      if (this.retries > 5) {
        service.removePeer(this);
      }

      try {
        this.authenticated = false;
        if (this.ws != undefined) {
          this.ws.close();
        }
        this.ws = new WebSocket(this.url);
      } catch (e) {
        // console.log("wrong url for socket: " + this.url);
        service.removePeer(this);
        return;
      }

      let ws = this.ws;

      let peer = this;

      ws.onopen = function(event) {
        // console.log("connecteradasdasd!");
        // ws.send("Here's some text that the server is urgently awaiting!");
        //  let bb = new ByteBuffer().writeByte(2).flip().toArrayBuffer();

        //initial commands for every new connection
        let bb = new ByteBuffer(1 + 4).writeByte(Commands.PEERLIST).writeInt(1)
          .buffer;
        ws.send(bb);

        ws.send(
          new ByteBuffer(1).writeByte(Commands.getAndroidTimeStamp).buffer
        );

        // let bb = new ByteBuffer().writeIString("teewst").flip().toArrayBuffer();
        // ws.send(bb);
      };

      ws.onmessage = function(e) {
        var fileReader = new FileReader();
        fileReader.onload = event => {
          (async () => {
            let asd: any = event.target;
            let arrayBuffer = asd.result;
            let b = ByteBuffer.wrap(arrayBuffer);

            // console.log(arrayBuffer);

            if (b.remaining() == 0) {
              console.log("no remaining bytes??");
              return;
            }

            Global.bytesDownloaded += b.remaining();
            Global.downloadedText =
              "DL: " + (Global.bytesDownloaded / 1024).toFixed(1) + " kb.";

            let cmd = b.readByte();
            if (cmd < 0) {
              cmd += 256;
            }

            // console.log("got command from server: " + cmd);

            // if (cmd == Commands.PEERLIST) {

            // } else if (cmd == Commands.getAndroidTimeStamp) {

            // }

            if (!this.authenticated) {
              //first message have to be an authentication message including the id from the peer

              if (cmd != Commands.authenticate) {
                console.log("peer did not authenticate!");
                ws.close();
                return;
              }

              peer.connected = 1;
              peer.retries = 0;
              service.activeConnections++;

              //handle authenticate!
              let nodeid = bs58.encode(
                new Buffer(b.readBytes(Commands.ID_LENGTH).toArrayBuffer())
              );

              // console.log(peer.nodeId);
              // console.log(nodeid);

              if (peer.nodeId != nodeid) {
                console.log("NodeId does not match, remove peer.");
                service.removePeer(peer);
                let newPeer = new Peer(peer.url);
                service.addPeer(nodeid, peer.url);
                ws.close();
              } else {
                // console.log("NodeId match!");
              }

              this.authenticated = true;
              return;
            }

            switch (cmd) {
              case Commands.PEERLIST: {
                // console.log("got peer cmd!");

                while (b.remaining() > 0) {
                  // console.log("remaining: " + b.remaining());
                  let nodeId: any = b.readIString();
                  let url: any = b.readIString();
                  // console.log(nodeId + " " + url);
                  service.addPeer(nodeId, url);
                }

                break;
              }

              case Commands.getAndroidTimeStamp: {
                // console.log("got getAndroidTimeStamp cmd!");
                let timestamp = b.readLong().toNumber();
                // console.log("android timestamp: " + timestamp);
                if (Global.updateTimestamp == 0) {
                  Global.updateTimestamp = await service
                    .getStorage()
                    .get("updateTime");
                }
                // console.log(Global.updateTimestamp);
                // console.log(answer.timestamp);
                if (Global.updateTimestamp < timestamp) {
                  Global.updateAvailable = true;
                }
                break;
              }

              case Commands.getAndroidApk: {
                console.log("got getAndroidApk cmd!");

                let timestamp = b.readLong();

                let toRead = b.readInt32();
                let signature = b.readBytes(toRead);

                toRead = b.readInt32();
                let data = b.readBytes(toRead);

                console.log(b.remaining());

                console.log("updatebytes: " + toRead);

                let updateSize = data.remaining();

                console.log("update bytes: " + updateSize);

                Global.downloadedText =
                  "Update size: " +
                  (updateSize / 1024 / 1024).toFixed(1) +
                  " MB";

                //we have to check the signature of the apk!

                // bitcoin.ECPair
                let updateKey = bitcoin.ECPair.fromPublicKey(
                  bs58.decode("evkUMf9Zr6LgCeJgxH2DYGT37GY8VaCHP3vhh3wRHGYS")
                );

                console.log("timestamp: " + timestamp);

                let hashing = sha256.create();

                let hashBuffer = new ByteBuffer();
                hashBuffer.writeInt64(timestamp);
                hashBuffer.append(data.toArrayBuffer(true));

                hashBuffer.flip();

                // hashing.update(answer.timestamp);
                hashing.update(hashBuffer.toArrayBuffer());

                console.log(signature);
                console.log(signature.toArrayBuffer());
                console.log(Buffer.from(signature.toArrayBuffer()));

                let asdf = ByteBuffer.wrap(hashing.arrayBuffer());

                console.log(asdf.toHex());

                let verified = updateKey.verify(
                  Buffer.from(hashing.arrayBuffer()),
                  Buffer.from(signature.toArrayBuffer(true))
                );

                console.log(signature.toHex());

                Global.downloadedText =
                  "Update size: " +
                  (updateSize / 1024 / 1024).toFixed(1) +
                  " MB, verified: " +
                  verified;

                service.getStorage().set("updateTime", timestamp.toNumber());

                console.log("verified: " + verified);

                //we can now store the update!
                if (verified && Global.isCordova) {
                  (async () => {
                    Global.downloadedText += " installing...";
                    try {
                      let exists = await service.file.checkFile(
                        service.file.dataDirectory,
                        "redPanda.apk"
                      );

                      if (exists) {
                        await service.file.removeFile(
                          service.file.dataDirectory,
                          "redPanda.apk"
                        );
                      }
                    } catch (e) {
                      //file does not exists?
                    }

                    await service.file.writeFile(
                      service.file.dataDirectory,
                      "redPanda.apk",
                      data.toArrayBuffer()
                    );

                    // let files = await this.file.listDir(this.file.dataDirectory, "");
                    // this.infoText = this.file.dataDirectory + "redPanda.apk";

                    service.cordova.plugins.fileOpener2.open(
                      service.file.dataDirectory + "redPanda.apk",
                      "application/vnd.android.package-archive"
                    );

                    service.getStorage().set("updateTime", timestamp.toNumber());

                    //end of async!
                  })();
                }

                break;
              }
            }
          })();
        };
        fileReader.readAsArrayBuffer(e.data);

        // console.log("onmessage");
        // console.log(e.data);
      };

      ws.onclose = function(e) {
        if (peer.connected == 1) {
          service.activeConnections--;
        }
        peer.connected = 0;
        // console.log("Socket is closed.", e.reason);
      };

      ws.onerror = function(err) {
        // Service.activeConnections--;
        // peer.connected = 0;
        // console.error(
        //   "Socket encountered error: ",
        //   err.message,
        //   "Closing socket"
        // );
        ws.close();
      };
    }
  }
}

declare const cordova;
@Injectable()
export class Service {
  private peers: Map<String, Peer> = new Map<String, Peer>();
  public activeConnections = 0;
  // private storage: Storage;
  public cordova: any;
  // public platform: any;
  // public file: File;
  public channels = [];

  constructor(
    private storage: Storage,
    public file: File,
    private platform: Platform
  ) {
    if (this.platform.is("cordova")) {
      this.cordova = cordova;
    }
  }

  //   peerCache: Array<Peer> = new Array();

  public getPeers(): Map<String, Peer> {
    return this.peers;
  }

  public getStorage(): Storage {
    return this.storage;
  }

  public init() {
    this.storage.get("channels").then(val => {
      if (val == undefined) {
        return;
      }

      this.channels = JSON.parse(val);
    });

    this.storage.get("peers").then(val => {
      // console.log(JSON.parse(val));
      if (val != undefined) {
        for (let p of JSON.parse(val)) {
          let newPeer = new Peer(p.url);
          newPeer.setNodeId(p.nodeId);
          this.peers.set(p.nodeId, newPeer);
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

  // public init2(platform: any, cordova: any) {
  //   Service.cordova = cordova;
  //   Service.platform = platform;
  // }

  public addPeer(nodeId: string, url: string) {
    if (this.getPeers().has(nodeId)) {
      // console.log("already in list!!!");
      return;
    }

    let newPeer = new Peer(url);
    newPeer.setNodeId(nodeId);
    this.peers.set(nodeId, newPeer);

    this.savePeers();
  }

  public refresh() {
    // console.log("sockets refresh started...");

    if (this.peers.size == 0) {
      // console.log("no peers, do bootstrap");

      //   let newPeer = new Peer("http://localhost:59658", this);
      //   newPeer.setNodeId("121D61760D7D526C0AEEEDEADF026FCBF2223604");
      //   this.peers.set("121D61760D7D526C0AEEEDEADF026FCBF2223604", newPeer);

      // this.addPeer("sLFKZ64f7hQYzys78UmLXqnm7FZ", "ws://localhost:59658");
      // this.addPeer("39YVqMP9rCwWDYken7vQsacXcydf", "http://localhost:59658");
      this.addPeer("2KctLErCBPQSKWe4dSwWjt8boG8V", "ws://redPanda.im:59659");
      this.addPeer("3kLHUQBUQWFYsr83KZ8GkYJb4fc2", "ws://redPanda.im:59658");

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

  public getAConnectedSocket(): WebSocket {
    for (let peer of Array.from(this.peers.values())) {
      if (peer.connected == 1) {
        return peer.ws;
      }
    }
  }

  public getActiveConnections() {
    let cnt = 0;
    for (let peer of Array.from(this.peers.values())) {
      if (peer.connected == 1) {
        cnt++;
      }
    }
    return cnt;
  }

  public listNodes() {
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

  public greet() {
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

  public savePeers() {
    let savePeers = [];
    for (let p of Array.from(this.peers.values())) {
      let np = new Peer(p.url);
      np.setNodeId(p.nodeId);
      savePeers.push(np);
    }

    this.storage.set("peers", JSON.stringify(savePeers));
  }

  public removePeer(peer: Peer) {
    this.peers.delete(peer.nodeId);
    this.savePeers();
  }

  public downloadUpdate() {
    let ws = this.getAConnectedSocket();
    ws.send(new ByteBuffer(1).writeByte(Commands.getAndroidApk).buffer);
  }

  public createNewChannel(name: String) {
    const keyPair = bitcoin.ECPair.makeRandom();
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey
    });
    console.log("pubkey: " + address);
    console.log("pubkey2: " + bs58.encode(keyPair.publicKey));
    // console.log("priv: " + bs58.encode(keyPair.privateKey));

    var decoded = bs58.decode(bs58.encode(keyPair.privateKey));

    console.log(decoded);

    console.log(bs58.encode(decoded));

    this.channels.push({
      name: name,
      privateKey: bs58.encode(keyPair.privateKey),
      publicKey: bs58.encode(keyPair.publicKey)
    });
    this.storage.set("channels", JSON.stringify(this.channels));
  }
}
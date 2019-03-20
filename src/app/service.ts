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
import { KadContent } from "../redPanda/KadContent";
import { KademliaId } from "../redPanda/KademliaId";
import { c } from "@angular/core/src/render3";
import { Utils } from "./utils";

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
  score = 0;

  getWebSocket(): any {
    return this.ws;
  }

  connect(service: Service) {
    //localStorage.debug = "*";
    localStorage.debug = "";

    if (this.connected == 0) {
      this.retries++;
      this.score -= 5;

      if (this.retries > 100) {
        service.removePeer(this);
      }

      if (this.retries % 10 == 0) {
        service.savePeers();
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

              //debug instance
              if (peer.url.startsWith("ws://84.134")) {
                peer.score += 1000;
              }

              peer.score += 10;
              if (peer.score > 100) {
                peer.score = 100;
              }

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

              case Commands.dhtSearch: {
                console.log("got dhtSearch answer cmd!");

                let ackId = b.readInt32();
                let keyBytes = b.readBytes(Commands.ID_LENGTH).toArrayBuffer();
                let timestamp = b.readLong().toNumber();
                let publicKeyBytes = b
                  .readBytes(Commands.PUBKEY_LEN)
                  .toArrayBuffer();

                let contentByteLen = b.readInt32();
                let contentBytes = b.readBytes(contentByteLen);

                let signatureBytes = b
                  .readBytes(Commands.SIGNATURE_LEN)
                  .toArrayBuffer();

                let id = KademliaId.byPublicKey(publicKeyBytes);

                let kadContent = new KadContent(
                  id,
                  timestamp,
                  publicKeyBytes,
                  contentBytes.toArrayBuffer(),
                  signatureBytes
                );

                let verified = kadContent.verify();

                console.log("verified: " + verified);

                if (verified) {
                  peer.score += 2;
                  //we can safely parse the content since it is signed!
                  //toDo: unencrypt

                  //WARNING: the content is currently unencrypted!!!

                  // console.log(JSON.parse(contentBytes.toString()));

                  let string = contentBytes.readIString().toString();

                  let obj = JSON.parse(string);

                  console.log(obj.users);

                  let sendDataToDHT = false;
                  let foundEntryFromUs = false;

                  let chan = service.getChannelById(obj.id);

                  console.log(obj.id);
                  console.log(obj);
                  console.log(service.channels);

                  chan.dht = obj;

                  for (let user of obj.users) {
                    console.log("user: " + user.id + " " + service.identity);

                    if (user.id == service.identity) {
                      chan.status = 1;
                      foundEntryFromUs = true;
                      console.log(
                        "we found our data, lets check it, generated: " +
                          Service.toHHMMSS(Date.now() - user.timestamp)
                      );

                      console.log(Date.now() - user.timestamp);

                      chan.info =
                        "last dht " +
                        Service.toHHMMSS(Date.now() - user.timestamp) +
                        " ago.";

                      // Global.downloadedText =
                      //   string +
                      //   " " +
                      //   Service.toHHMMSS(Date.now() - user.timestamp);

                      if (Date.now() - user.timestamp > 1000 * 60 * 1) {
                        sendDataToDHT = true;
                      }
                    }
                  }

                  if (!foundEntryFromUs) {
                    sendDataToDHT = true;
                  }

                  if (sendDataToDHT) {
                    service.sendMyDataToChannel(chan);
                  }
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

                console.log("verified: " + verified);

                //we can now store the update!
                if (verified && Global.isCordova) {
                  (async () => {
                    //lets check if this update is really newer than our current version
                    let ourTimestmap = await service
                      .getStorage()
                      .get("updateTime");

                    if (ourTimestmap >= timestamp.toNumber()) {
                      Global.downloadedText +=
                        "update is not newer than our version, aborting installation...";
                      return;
                    }

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

                    service
                      .getStorage()
                      .set("updateTime", timestamp.toNumber());

                    service.cordova.plugins.fileOpener2.open(
                      service.file.dataDirectory + "redPanda.apk",
                      "application/vnd.android.package-archive"
                    );

                    //end of async!
                  })();
                } else if (verified) {
                  //no cordova, so no android, lets just set the timestamp such that the button goes away for now
                  service.getStorage().set("updateTime", timestamp.toNumber());
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
  public identity: any;
  public endpoints: any;

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
    this.storage.get("identity").then(val => {
      if (val === undefined || val === null) {
        this.identity = Math.floor(Math.random() * 1000000);
        this.storage.set("identity", JSON.stringify(this.identity));
        return;
      }
      this.identity = JSON.parse(val);
      console.log("identity: " + this.identity);
    });
    this.storage.get("endpoints").then(val => {
      this.endpoints = JSON.parse(val);
    });

    this.storage.get("channels").then(val => {
      if (val === undefined) {
        return;
      }

      console.log(val);

      this.channels = JSON.parse(val);
    });

    this.storage.get("peers").then(val => {
      // console.log(JSON.parse(val));
      if (val != undefined) {
        //restore fields here
        for (let p of JSON.parse(val)) {
          let newPeer = new Peer(p.url);
          newPeer.setNodeId(p.nodeId);
          newPeer.score = p.score;
          this.peers.set(p.nodeId, newPeer);
        }
      }
      //start refreshing after we loaded the peers
      this.maintainEndpoints();
      this.maintainChannels();
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

  public maintainEndpoints() {
    //the Endpoints contains the outbound and inbound servers we are using

    // console.log("asdf; " + Array.from(this.peers.values()).length);

    //get best server:
    let peers = Array.from(this.peers.values());
    peers.sort((a, b) => {
      return b.score - a.score;
    });

    if (peers.length < 3) {
      return;
    }

    console.log("server for inbound messages: " + peers[0].nodeId);
    console.log("backup server: " + peers[1].nodeId);

    const keyPair = bitcoin.ECPair.makeRandom();

    let priv = bs58.encode(keyPair.privateKey);
    let pub = bs58.encode(keyPair.publicKey);
    let priv2 = bs58.encode(keyPair.privateKey);
    let pub2 = bs58.encode(keyPair.publicKey);

    this.endpoints = {
      inbound: { id: peers[0].nodeId, pub: pub, priv: priv },
      inboundSecondary: { id: peers[1].nodeId, pub: pub2, priv: priv2 }
    };

    this.storage.set("endpoints", JSON.stringify(this.endpoints));
    // console.log(this.endpoints);
  }

  public maintainChannels() {
    console.log("running maintain channels!!");
    if (this.channels == null) {
      //no channels added by now
      return;
    }

    if (this.endpoints == null || this.activeConnections < 3) {
      setTimeout(() => {
        this.maintainChannels();
      }, 300);
      console.log("run maintainChannels() in 300ms again!");
      return;
    }

    //rerun every x mins!
    setTimeout(() => {
      this.maintainChannels();
    }, 1000 * 60 * 2);

    let cnt = 0;

    for (let c of Array.from(this.channels)) {
      // this.channels.forEach(c => {
      // console.log("fmusidmgfusdf");

      setTimeout(() => {
        this.refreshChannel(c);
      }, 200 * cnt);

      // this.sendMyDataToChannel(c);
      cnt++;
    }
    // });

    // setTimeout(() => {
    //   this.maintainChannels();
    // }, 5000);
  }

  public getAConnectedSocket(): WebSocket {
    let peers = Array.from(this.peers.values());
    // peers.sort((a, b) => {
    //   return b.score - a.score;
    // });

    Utils.shuffleArray(peers);

    for (let peer of peers) {
      if (peer.connected == 1) {
        return peer.ws;
      }
    }
  }

  public getRandPeer(): Peer {
    let peers = Array.from(this.peers.values());
    // peers.sort((a, b) => {
    //   return b.score - a.score;
    // });

    Utils.shuffleArray(peers);

    for (let peer of peers) {
      if (peer.connected == 1) {
        return peer;
      }
    }
  }

  public sendMyDataToChannel(c) {
    console.log("chan: " + c.name);

    Global.downloadedText = "dht store chan info: " + c.name;

    // console.log(c.pubKey);
    if (Object.keys(c.pubKey).length === 0) {
      c.pubKey = ByteBuffer.wrap(bs58.decode(c.pubKeyBs58)).toArrayBuffer();
      c.privKey = ByteBuffer.wrap(bs58.decode(c.privKeyBs58)).toArrayBuffer();
    }

    if (c.sharedInfo === undefined) {
      //lets search for infos in the dht network!

      //lets create a dht entry from scratch!
      let content = {
        id: c.id,
        users: [
          // array with only one user in it!
          {
            id: this.identity,
            inboundId: this.endpoints.inbound.id,
            inboundPub: this.endpoints.inbound.pub,
            timestamp: Date.now()
          }
        ]
      };

      // console.log(content);

      let contentString = JSON.stringify(content);

      //todo: encrypt content!!!!

      let b = ByteBuffer.allocate();
      b.writeIString(contentString);
      b.flip();

      // let ws = this.getAConnectedSocket();
      let toSendPeer = this.getRandPeer();

      // console.log("a " + c.pubKey);
      // console.log(c.pubKey);
      // console.log(c);

      let id = KademliaId.byPublicKey(c.pubKey);

      let kc = new KadContent(
        id,
        Date.now(),
        c.pubKey,
        b.toArrayBuffer(),
        null
      );

      let key = bitcoin.ECPair.fromPrivateKey(Buffer.from(c.privKey));
      kc.signWith(key);

      console.log("verified: " + kc.verify());

      // ws.send(new ByteBuffer(1).writeByte(Commands.getAndroidApk).buffer);

      let o = new ByteBuffer(1024);

      o.writeByte(Commands.dhtStore);
      o.writeInt32(12345);
      o.append(kc.getId().getBytes());
      o.writeInt64(kc.getTimestamp());
      console.log(kc.getTimestamp());

      o.append(kc.getPublicKey());

      o.writeInt32(kc.getContent().byteLength);
      o.append(kc.getContent());
      o.append(kc.getSignature());

      o.flip();

      toSendPeer.ws.send(o.toArrayBuffer());

      // toSendPeer.score -= 1;
    }

    setTimeout(() => {
      this.refreshChannel(c);
    }, 10000);
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

    let peers = Array.from(this.peers.values());
    peers.sort((a, b) => {
      return b.score - a.score;
    });

    let a = "";
    for (let peer of peers) {
      a +=
        (!peer.connected ? '<font color="red">' : '<font color="green">') +
        peer.nodeId.substring(0, 10) +
        "</font>" +
        "      " +
        +peer.retries +
        "      " +
        +peer.score +
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
    //we can only save certain fields

    let peers = Array.from(this.peers.values());
    peers.sort((a, b) => {
      return b.score - a.score;
    });

    for (let p of peers) {
      let np = new Peer(p.url);
      np.setNodeId(p.nodeId);
      np.score = p.score;
      console.log("saved score: " + np.score);
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

    if (this.channels === null) {
      this.channels = [];
    }

    let privKey = ByteBuffer.wrap(keyPair.privateKey).toArrayBuffer();
    let pubKey = ByteBuffer.wrap(keyPair.publicKey).toArrayBuffer();

    let id = Math.floor(Math.random() * 5000000);

    let chan = {
      id: id,
      name: name,
      // privateKey: bs58.encode(keyPair.privateKey),
      // publicKey: bs58.encode(keyPair.publicKey)
      privKey: privKey,
      pubKey: pubKey,
      privKeyBs58: bs58.encode(Buffer.from(privKey)),
      pubKeyBs58: bs58.encode(Buffer.from(pubKey))
    };

    this.channels.push(chan);

    console.log(this.channels);

    this.saveChannels();

    this.refreshChannel(chan);
  }

  /**
   * saves the channels in the ionic storage
   */
  public saveChannels() {
    let chanCopy = JSON.parse(JSON.stringify(this.channels));

    for (let c of chanCopy) {
      c.dht = undefined;
      c.status = undefined;
    }

    this.storage.set("channels", JSON.stringify(chanCopy));
  }

  /**
   * We search to current dht entry for the channel,
   * the decision making is done in the answer from the peer
   * @param c channel
   */
  public refreshChannel(c) {
    console.log("chan: " + c.name);

    Global.downloadedText = "dht search chan: " + c.name;

    // console.log(c.pubKey);
    if (Object.keys(c.pubKey).length === 0) {
      c.pubKey = ByteBuffer.wrap(bs58.decode(c.pubKeyBs58)).toArrayBuffer();
      c.privKey = ByteBuffer.wrap(bs58.decode(c.privKeyBs58)).toArrayBuffer();
    }

    if (c.sharedInfo === undefined) {
      //lets search for infos in the dht network!

      //lets create our info!
      let content = {
        users: {
          id: this.identity,
          inboundId: this.endpoints.inbound.id,
          inboundPub: this.endpoints.inbound.pub,
          timestamp: Date.now()
        }
      };
      // console.log(content);

      let contentString = JSON.stringify(content);

      //todo: encrypt content!!!!

      let b = ByteBuffer.allocate();
      b.writeIString(contentString);
      b.flip();

      // let ws = this.getAConnectedSocket();
      let toSendPeer = this.getRandPeer();

      // console.log("a " + c.pubKey);
      // console.log(c.pubKey);
      // console.log(c);

      let id = KademliaId.byPublicKey(c.pubKey);

      let o = new ByteBuffer(1024);

      o.writeByte(Commands.dhtSearch);
      o.writeInt32(1234); //command id / ACK id
      o.append(id.getBytes());

      o.flip();

      toSendPeer.ws.send(o.toArrayBuffer());
      toSendPeer.score -= 1;

      c.status = 2;
    }

    setTimeout(() => {
      if (c.dht === undefined || c.status != 1) {
        this.sendMyDataToChannel(c);
      }
    }, 10000);
  }

  public static toHHMMSS(sec_num) {
    sec_num = Math.floor(sec_num / 1000);

    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - hours * 3600) / 60);
    let seconds = sec_num - hours * 3600 - minutes * 60;

    let hours2 = hours.toString();
    let minutes2 = minutes.toString();
    let seconds2 = seconds.toString();

    if (hours < 10) {
      hours2 = "0" + hours2;
    }
    if (minutes < 10) {
      minutes2 = "0" + minutes2;
    }
    if (seconds < 10) {
      seconds2 = "0" + seconds2;
    }
    return hours2 + ":" + minutes2 + ":" + seconds2;
  }

  getChannelById(id: number): any {
    for (let c of this.channels) {
      if (c.id == id) {
        return c;
      }
    }
    return null;
  }
}

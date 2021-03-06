import { File } from "@ionic-native/file";
import { ChatPage } from "./../chat/chat";
import { Component } from "@angular/core";
import { NavController, Platform } from "ionic-angular";
// import { Sockets } from "../../app/sockets";
import { AlertController } from "ionic-angular";
import { Storage } from "@ionic/storage";
// import { Socket } from "ng-socket-io";

import * as bitcoin from "bitcoinjs-lib";
import * as bs58 from "bs58";
import { AES256 } from "@ionic-native/aes-256";
import { AES } from "../../redPanda/crypto";
import { HttpClient } from "@angular/common/http";
import { sha256 } from "js-sha256";
import * as ByteBuffer from "bytebuffer";
import { Global } from "../../app/Global";
import { Service } from "../../app/service";

import { ec } from "elliptic";
// import * as Sentry from "sentry-cordova";

// Create and initialize EC context
// (better do it once and reuse it)
var EC = new ec("secp256k1");

declare const Buffer;
declare const cordova;

@Component({
  selector: "page-home",
  templateUrl: "home.html"
})
export class HomePage {
  Global: any = Global;

  nickname = "";
  encodeKey = "empty";
  infoText = "";
  downloaded = 0;
  // alertCtrl:AlertController;
  constructor(
    public navCtrl: NavController,
    private alertCtrl: AlertController,
    private storage: Storage,
    private aes256: AES256,
    private http: HttpClient,
    private file: File,
    private platform: Platform,
    public service: Service
  ) {
    Global.isCordova = this.platform.is("cordova");

    //Register observer for web browser reload
    window.addEventListener("beforeunload", () => {
      // service.saveChannels();
      service.savePeers();
    });

    // if (this.platform.is("cordova")) {
    //   Service.init2(this.platform, cordova);
    // } else {
    //   Service.init2(this.platform, undefined);
    // }

    var key = EC.genKeyPair();
    // Sign the message's hash (input must be an array, or a hex-string)
    var msgHash = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var signature = key.sign(msgHash);

    // Export DER encoded signature in Array
    var derSign = signature.toDER();

    // Verify signature
    console.log(key.verify(msgHash, derSign));

    key = EC.keyFromPublic(
      bs58.decode("evkUMf9Zr6LgCeJgxH2DYGT37GY8VaCHP3vhh3wRHGYS")
    );
    var pubPoint = key.getPublic();
    // console.log(pubPoint.encode("base"));

    storage.get("sentryOkay").then(val => {
      if (val == null) {
        this.presentSentryConfirm();
        return;
      }

      if (val == true) {
        //init sentry
        // Sentry.init({
        //   dsn: "https://a54410e81d8a4e1d8f8d83b3d7729b44@sentry.io/1400282"
        // });
        // console.log("sentry io init");
      }
    });

    // storage.get("channels").then(val => {
    //   if (val == undefined) {
    //     return;
    //   }

    //   service.channels = JSON.parse(val);
    // });

    // this.encodeKey = bs58.encode(
    //   crypto
    //     .createHash("sha256")
    //     .update("jeeees", "utf-8")
    //     .digest()
    // );

    // (async () => {
    //   console.log("getNickAndRank");
    //   this.encodeKey = await this.aes256.generateSecureKey(
    //     "random password 12345"
    //   );
    // })();

    // AES.encode();

    // let url = 'http://redpanda.im:59758/android.apk';
    // this.http.get(url)
    //   .subscribe(response => {
    //     console.log(response)
    //   }, xhr => {
    //     console.log(xhr);
    //   });
  }

  openChat(channel: any) {
    // require('https').globalAgent.options.rejectUnauthorized = false;

    // let socket = this.sockets.getAConnectedSocket();

    // console.log("get android apk");
    // socket.emit("getAndroid.apk", {}, (answer: any) => {
    //   //   console.log("peers: " + JSON.stringify(answer));
    //   console.log("androidapk got from node: " + answer.data);

    //   let arrayBuffer: ArrayBuffer = answer.data;

    //   this.downloaded += arrayBuffer.byteLength;

    //   this.infoText =
    //     "Downloaded: " + (this.downloaded / 1024 / 1024).toFixed(1) + " MB";

    //   //   console.log("peers: " + typeof { asd: 5 });
    // });

    // this.socket.connect();
    // socket.emit("set-nickname", {
    //   userName: this.nickname,
    //   message: "teeest"
    // });
    // this.navCtrl.push("ChattingPage", { nickname: this.nickname });

    this.navCtrl.push(ChatPage, {
      toUserId: "210000198410281948",
      toUserName: channel.name
    });
  }

  createNewChannel() {
    this.doNamePrompt();
    // throw new Error('I am a bug... 🐛');;
  }

  channelView() {}

  progress() {
    let value = (this.service.activeConnections / 5) * 100;
    value = Math.min(100, value);
    return value + "%";
  }

  doNamePrompt() {
    let alert = this.alertCtrl.create({
      title: "Create New Channel",
      message: "Enter a name for a new channel.",
      inputs: [
        {
          name: "name",
          placeholder: "Name"
        }
      ],
      buttons: [
        {
          text: "Cancel",
          handler: () => {
            console.log("Cancel clicked");
          }
        },
        {
          text: "Create",
          handler: data => {
            let name = data.name.trim(" ");

            console.log("Saved clicked" + name);
            // const keyPair = bitcoin.ECPair.makeRandom();
            // const { address } = bitcoin.payments.p2pkh({
            //   pubkey: keyPair.publicKey
            // });
            // console.log("pubkey: " + address);
            // console.log("pubkey2: " + bs58.encode(keyPair.publicKey));
            // console.log("priv: " + bs58.encode(keyPair.privateKey));

            // var decoded = bs58.decode(bs58.encode(keyPair.privateKey));

            // console.log(decoded);

            // console.log(bs58.encode(decoded));

            // this.service.channels.push({
            //   name: name,
            //   privateKey: bs58.encode(keyPair.privateKey),
            //   publicKey: bs58.encode(keyPair.publicKey)
            // });
            // this.storage.set("channels", JSON.stringify(Global.channels));
            this.service.createNewChannel(name);
          }
        }
      ]
    });

    alert.present();
  }

  savePeers() {
    this.service.savePeers();
  }

  saveChans() {
    this.service.saveChannels();
  }

  testButton() {
    this.service.downloadUpdate();
    //     let ws = Service.getAConnectedSocket();

    //     console.log("get android apk");

    // ws.send

    //     ws.emit("getAndroid.apk", {}, (answer: any) => {
    //       //   console.log("peers: " + JSON.stringify(answer));
    //       console.log("androidapk got from node: " + answer.data);
    //       console.log(
    //         "androidapk signature from node: " + Buffer.from(answer.signature)
    //       );
    //       console.log("signature len: " + answer.signature.byteLength);

    //       let arrayBuffer: ArrayBuffer = answer.data;

    //       this.downloaded = arrayBuffer.byteLength;

    //       this.infoText =
    //         "Update size: " + (this.downloaded / 1024 / 1024).toFixed(1) + " MB";

    //       //we have to check the signature of the apk!

    //       // bitcoin.ECPair
    //       let updateKey = bitcoin.ECPair.fromPublicKey(
    //         bs58.decode("evkUMf9Zr6LgCeJgxH2DYGT37GY8VaCHP3vhh3wRHGYS")
    //       );

    //       console.log("timestamp: " + answer.timestamp);

    //       let hashing = sha256.create();

    //       let b = new ByteBuffer();
    //       b.writeInt64(answer.timestamp);
    //       b.append(arrayBuffer);

    //       b.flip();

    //       // hashing.update(answer.timestamp);
    //       hashing.update(b.toArrayBuffer());

    //       let verified = updateKey.verify(
    //         Buffer.from(hashing.array()),
    //         Buffer.from(answer.signature)
    //       );

    //       this.infoText =
    //         "Update size: " +
    //         (this.downloaded / 1024 / 1024).toFixed(1) +
    //         " MB, verified: " +
    //         verified;

    //         // this.storage.set("updateTime", answer.timestamp);

    //       //we can now store the update!
    //       if (verified && this.platform.is("cordova")) {
    //         (async () => {
    //           this.infoText += " installing...";
    //           try {
    //             let exists = await this.file.checkFile(
    //               this.file.dataDirectory,
    //               "redPanda.apk"
    //             );

    //             if (exists) {
    //               await this.file.removeFile(
    //                 this.file.dataDirectory,
    //                 "redPanda.apk"
    //               );
    //             }
    //           } catch (e) {
    //             //file does not exists?
    //           }

    //           await this.file.writeFile(
    //             this.file.dataDirectory,
    //             "redPanda.apk",
    //             arrayBuffer
    //           );

    //           // let files = await this.file.listDir(this.file.dataDirectory, "");
    //           // this.infoText = this.file.dataDirectory + "redPanda.apk";

    //           cordova.plugins.fileOpener2.open(
    //             this.file.dataDirectory + "redPanda.apk",
    //             "application/vnd.android.package-archive"
    //           );

    //           this.storage.set("updateTime", answer.timestamp);

    //           //end of async!
    //         })();
    //       }

    //       //   console.log("peers: " + typeof { asd: 5 });
    //     });
  }

  async presentSentryConfirm() {
    let alert = this.alertCtrl.create({
      title: "Allow to send crash reports?",
      message:
        "If you agree, your client will send errors/crashes to us via sentry.",
      inputs: [],
      buttons: [
        {
          text: "Cancel",
          handler: () => {
            console.log("Cancel clicked");
            this.storage.set("sentryOkay", false);
          }
        },
        {
          text: "Create",
          handler: data => {
            this.storage.set("sentryOkay", true);
          }
        }
      ]
    });

    alert.present();
  }

  active(channel) {
    this.service.refreshChannel(channel);

    // let alert = this.alertCtrl.create({
    //   title: "Settings: ",
    //   message: "Here you can change some settings for " + channel.name + ".",
    //   inputs: [
    //     {
    //       name: "name",
    //       placeholder: channel.name
    //     }
    //   ],
    //   buttons: [
    //     {
    //       text: "Cancel",
    //       role: "cancel",
    //       handler: () => {
    //         console.log("Cancel clicked");

    //         // this.service.refreshChannel(channel);
    //       }
    //     },
    //     {
    //       text: "Confirm",
    //       handler: data => {
    //         let name = data.name.trim(" ");
    //         channel.name = name;
    //         this.service.saveChannels();
    //       }
    //     }
    //   ]
    // });

    // alert.present();
  }

  released() {}

  pressed() {}
}

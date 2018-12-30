import { ChatPage } from "./../chat/chat";
import { Component } from "@angular/core";
import { NavController } from "ionic-angular";
import { Sockets } from "../../app/sockets";
import { AlertController } from "ionic-angular";
import { Storage } from "@ionic/storage";
// import { Socket } from "ng-socket-io";

import * as bitcoin from "bitcoinjs-lib";
import * as bs58 from "bs58";
import { AES256 } from "@ionic-native/aes-256";
import { AES } from "../../redPanda/crypto";

declare const Buffer;

@Component({
  selector: "page-home",
  templateUrl: "home.html"
})
export class HomePage {
  channels = [];
  sockets: Sockets;
  nickname = "";
  encodeKey = "empty";
  // alertCtrl:AlertController;
  constructor(
    public navCtrl: NavController,
    public mSockets: Sockets,
    private alertCtrl: AlertController,
    private storage: Storage,
    private aes256: AES256
  ) {
    this.sockets = mSockets;

    storage.get("channels").then(val => {
      if (val == undefined) {
        return;
      }

      this.channels = JSON.parse(val);
    });

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

    AES.encode();
  }

  openChat(channel: any) {
    // require('https').globalAgent.options.rejectUnauthorized = false;

    // let socket = this.sockets.getAConnectedSocket();

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
  }

  channelView() {}

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
            console.log("Saved clicked" + data.name);
            const keyPair = bitcoin.ECPair.makeRandom();
            const { address } = bitcoin.payments.p2pkh({
              pubkey: keyPair.publicKey
            });
            console.log("pubkey: " + address);
            console.log("pubkey2: " + bs58.encode(keyPair.publicKey));
            console.log("priv: " + bs58.encode(keyPair.privateKey));

            var decoded = bs58.decode(bs58.encode(keyPair.privateKey));

            console.log(decoded);

            console.log(bs58.encode(decoded));

            this.channels.push({
              name: data.name,
              privateKey: bs58.encode(keyPair.privateKey),
              publicKey: bs58.encode(keyPair.publicKey)
            });
            this.storage.set("channels", JSON.stringify(this.channels));
          }
        }
      ]
    });

    alert.present();
  }
}

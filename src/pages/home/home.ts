import { Component } from "@angular/core";
import { NavController } from "ionic-angular";
import { Sockets } from "../../app/sockets";
import { AlertController } from "ionic-angular";
import { Storage } from "@ionic/storage";
// import { Socket } from "ng-socket-io";

import * as bitcoin from "bitcoinjs-lib";
import * as bs58 from "bs58";

@Component({
  selector: "page-home",
  templateUrl: "home.html"
})
export class HomePage {
  channels = [];
  sockets: Sockets;
  nickname = "";
  // alertCtrl:AlertController;
  constructor(
    public navCtrl: NavController,
    public mSockets: Sockets,
    private alertCtrl: AlertController,
    private storage: Storage
  ) {
    this.sockets = mSockets;

    storage.get("channels").then(val => {
      if (val == undefined) {
        return;
      }

      this.channels = JSON.parse(val);
    });
  }

  joinChatRoom() {
    // require('https').globalAgent.options.rejectUnauthorized = false;

    let socket = this.sockets.getAConnectedSocket();

    // this.socket.connect();
    socket.emit("set-nickname", {
      userName: this.nickname,
      message: "teeest"
    });
    // this.navCtrl.push("ChattingPage", { nickname: this.nickname });
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

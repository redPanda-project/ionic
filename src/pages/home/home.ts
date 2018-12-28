import { Component } from "@angular/core";
import { NavController } from "ionic-angular";
import { Sockets } from "../../app/sockets";
// import { Socket } from "ng-socket-io";

@Component({
  selector: "page-home",
  templateUrl: "home.html"
})
export class HomePage {
  sockets: Sockets;
  nickname = "";
  constructor(public navCtrl: NavController, public mSockets: Sockets) {
    this.sockets = mSockets;
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
}

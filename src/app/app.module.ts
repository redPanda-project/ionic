import { BrowserModule } from "@angular/platform-browser";
import { ErrorHandler, NgModule, Injectable } from "@angular/core";
import { IonicApp, IonicErrorHandler, IonicModule } from "ionic-angular";

import { MyApp } from "./app.component";
import { HomePage } from "../pages/home/home";
import { ListPage } from "../pages/list/list";

import { StatusBar } from "@ionic-native/status-bar";
import { SplashScreen } from "@ionic-native/splash-screen";

import { SocketIoModule } from "ng-socket-io";
import { Sockets } from './sockets';

// import { https } from "@angular/common/https";
// import * as https from 'https';
// https.globalAgent.options.rejectUnauthorized = false;

// const config: SocketIoConfig = {
//   url: "http://localhost:10445",
//   options: {
//     transports: ["websocket"],
//     rejectUnauthorized: false,
//     secure: true
//     //pingInterval has to be set by server
//     // reconnectionDelay: 500,
//     // reconnectionDelayMax: 3000,
//     // reconnectionAttempts: Infinity,
//     // timeout: 5000
//   }
// };

// @Injectable()
// export class Sockets {
//   constructor() {
//     setInterval(() => {
//       this.refresh();
//     }, 1000);
//   }
//   refresh() {
//     console.log("It works here");
//   }
//   greet() {
//     return "Hello, ";
//   }
// }

@NgModule({
  declarations: [MyApp, HomePage, ListPage],
  imports: [BrowserModule, IonicModule.forRoot(MyApp), SocketIoModule],
  bootstrap: [IonicApp],
  entryComponents: [MyApp, HomePage, ListPage],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    Sockets
  ]
})
export class AppModule {}

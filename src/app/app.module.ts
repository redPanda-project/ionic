import { BrowserModule } from "@angular/platform-browser";
import { ErrorHandler, NgModule, Injectable } from "@angular/core";
import { IonicApp, IonicErrorHandler, IonicModule } from "ionic-angular";

import { MyApp } from "./app.component";
import { HomePage } from "../pages/home/home";
import { ListPage } from "../pages/list/list";
import { ChatPage } from "../pages/chat/chat";

import { StatusBar } from "@ionic-native/status-bar";
import { SplashScreen } from "@ionic-native/splash-screen";

// import { SocketIoModule } from "ng-socket-io";
// import { Sockets } from "./sockets";
import { IonicStorageModule } from "@ionic/storage";

import { EmojiProvider } from "../providers/emoji";
import { ChatService } from "../providers/chat-service";
import { EmojiPickerComponent } from "../components/emoji-picker/emoji-picker";
import { RelativeTime } from "../pipes/relative-time";
import { HttpClientModule } from "@angular/common/http";

import { AES256 } from "@ionic-native/aes-256";
import { File } from "@ionic-native/file";

// import { https } from "@angular/common/https";
// import * as https from 'https';
import { Service } from './service';
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
  declarations: [
    MyApp,
    HomePage,
    ListPage,
    ChatPage,
    RelativeTime,
    EmojiPickerComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    // SocketIoModule,
    IonicStorageModule.forRoot(),
    HttpClientModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [MyApp, HomePage, ListPage, ChatPage, EmojiPickerComponent],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    EmojiProvider,
    ChatService,
    AES256,
    File,
    Service
  ]
})
export class AppModule {}

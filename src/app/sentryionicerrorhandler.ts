import { IonicErrorHandler } from "ionic-angular";
import Raven from "raven-js";
import { ToastController } from 'ionic-angular';


Raven.config(
  "https://a54410e81d8a4e1d8f8d83b3d7729b44@sentry.io/1400282"
).install();

export class SentryErrorHandler extends IonicErrorHandler {
  handleError(error) {
    super.handleError(error); // todo remove for prod

    // Global.error = true;
    

    try {
      Raven.captureException(error.originalError || error);
    } catch (e) {
      console.error(e);
    }
  }
}
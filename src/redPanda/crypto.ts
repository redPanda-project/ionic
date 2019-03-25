import * as aes from "aes-cross";
import * as ByteBuffer from "bytebuffer";

declare const Buffer;

export class AES {
  static encode(bytesToEnc: ArrayBuffer, key: ArrayBuffer, iv: ArrayBuffer): Buffer {
    aes.setKeySize(256);
    return aes.encBytes(Buffer.from(bytesToEnc), Buffer.from(key), Buffer.from(iv));
  }

  static decode(bytesToDec: ArrayBuffer, key: ArrayBuffer, iv: ArrayBuffer): Buffer {
    aes.setKeySize(256);
    return aes.decBytes(Buffer.from(bytesToDec), Buffer.from(key), Buffer.from(iv));
  }

  static encodeBuffer(bytesToEnc: Buffer, key: Buffer, iv: Buffer): Buffer {
    return aes.encBytes(bytesToEnc, key, iv);
  }

  static decodeBuffer(bytesToDec: Buffer, key: Buffer, iv: Buffer): Buffer {
    return aes.decBytes(bytesToDec, key, iv);
  }

  static tmp() {
    aes.setKeySize(256);

    var key = new Buffer([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      1,
      2,
      3,
      4,
      5,
      6,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      1,
      2,
      3,
      4,
      5,
      6
    ]);

    // for buffer
    var testBuff = new Buffer([23, 42, 55]);
    /**
     * encBytes/decBytes: buffer/bytes encription
     * @param  {Buffer} buff
     * @param  {Buffer} key  the length must be 16 or 32
     * @param  {Buffer} [newIv]   optional,default is [0,0...0]
     * @return {Buffer}
     */
    var encBuff = aes.encBytes(testBuff, key);
    console.dir(encBuff);
    var decBuff = aes.decBytes(encBuff, key);
    console.dir(decBuff);

    var bb = new ByteBuffer().writeIString("Hello world!").flip();
    console.log(bb.readIString() + " from bytebuffer.js");
  }
}

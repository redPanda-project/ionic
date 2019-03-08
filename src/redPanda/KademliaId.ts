import { sha256 } from 'js-sha256';
import * as ByteBuffer from "bytebuffer";
import { Commands } from '../app/commands';


export class KademliaId {
  // Commands.ID_LENGTH is the byte len of the key!
  private keyBytes: ArrayBuffer;

  constructor(bytes: ArrayBuffer) {
    this.keyBytes = bytes;
  }

  static byPublicKey(pubkey: ArrayBuffer): KademliaId {

    
    let hashing = sha256.create();

    let hashBuffer = new ByteBuffer();
    hashBuffer.writeInt64(123456);
    hashBuffer.append(pubkey);

    hashBuffer.flip();

    hashing.update(hashBuffer.toArrayBuffer());

    let hash = ByteBuffer.wrap(hashing.arrayBuffer());

    let out = hash.readBytes(Commands.ID_LENGTH).toArrayBuffer();
    

    return new KademliaId(out);
  }

  public getBytes() : ArrayBuffer {
    return this.keyBytes;
  }
}
